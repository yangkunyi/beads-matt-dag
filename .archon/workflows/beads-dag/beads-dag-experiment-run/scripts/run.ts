/**
 * One experiment ticket: claimed by assignment in the same act as its run's registration, then run,
 * recorded, checked, and closed.
 *
 * The first half is the gate the domain spec fixes:
 *
 * 1. the ticket is claimed by **assignment** — `bd update <id> -s in_progress --assignee <who>`, one
 *    write, with `<who>` the run's own identity (`beads-dag-experiment/<run-id>`, `ticket.ts`) — so a
 *    session that reads the ticket sees a run and not a person, and two sessions can never run the same
 *    experiment;
 * 2. the run's **name is reserved before anything executes** — the Target's own
 *    `tools/experiments/register.ts` queues it (`dvc exp run --queue -n <name>` reserves the name without
 *    running anything) and writes the registration into the run's artifacts — so an experiment cannot
 *    exist without a name its record knows.
 *
 * The two are one act and not two: a registration that fails gives the claim back (the status and the
 * name in one update) and the reason goes on the ticket as an ordinary failed attempt, so nothing is left
 * claimed and the run says why. A ticket this run has worked is recorded in `attempted-ids.json` even when
 * the registration failed, because the retry channel is the next run, not this one.
 *
 * Then the run turn, under the `experiment` role, with the store read-only. The experimenter writes the
 * record at `.scratch/<effort>/results/<NN>-<slug>.md` and writes no stage and no experiment code. After
 * the turn a **completeness check** runs in this node, not in a model: the record must exist at that path,
 * hold an attempts-table row, and hold the four labelled closing lines (`measured:`, `reference:`,
 * `covered:`, `reading:`). Missing anything leaves the ticket open with
 * `attempt N failed: record incomplete — <what is missing>` and nothing else happens. Only a complete
 * record closes the ticket: the close, the `reading:none` label and the comment are one act, and the
 * record (plus `dvc.lock` when the collection wrote it) is committed as one path-scoped commit under the
 * Main lock.
 *
 * The run's *name* is the ticket's own: `<NN>-<slug>` (`ticket.ts`), the record's basename.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { defaultAgent, type AgentRunner } from "../../scripts/agent.ts";
import { addAttempted } from "../../scripts/attempted.ts";
import { loadConfig, type PackConfig } from "../../scripts/config.ts";
import { commitDocuments, documentSubject } from "../../scripts/doc-commit.ts";
import { revParse } from "../../scripts/git.ts";
import { bodyPath, issueNames } from "../../scripts/naming.ts";
import { runNode } from "../../scripts/node-entry.ts";
import { CLOSED, FAILED, nodeLine, REGISTERED } from "../../scripts/node-outcomes.ts";
import { roleAgent } from "../../scripts/roles.ts";
import {
  claimByAssignment,
  closeIssueWithLabel,
  commentIssue,
  issueByHandle,
  preflightStore,
  recordFailedAttempt,
} from "../../scripts/store.ts";
import {
  experimentRecordRel,
  inspectRecord,
  READING_NONE_LABEL,
  recordedLine,
} from "../../beads-dag-experiment/scripts/record.ts";
import { REGISTER_TOOL_REL } from "../../beads-dag-experiment/scripts/run-tool.ts";
import { runIdentity, runName } from "../../beads-dag-experiment/scripts/ticket.ts";

/** One run in the registration: the name the queue reserved, and the parameters it resolved. */
type RegisteredRun = { name: string; params: Record<string, unknown> };

/** The registration the Target's `register` verb printed, as this node reads it back. */
type Registration = {
  name: string;
  code: string;
  runs: RegisteredRun[];
  registration: string;
};

export type RunOpts = {
  artifactsDir: string;
  /** The Target's config. Unset, the Target's own file is read. */
  config?: PackConfig;
  /** The runner this turn spends. A run takes the pack's own; a test hands in a stub. */
  runAgent?: AgentRunner;
};

/**
 * The Target's own `register` verb, run as a child: it resolves `dvc` itself (`DVC_BIN` then PATH, the
 * same order `open` checked), queues the run, and writes the registration under ARTIFACTS_DIR. Its answer
 * is one JSON line, and this node trusts nothing else: no line, no registration file, or a non-zero exit
 * is a refusal, and the ticket's claim goes back.
 */
function registerRun(target: string, artifactsDir: string, name: string): Registration {
  const tool = join(target, REGISTER_TOOL_REL);
  const result = spawnSync(process.execPath, [tool, "--name", name, "--repo", target, "--artifacts", artifactsDir], {
    cwd: target,
    encoding: "utf8",
    env: process.env,
  });
  if (result.error) throw new Error(`cannot run ${tool}: ${result.error.message}`);
  if (result.status !== 0) {
    const said = `${result.stderr ?? ""}${result.stdout ?? ""}`.trim();
    throw new Error(`reserving the run name ${name} failed (exit ${result.status})${said ? `: ${said}` : ""}`);
  }
  const line = (result.stdout ?? "").trim().split("\n")[0] ?? "";
  if (!line) throw new Error(`reserving the run name ${name} printed nothing: the run's identity was not reserved`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    throw new Error(`reserving the run name ${name} did not print one JSON line: ${line.slice(0, 200)}`);
  }
  const registration = parsed as Partial<Registration>;
  if (typeof registration.name !== "string" || !Array.isArray(registration.runs)) {
    throw new Error(`reserving the run name ${name} answered something that is not a registration: ${line.slice(0, 200)}`);
  }
  if (typeof registration.registration !== "string" || !existsSync(registration.registration)) {
    throw new Error(
      `reserving the run name ${name} wrote no registration in the run's artifacts ` +
        `(${String(registration.registration)}): a run the record cannot name is not registered`,
    );
  }
  return registration as Registration;
}

/**
 * Claim the ticket and reserve the run's name. `registered` means the ticket is running and carries the
 * run's identity, and the registration is in the run's artifacts. `failed` means the registration could
 * not be made: the ticket is back to `open` with the reason as an ordinary failed attempt and no assignee.
 */
export async function claimAndRegister(target: string, issueHandle: string, opts: RunOpts): Promise<string> {
  const config = opts.config ?? loadConfig(target).config;
  const store = preflightStore(target, config);
  // The ticket itself, by the handle the fan-out named it with: the slug is half of the run's name and the
  // record's path, and the store is the only place it is. A ticket whose metadata cannot name a run fails
  // here, before a claim, rather than starting a run nobody can find afterwards.
  const issue = issueByHandle(store, target, issueHandle);
  const name = runName(issue);
  const who = runIdentity(opts.artifactsDir);

  // Claim = assignment. From here the ticket names the run, and one transaction carries both facts.
  claimByAssignment(store, target, issue.id, who);
  // This run has now worked the ticket. Recorded before the registration so a failure below — which puts
  // the ticket back on the store's frontier — is never offered to this same run again.
  addAttempted(opts.artifactsDir, [issue.id]);

  try {
    const registration = registerRun(target, opts.artifactsDir, name);
    console.error(`${issueHandle}: registered ${registration.name} (${registration.registration})`);
    return REGISTERED;
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    // The claim and the registration are one act: a registration that failed leaves nothing claimed.
    recordFailedAttempt(store, target, issue.id, reason, { giveBackTheClaim: true });
    console.error(`${issueHandle}: ${reason}`);
    return FAILED;
  }
}

/**
 * One experiment ticket, start to finish: claim and register, the run turn, the completeness check, the
 * close. Returns `closed` when the record is complete and the unread marker is on the ticket, `failed`
 * when the attempt did not land (the reason is on the ticket and on stderr).
 */
export async function runExperiment(target: string, issueHandle: string, opts: RunOpts): Promise<string> {
  const registered = await claimAndRegister(target, issueHandle, opts);
  if (registered !== REGISTERED) return registered;

  const config = opts.config ?? loadConfig(target).config;
  const store = preflightStore(target, config);
  const issue = issueByHandle(store, target, issueHandle);
  const names = issueNames(issue);
  const recordRel = experimentRecordRel(names);
  const runAgent = opts.runAgent ?? defaultAgent;

  const turn = await runAgent(
    roleAgent({
      role: "experiment",
      args: {
        handle: names.handle,
        bodyPath: bodyPath(target, names),
        recordRel,
      },
      // The turn runs in the Target, not in a worktree: an experiment writes no branch of its own, and
      // its whole product is the record under `.scratch/`.
      cwd: target,
      artifactsDir: opts.artifactsDir,
      config,
    }),
  );
  console.error(`${names.handle}: experiment session ${turn.sessionFile}`);

  /**
   * The record is not complete. The reason is recorded on the ticket - `attempt N failed: record
   * incomplete — <what is missing>` - and the claim goes back, so the next run retries it knowingly.
   * Nothing is committed and the unread marker is not stamped.
   */
  const incomplete = (missing: string): string => {
    const reason = `record incomplete — ${missing}`;
    recordFailedAttempt(store, target, issue.id, reason, { giveBackTheClaim: true });
    console.error(`${names.handle}: ${reason}`);
    return FAILED;
  };

  const missing = inspectRecord(target, recordRel);
  if (missing.length > 0) return incomplete(missing.join(", "));

  let commit: string;
  try {
    const result = await commitDocuments(target, {
      subject: documentSubject("record", names.handle, names.slug),
      paths: [recordRel, "dvc.lock"],
    });
    // Nothing extra to commit is not a failure: a re-run whose bytes are exactly the ones HEAD holds has
    // already landed, and the commit that carries the record is the one HEAD names.
    commit = result.commit ?? revParse(target);
  } catch (e) {
    const reason = `the record could not be committed: ${e instanceof Error ? e.message : String(e)}`;
    recordFailedAttempt(store, target, issue.id, reason, { giveBackTheClaim: true });
    console.error(`${names.handle}: ${reason}`);
    return FAILED;
  }

  commentIssue(store, target, issue.id, recordedLine(recordRel, commit));
  // One store command, and it is this node's last act for the ticket: the close and the unread marker
  // land together. The record's `reading:` line is already in the committed document; the label is the
  // same fact in the store.
  closeIssueWithLabel(store, target, issue.id, READING_NONE_LABEL);
  console.error(`${names.handle}: record closed (${recordRel} at ${commit})`);
  return CLOSED;
}

if (import.meta.main) {
  await runNode({
    issue: true,
    artifacts: true,
    run: async ({ target, issueHandle, artifactsDir, config }) =>
      nodeLine(await runExperiment(target, issueHandle, { artifactsDir, config })),
  });
}
