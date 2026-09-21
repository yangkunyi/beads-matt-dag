#!/usr/bin/env bun
/**
 * Repro: attention is the Target's navigator, and it writes nothing.
 *
 * A fixture Target is enough: the JSON names leftovers, stuck, drafts, the three ready frontiers,
 * unread experiments and braked issues, each item names `next`, and a second read after the first
 * sees the same store. It does not start a drain. It does not parse jsonl.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { attention } from "../../scripts/attention.ts";
import { runLockFilePath } from "../../scripts/run-lock.ts";
import {
  GATE_LABEL,
  bd,
  expect,
  expectEqual,
  failAttempt,
  moveToTriage,
  publishExperiment,
  publishIssue,
  storeIssue,
  withTarget,
} from "./target.ts";

function ids(items: { handle: string }[]): string[] {
  return items.map((item) => item.handle).sort();
}

function one<T extends { handle: string }>(items: T[], handle: string): T {
  const found = items.find((item) => item.handle === handle);
  if (found === undefined) throw new Error(`no item ${handle} in ${ids(items).join(",")}`);
  return found;
}

try {
  await withTarget(async (root) => {
    const headed = publishIssue(root, {
      title: "headed work",
      handle: "feat/01",
      slug: "headed-work",
      labels: [GATE_LABEL],
      body: `---
goal: the headed issue lands
acceptance:
  - attention reports present
---
`,
    });
    const essay = publishIssue(root, {
      title: "essay work",
      handle: "feat/02",
      slug: "essay-work",
      labels: [GATE_LABEL],
    });
    const retried = publishIssue(root, {
      title: "failed once",
      handle: "feat/03",
      slug: "failed-once",
      labels: [GATE_LABEL],
    });
    failAttempt(root, retried.id, "verify red");
    const leftover = publishIssue(root, {
      title: "claimed leftover",
      handle: "feat/04",
      slug: "claimed-leftover",
      labels: [GATE_LABEL],
    });
    bd(root, "update", leftover.id, "-s", "in_progress");
    const readingLeftover = publishIssue(root, {
      title: "claimed reading",
      type: "decision",
      handle: "q/05",
      slug: "claimed-reading",
      labels: ["wayfinder:research"],
    });
    bd(root, "update", readingLeftover.id, "-s", "in_progress");
    const grillLeftover = publishIssue(root, {
      title: "claimed grill",
      type: "decision",
      handle: "q/06",
      slug: "claimed-grill",
      labels: ["wayfinder:grilling"],
    });
    bd(root, "update", grillLeftover.id, "-s", "in_progress");
    const braked = publishIssue(root, {
      title: "needs info",
      handle: "feat/05",
      slug: "needs-info",
      labels: [GATE_LABEL],
    });
    moveToTriage(root, braked.id, "needs-info");
    const blocker = publishIssue(root, {
      title: "wontfix blocker",
      handle: "feat/06",
      slug: "wontfix-blocker",
      labels: [GATE_LABEL],
    });
    moveToTriage(root, blocker.id, "wontfix");
    const stuck = publishIssue(root, {
      title: "waiting on wontfix",
      handle: "feat/07",
      slug: "waiting-on-wontfix",
      labels: [GATE_LABEL],
    });
    bd(root, "dep", "add", stuck.id, blocker.id);

    publishIssue(root, {
      title: "a drafted answer",
      type: "decision",
      handle: "q/01",
      slug: "drafted",
      labels: ["wayfinder:research", "answer:draft"],
    });
    const readable = publishIssue(root, {
      title: "a question to read",
      type: "decision",
      handle: "q/02",
      slug: "to-read",
      labels: ["wayfinder:research"],
    });
    publishIssue(root, {
      title: "the map",
      type: "decision",
      handle: "q/03",
      slug: "the-map",
      labels: ["wayfinder:map"],
    });
    publishIssue(root, {
      title: "an ungated idea",
      type: "decision",
      handle: "q/04",
      slug: "ungated-idea",
      labels: ["needs-triage"],
    });

    const runnable = publishExperiment(root, {
      title: "a runnable experiment",
      handle: "exp/01",
      slug: "runnable",
    });
    const unread = publishExperiment(root, {
      title: "an unread result",
      handle: "exp/02",
      slug: "unread",
    });
    bd(root, "update", unread.id, "-s", "closed");
    bd(root, "set-state", unread.id, "reading=none", "--reason", "recorded");
    const experimentLeftover = publishExperiment(root, {
      title: "claimed experiment",
      handle: "exp/03",
      slug: "claimed-experiment",
    });
    bd(root, "update", experimentLeftover.id, "-s", "in_progress");

    const before = bd(root, "list", "--all", "--json", "--limit", "0");
    const snap = attention(root);
    const after = bd(root, "list", "--all", "--json", "--limit", "0");
    expectEqual("attention writes nothing", after, before);
    expectEqual("the Target path is absolute", snap.target, root);
    expectEqual("no run is held", snap.run, { held: false });

    expectEqual("leftovers are the claimed work", ids(snap.buckets.leftovers), [
      "exp/03",
      "feat/04",
      "q/05",
      "q/06",
    ]);
    expectEqual("the leftover is development", one(snap.buckets.leftovers, "feat/04").domain, "development");
    expectEqual("leftover next is drain", one(snap.buckets.leftovers, "feat/04").next, "drain");
    expectEqual("leftover type is the store's", one(snap.buckets.leftovers, "feat/04").type, "task");
    expectEqual("a reading leftover is inquiry", one(snap.buckets.leftovers, "q/05").domain, "inquiry");
    expectEqual("a reading leftover next is inquiry", one(snap.buckets.leftovers, "q/05").next, "inquiry");
    expectEqual("a grill leftover next is grill", one(snap.buckets.leftovers, "q/06").next, "grill");
    expectEqual("an experiment leftover is experiments", one(snap.buckets.leftovers, "exp/03").domain, "experiments");
    expectEqual("an experiment leftover next is experiment", one(snap.buckets.leftovers, "exp/03").next, "experiment");

    expectEqual("stuck names the dependent", ids(snap.buckets.stuck), ["feat/07"]);
    expectEqual("stuck waiting_on names the wontfix blocker", one(snap.buckets.stuck, "feat/07").waiting_on, [
      { handle: "feat/06", why: "wontfix" },
    ]);
    expectEqual("stuck next is triage", one(snap.buckets.stuck, "feat/07").next, "triage");

    expectEqual("drafts are answer:draft questions", ids(snap.buckets.drafts), ["q/01"]);
    expectEqual("draft next is a session close", one(snap.buckets.drafts, "q/01").next, "accept-or-edit-or-reject");
    expectEqual("the draft title is the store's", one(snap.buckets.drafts, "q/01").title, "a drafted answer");

    expectEqual("ready development is the next drain's frontier", ids(snap.buckets.ready.development), [
      "feat/01",
      "feat/02",
      "feat/03",
    ]);
    expectEqual("a YAML head is present", one(snap.buckets.ready.development, "feat/01").contract, "present");
    expectEqual("an essay is missing", one(snap.buckets.ready.development, "feat/02").contract, "missing");
    expectEqual("a failed attempt still appears", one(snap.buckets.ready.development, "feat/03").attempts_failed, 1);
    expectEqual("ready development next is drain", one(snap.buckets.ready.development, "feat/01").next, "drain");
    expect(
      "experiments are absent from ready development",
      !snap.buckets.ready.development.some((item) => item.handle === "exp/01"),
    );
    expect("headed work is still the store's issue", storeIssue(root, headed.id).status === "open");
    expect("essay work is still the store's issue", storeIssue(root, essay.id).status === "open");

    expectEqual("ready inquiry is the reading frontier", ids(snap.buckets.ready.inquiry), ["q/02"]);
    expectEqual("ready inquiry next is inquiry", one(snap.buckets.ready.inquiry, "q/02").next, "inquiry");
    expect("maps are absent", !snap.buckets.ready.inquiry.some((item) => item.handle === "q/03"));
    expect("drafts are absent from ready inquiry", !snap.buckets.ready.inquiry.some((item) => item.handle === "q/01"));
    expect("ungated questions are absent", !snap.buckets.ready.inquiry.some((item) => item.handle === "q/04"));
    expect("the readable question is still open", storeIssue(root, readable.id).status === "open");

    expectEqual("ready experiments is the experiment frontier", ids(snap.buckets.ready.experiments), ["exp/01"]);
    expectEqual("ready experiments next is experiment", one(snap.buckets.ready.experiments, "exp/01").next, "experiment");
    expect("the runnable experiment is still open", storeIssue(root, runnable.id).status === "open");

    expectEqual("unread is the closed reading:none experiment", ids(snap.buckets.unread_experiments), ["exp/02"]);
    expectEqual("unread next is optional", one(snap.buckets.unread_experiments, "exp/02").next, "read-or-decline");
    expect(
      "the unread marker is the store's lookup cache",
      (storeIssue(root, unread.id).labels as string[]).includes("reading:none"),
    );

    expect("needs-info is braked", ids(snap.buckets.braked).includes("feat/05"));
    expect("wontfix is braked", ids(snap.buckets.braked).includes("feat/06"));
    expect("an ungated idea is braked", ids(snap.buckets.braked).includes("q/04"));
    expectEqual("braked next is triage", one(snap.buckets.braked, "feat/05").next, "triage");

    const lock = runLockFilePath(root);
    writeFileSync(lock, `${process.pid}\nheld-run\ndrain\n`);
    const held = attention(root);
    expectEqual("a live lock is held", held.run, { held: true, runId: "held-run", kind: "drain" });
    expectEqual("leftover next waits", one(held.buckets.leftovers, "feat/04").next, "wait");
    expectEqual("ready next waits", one(held.buckets.ready.development, "feat/01").next, "wait");
    expectEqual("ready inquiry waits", one(held.buckets.ready.inquiry, "q/02").next, "wait");
    expectEqual("ready experiments wait", one(held.buckets.ready.experiments, "exp/01").next, "wait");
    expectEqual("the lock file is untouched", readFileSync(lock, "utf8"), `${process.pid}\nheld-run\ndrain\n`);
  });

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
