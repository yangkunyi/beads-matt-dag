/**
 * One experiment ticket: claimed by assignment in the same act as its run's registration.
 *
 * This is the first half of the experiment executor, and the gate the domain spec fixes:
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
 * The run's *name* is the ticket's own: `<NN>-<slug>` (`ticket.ts`), the record's basename at
 * `.scratch/<effort>/results/<NN>-<slug>.md`. The ticket's plan — the points a sweep is queued with, the
 * ignored data paths a queued run must see — is the run turn's own argument, read from the ticket's body
 * by the turn the record's ticket adds; this node reserves the name the plan will be run under.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { addAttempted } from "../../beads-dag-drain/scripts/attempted.ts";
import { loadConfig, type PackConfig } from "../../beads-dag-drain/scripts/config.ts";
import { runNode } from "../../beads-dag-drain/scripts/node-entry.ts";
import { FAILED, nodeLine, REGISTERED } from "../../beads-dag-drain/scripts/node-outcomes.ts";
import {
  claimByAssignment,
  issueByHandle,
  preflightStore,
  recordFailedAttempt,
} from "../../beads-dag-drain/scripts/store.ts";
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
 * The run node's whole job: claim the ticket, reserve the run's name, and report which happened.
 *
 * `registered` means the ticket is running and carries the run's identity in the assignee field, and the
 * registration is in the run's artifacts. `failed` means the registration could not be made: the ticket
 * is back to `open` with the reason as an ordinary failed attempt and no assignee, this run keeps it out
 * of its own next cycle, and the reason is on stderr as well.
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

if (import.meta.main) {
  await runNode({
    issue: true,
    artifacts: true,
    run: async ({ target, issueHandle, artifactsDir, config }) =>
      nodeLine(await claimAndRegister(target, issueHandle, { artifactsDir, config })),
  });
}
