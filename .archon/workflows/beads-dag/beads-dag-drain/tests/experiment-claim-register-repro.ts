#!/usr/bin/env bun
/**
 * Repro: an experiment ticket claimed by assignment in the same act as its run's registration.
 *
 * The two facts are one act. The ticket's status and its assignee land in one store write — the assignee
 * is the run's own identity (`beads-dag-experiment/<run-id>`), so a session that reads the ticket sees a
 * run and not a person — and before anything executes, the Target's own `register` verb queues the run
 * under the ticket's name, which reserves that name without running anything and writes the registration
 * into the run's artifacts. A registration that fails gives the claim back and puts the reason on the
 * ticket as an ordinary failed attempt, so nothing is left claimed and the run says why.
 *
 * The cases drive the real run node against a Target carrying the real tool directory, with a stub `dvc`
 * standing in for a machine that has none, and read what an observer can see: the store's own answers, the
 * registration under the run's artifacts, the stub's record of what it was asked, and the node's token.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  envWithRunTool,
  envWithout,
  expect,
  expectEqual,
  experimentRun,
  fakePiSdk,
  gitC,
  installExperimentTools,
  publishExperiment,
  runScript,
  storeComments,
  storeIssue,
  withTarget,
  writeStoreConfig,
  writeStubDvc,
} from "./target.ts";

/** The stub's own record, as the repro reads it back: the calls it saw and the runs it queued. */
type StubState = { runs: { name: string; executed: boolean }[]; calls: string[] };

function stubState(root: string): StubState {
  return JSON.parse(readFileSync(join(root, ".stub-dvc.json"), "utf8")) as StubState;
}

try {
  // The claim and the registration, in one act: the ticket is running, names the run, and its run's name
  // is reserved before anything has executed.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    installExperimentTools(root);
    const bin = join(artifacts, "bin");
    writeStubDvc(bin);
    const ticket = publishExperiment(root, { title: "pilot", handle: "exp/01", slug: "pilot" });
    const startedFrom = gitC(root, "rev-parse", "HEAD");

    const run = runScript(
      experimentRun.script("run"),
      root,
      envWithRunTool(bin, {
        ARTIFACTS_DIR: artifacts,
        INPUTS_ISSUE: ticket.handle,
        PI_SDK_PATH: fakePiSdk(artifacts, "record-complete"),
      }),
    );
    expectEqual("the run node exits clean", run.status, 0);
    expectEqual("and speaks its token", run.stdout, "closed\n");

    const issue = storeIssue(root, ticket.id);
    expectEqual("the ticket is closed: the record was complete", issue.status, "closed");
    expect("carrying the unread marker", issue.labels.includes("reading:none"), issue.labels);

    // The registration is in the run's artifacts, and it reserved the ticket's own name.
    const registrationFile = join(artifacts, "experiments", "01-pilot.json");
    expect("the registration is in the run's artifacts", existsSync(registrationFile), registrationFile);
    const registration = JSON.parse(readFileSync(registrationFile, "utf8"));
    expectEqual("it names the run", registration.name, "01-pilot");
    expectEqual("it names the commit the run starts from", registration.code, startedFrom);
    expectEqual("the queue holds the reserved run", registration.runs.map((entry: { name: string }) => entry.name), ["01-pilot"]);

    const state = stubState(root);
    expect("the run was queued under its name", state.calls.includes("exp run --queue -n 01-pilot"), state.calls);
    expectEqual("nothing executed at registration", state.runs.filter((entry) => entry.executed).length, 0);

    // This run has now worked the ticket, so a cycle of the same run never offers it again.
    expectEqual(
      "the run records its own attempt",
      JSON.parse(readFileSync(join(artifacts, "attempted-ids.json"), "utf8")),
      [ticket.id],
    );
  });

  // A registration that cannot be made leaves nothing claimed: the claim goes back with the reason as an
  // ordinary failed attempt, and the run reports the failure rather than throwing.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    installExperimentTools(root);
    const ticket = publishExperiment(root, { title: "broken", handle: "exp/01", slug: "broken" });

    const run = runScript(experimentRun.script("run"), root, {
      ARTIFACTS_DIR: artifacts,
      INPUTS_ISSUE: ticket.handle,
      // The machine's run tool is not where DVC_BIN says it is: the register verb refuses before queueing.
      DVC_BIN: join(root, "no-such-dvc"),
    });
    expectEqual("the run node exits clean with an outcome", run.status, 0);
    expectEqual("and reports the failure", run.stdout, "failed\n");
    expect("the reason is on stderr", /DVC_BIN/.test(run.stderr), run.stderr);

    const issue = storeIssue(root, ticket.id);
    expectEqual("nothing is left claimed: the ticket is open again", issue.status, "open");
    expectEqual("and the assignment is given back", issue.assignee ?? null, null);

    const comments = storeComments(root, ticket.id).map((comment) => comment.text);
    expectEqual("the reason is on the ticket as one failed attempt", comments.length, 1);
    expect("with the flow's own shape and ordinal", /^attempt 1 failed: .*DVC_BIN/s.test(comments[0] ?? ""), comments[0]);
    expectEqual("nothing was registered", existsSync(join(artifacts, "experiments")), false);
    expectEqual(
      "and this run keeps the ticket out of its own next cycle",
      JSON.parse(readFileSync(join(artifacts, "attempted-ids.json"), "utf8")),
      [ticket.id],
    );
  });

  // A failed attempt is an event, not a state: the next run works the ticket exactly like fresh work, and
  // the ticket's name is the one the record will carry.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    installExperimentTools(root);
    const bin = join(artifacts, "bin");
    writeStubDvc(bin);
    const ticket = publishExperiment(root, { title: "retried", handle: "exp/02", slug: "retried" });

    const failed = runScript(experimentRun.script("run"), root, {
      ARTIFACTS_DIR: artifacts,
      INPUTS_ISSUE: ticket.handle,
      DVC_BIN: join(root, "no-such-dvc"),
    });
    expectEqual("the first attempt fails", failed.stdout, "failed\n");
    expectEqual("and leaves the ticket open", storeIssue(root, ticket.id).status, "open");

    const next = runScript(
      experimentRun.script("run"),
      root,
      envWithRunTool(bin, {
        ARTIFACTS_DIR: artifacts,
        INPUTS_ISSUE: ticket.handle,
        PI_SDK_PATH: fakePiSdk(artifacts, "record-complete"),
      }),
    );
    expectEqual("the next run closes it", next.stdout, "closed\n");
    expectEqual("the ticket is closed under the run", storeIssue(root, ticket.id).status, "closed");
    expect("its name is the record's basename", existsSync(join(artifacts, "experiments", "02-retried.json")), "02-retried.json");
    const comments = storeComments(root, ticket.id).map((comment) => comment.text);
    expect("the failure is history on the ticket", comments[0]?.startsWith("attempt 1 failed:"), comments[0]);
    expect("and the close is a second comment, not a rewrite", comments[1]?.startsWith("recorded:"), comments[1]);
  });

  // The node requires its two inputs, the way every per-ticket node does.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    installExperimentTools(root);
    writeStubDvc(join(artifacts, "bin"));
    const ticket = publishExperiment(root, { title: "inputs", handle: "exp/03", slug: "inputs" });

    const noIssue = runScript(experimentRun.script("run"), root, {
      ...envWithout("INPUTS_ISSUE"),
      ARTIFACTS_DIR: artifacts,
    });
    expect("the run node without an issue fails loudly", noIssue.status !== 0, noIssue.status);
    expect("naming the missing input", noIssue.stderr.includes("INPUTS_ISSUE"), noIssue.stderr);
    expectEqual("and claims nothing", storeIssue(root, ticket.id).status, "open");

    const noArtifacts = runScript(experimentRun.script("run"), root, {
      ...envWithout("ARTIFACTS_DIR"),
      INPUTS_ISSUE: ticket.handle,
    });
    expect("the run node without a run directory fails loudly", noArtifacts.status !== 0, noArtifacts.status);
    expect("naming the missing input", noArtifacts.stderr.includes("ARTIFACTS_DIR"), noArtifacts.stderr);
    expectEqual("and claims nothing either", storeIssue(root, ticket.id).status, "open");
  });

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
