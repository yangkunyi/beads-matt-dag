/**
 * The pre-merge gate: one command, on the tree that would be merged, before it is merged.
 *
 * Nothing checked the work before it landed. `settle.ts` merges the issue's branch into Main and
 * `closed` therefore implies "a merge commit exists" - but not that anything ran. A worker that misread
 * the issue, or broke a file it was never asked to touch, merged anyway, and the drain-end review reads
 * the merged range **after** the fact: it is a reader, not a gate, and its findings cannot unmerge
 * anything. This module is the gate.
 *
 * **One command, the Target's own.** `verify` in the Target's config is a shell command string, run as
 * `sh -c <command>` with cwd set to the issue's worktree. Empty means the Target has not configured a
 * gate: the executor spawns nothing and records nothing. This is the same convention Gas Town uses for
 * its rig test command.
 *
 * **Trust boundary: the Target's config, never the issue body.** The command comes from the config file
 * like every other key in `config.ts`. It must never be taken from an issue's body, a comment, or any
 * other byte a worker can write: what runs before a merge is the Target's decision, not the worker's.
 *
 * **Not an agent, not a role, not a record.** There is no session, no prompt and no model here, and no
 * store call and no git write either: a green gate is implied by the merge path that follows it, and a
 * red one is an ordinary failed attempt - the same comment plus reopen the git-contract failure uses
 * (ADR-0005, no second record).
 *
 * **The residual race, stated and not hidden.** The merge re-integrates Main inside the Main lock
 * (`settle.ts`), so with `concurrency > 1` Main can move between the gate and the merge, and a clean
 * re-merge then produces a tree this gate did not test. That window is accepted deliberately: gating
 * inside the lock would serialize every merge for the gate's whole duration and undo the reason
 * concurrency exists. The executor's second gate, after the conflict turn, is the mitigation - any
 * divergence that conflicts is re-tested after resolution - and a post-merge check on Main is not part
 * of this module.
 */
import { spawn } from "node:child_process";
import { closeSync, openSync, writeSync } from "node:fs";

/**
 * How much of the gate's combined output is kept as the tail. The tail is what the failure comment on
 * the issue carries, so it is bounded hard: a gate that prints a hundred thousand lines must not put
 * them in a comment. The full output, when a log file is given, is not bounded - it is on disk.
 */
export const VERIFY_TAIL_CHARS = 2000;

/** What one gate run says about itself: green or red, the tail of its output, and whether it timed out. */
export type VerifyResult = {
  /** True only for exit status 0. A signal, a spawn failure and a timeout are all red. */
  ok: boolean;
  /** The bounded tail of the combined stdout+stderr, trimmed. */
  tail: string;
  /** True when the wall clock expired and the process group was killed. */
  timedOut: boolean;
};

/**
 * Run the Target's gate in one worktree and report what happened.
 *
 * `sh -c <command>`, cwd = the worktree, stdout and stderr combined into one stream. The command's own
 * exit status is the verdict: 0 is green, anything else (a status, a signal, a missing `sh`) is red.
 * `timeoutMs` bounds the run; on expiry the whole process group is killed - `detached` makes the child
 * a group leader, so a shell's children die with it - and the result says `timedOut`. The process is
 * never left behind, and neither is a pipe held open by a grandchild: the run settles on the child's
 * `close`, with a short fallback after a kill.
 *
 * `logFile`, when given, receives the full combined output - streamed as it arrives, not buffered - so
 * the caller can leave the whole thing in the run's artifacts while the returned `tail` stays small.
 * This module writes that file and nothing else: no store call, no git write, no agent.
 */
export function runVerify(
  worktree: string,
  command: string,
  timeoutMs: number,
  logFile?: string,
): Promise<VerifyResult> {
  return new Promise((resolve) => {
    let tail = "";
    let timedOut = false;
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const log = logFile === undefined ? undefined : openSync(logFile, "w");

    const child = spawn("sh", ["-c", command], {
      cwd: worktree,
      // A group of its own, so the expiry kill reaches the shell's children too - a gate that started a
      // test runner is killed with the runner, not after it.
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    const finish = (ok: boolean, reason?: string): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (log !== undefined) closeSync(log);
      const text = reason === undefined ? tail : `${tail}${tail === "" ? "" : "\n"}${reason}`;
      resolve({ ok, tail: text.trim().slice(-VERIFY_TAIL_CHARS), timedOut });
    };

    const killGroup = (): void => {
      if (child.pid === undefined) return;
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    };

    timer = setTimeout(() => {
      timedOut = true;
      killGroup();
      // A killed child normally closes promptly; a grandchild that survived the group kill and holds the
      // pipe must not hold the node either, so the run settles anyway and says it timed out.
      setTimeout(() => finish(false), 2000);
    }, timeoutMs);
    timer.unref();

    const collect = (chunk: Buffer): void => {
      tail = (tail + chunk.toString("utf8")).slice(-VERIFY_TAIL_CHARS);
      if (log !== undefined) writeSync(log, chunk);
    };
    child.stdout?.on("data", collect);
    child.stderr?.on("data", collect);

    child.on("error", (e) => finish(false, e.message));
    child.on("close", (code, signal) => {
      if (timedOut) return finish(false);
      if (code === 0) return finish(true);
      finish(false, signal ? `killed by ${signal}` : undefined);
    });
  });
}
