#!/usr/bin/env bun
/**
 * Repro: the repair of a killed reading run's leftovers, from the store.
 *
 * The reading executor's landing is a **store fact** - the draft label the landed reading stamps - so the
 * repair reads the store, not git, and resolves every question a killed run left claimed in the one
 * direction the store's own facts say:
 *
 * - `in_progress` carrying the draft label: the reading landed and the status is stale. Back to `open`,
 *   with a comment saying the claim was released after the reading landed, and the draft label left on;
 * - `in_progress` without it: the reading never landed. Back to `open` with the ordinal and the shape an
 *   ordinary failed attempt has, so the retry channel is the frontier itself.
 *
 * Only this executor's claims are repaired: a claim of another leg - a `wayfinder:grilling` question a
 * session took - is left exactly where it was found and reported, and an implementation issue's status is
 * the drain's. All of it runs at `open`, before pick, so a question repaired to `open` is a candidate of
 * the very same run.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { bd, expect, expectEqual, gitC, initReadingTarget, inquiry, publishIssue, runScript, storeComments, storeIssue, withTarget } from "./target.ts";

type ReadingRepair = { id: string; handle?: string; outcome: string; reason: string };

function readRepairs(artifacts: string): ReadingRepair[] {
  return JSON.parse(readFileSync(join(artifacts, "repairs.json"), "utf8")) as ReadingRepair[];
}

function repairFor(artifacts: string, id: string): ReadingRepair | undefined {
  return readRepairs(artifacts).find((entry) => entry.id === id);
}

try {
  // Both directions, from the store, in one opening pass.
  await withTarget(async (root, artifacts) => {
    initReadingTarget(root);
    const landed = publishIssue(root, {
      title: "landed but left claimed",
      type: "decision",
      handle: "q/01",
      slug: "landed-but-left-claimed",
      labels: ["wayfinder:research", "answer:draft"],
    });
    const noDraft = publishIssue(root, {
      title: "claimed and never read",
      type: "decision",
      handle: "q/02",
      slug: "claimed-and-never-read",
      labels: ["wayfinder:research"],
    });
    // A question another leg's session claimed: not this executor's to reopen.
    const otherLeg = publishIssue(root, {
      title: "being grilled",
      type: "decision",
      handle: "q/03",
      slug: "being-grilled",
      labels: ["wayfinder:grilling"],
    });
    // An implementation issue: the drain's, never this executor's.
    const work = publishIssue(root, { title: "work in progress", handle: "q/04", slug: "work-in-progress", labels: ["ready-for-agent"] });
    for (const id of [landed.id, noDraft.id, otherLeg.id, work.id]) bd(root, "update", id, "-s", "in_progress");
    const head = gitC(root, "rev-parse", "main");

    const opened = runScript(inquiry.script("open"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("open exits clean", opened.status, 0);
    expectEqual("and says the run may proceed", opened.stdout, "opened\n");

    // The landed direction: released, with the comment saying so, the draft label untouched.
    const landedComments = storeComments(root, landed.id);
    expectEqual("the landed question is open again", storeIssue(root, landed.id).status, "open");
    expect(
      "with a comment saying the claim was released after the reading landed",
      landedComments.some((c) => /released after the reading landed/.test(c.text)),
      landedComments,
    );
    expectEqual("and no failure comment was written for it", landedComments.some((c) => /attempt \d+ failed:/.test(c.text)), false);
    expect("the draft label is still on it", (storeIssue(root, landed.id).labels as string[]).includes("answer:draft"));

    // The unlanded direction: the ordinary failed-attempt shape, ordinal included.
    const noDraftComments = storeComments(root, noDraft.id);
    expectEqual("the unread question is open again", storeIssue(root, noDraft.id).status, "open");
    expectEqual(
      "with exactly the failed-attempt reason the flow writes",
      noDraftComments.map((c) => c.text),
      ["attempt 1 failed: leftover in progress and no draft answer on the issue"],
    );

    // The claims this executor does not own are left alone.
    expectEqual("another leg's claim is untouched", storeIssue(root, otherLeg.id).status, "in_progress");
    expectEqual("with no comment from this run", storeComments(root, otherLeg.id).length, 0);
    expectEqual("an implementation issue is untouched", storeIssue(root, work.id).status, "in_progress");
    expectEqual("with no comment from this run", storeComments(root, work.id).length, 0);

    // The run's own record of what it repaired.
    expectEqual("the landed repair is recorded", repairFor(artifacts, landed.id)?.outcome, "landed");
    expectEqual("the unlanded repair is recorded", repairFor(artifacts, noDraft.id)?.outcome, "failed");
    expectEqual("the other leg's claim is reported as left alone", repairFor(artifacts, otherLeg.id)?.outcome, "left-alone");
    expectEqual("the implementation issue is reported as left alone", repairFor(artifacts, work.id)?.outcome, "left-alone");
    expectEqual("the repair names every leftover it looked at", readRepairs(artifacts).length, 4);

    // Nothing git could have told it: the repair moved no branch and no Main.
    expect("Main did not move", gitC(root, "rev-parse", "main") === head);

    // A repaired failure is a retry, not this run's attempt: pick offers it in the same run. The landed
    // question stays out of the frontier by its draft label, the other leg's by its missing reading label.
    const picked = runScript(inquiry.script("pick"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("the reopened question is offered to this very run", JSON.parse(picked.stdout), ["q/02"]);
  });

  // The ordinal is the store's own count: a question that already failed once is repaired as attempt 2.
  await withTarget(async (root, artifacts) => {
    initReadingTarget(root);
    const twice = publishIssue(root, {
      title: "failed before, claimed again",
      type: "decision",
      handle: "q/01",
      slug: "failed-before-claimed-again",
      labels: ["wayfinder:research"],
    });
    bd(root, "update", twice.id, "-s", "in_progress");
    bd(root, "comment", twice.id, "attempt 1 failed: the proxy was not running");
    bd(root, "update", twice.id, "-s", "open");
    bd(root, "update", twice.id, "-s", "in_progress");

    const opened = runScript(inquiry.script("open"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("open exits clean", opened.status, 0);
    expectEqual("the reopened question is open", storeIssue(root, twice.id).status, "open");
    expectEqual(
      "and the repair continues the store's own history",
      storeComments(root, twice.id).map((c) => c.text),
      [
        "attempt 1 failed: the proxy was not running",
        "attempt 2 failed: leftover in progress and no draft answer on the issue",
      ],
    );
  });

  // Nothing left claimed is a clean open: no repair, no artifact, no comment.
  await withTarget(async (root, artifacts) => {
    initReadingTarget(root);
    const opened = runScript(inquiry.script("open"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("an empty store still opens", opened.stdout, "opened\n");
    const picked = runScript(inquiry.script("pick"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("and picks nothing", picked.stdout, "[]\n");
  });

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
