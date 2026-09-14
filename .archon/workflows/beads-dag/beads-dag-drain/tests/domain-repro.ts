#!/usr/bin/env bun
/**
 * Repro: the brake holds, and closure never crosses domains.
 *
 * The gate label is the frontier's only gate. An issue without it is never claimed — including one the
 * store's own ready query offers and one braked after it was already eligible on the retry channel —
 * and moving an issue back to a triage state takes it out of the next drain and every drain after,
 * because the triage role label replaces the gate. Abandoning an issue is a label and never a closure,
 * so its dependents stay blocked across drains until someone removes the edge.
 *
 * The other domain: a decision issue is never claimed by a drain, and the repair never touches one's
 * status — an `in_progress` decision issue is the wayfinder operator's, and the repair says so instead
 * of closing or reopening it. And because closing an issue releases whatever waits on it, the opening
 * node refuses the whole run while an implementation issue is blocked by a decision issue, naming the
 * edge before anything is claimed or repaired — the case where the wayfinder has already closed the
 * decision and the store has quietly released implementation work that was never built.
 *
 * Each case drives the nodes the way the runner does and reads only the store's answers, the run's
 * artifacts, and git.
 */
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { OPENED, nodeLine } from "../scripts/node-outcomes.ts";
import {
  GATE_LABEL,
  TRIAGE_LABELS,
  bd,
  commitFile,
  drain,
  expect,
  expectEqual,
  failAttempt,
  gitC,
  mkTemp,
  moveToTriage,
  publishIssue,
  runScript,
  storeBlocked,
  storeIssue,
  storeReady,
  storeReadyAll,
  withTarget,
} from "./target.ts";

const REPORT = "pick-exclusions.json";

type ExclusionReport = {
  picked: { id: string; handle: string }[];
  excluded: { id: string; handle?: string; rule: string }[];
};

function readReport(artifacts: string): ExclusionReport {
  return JSON.parse(readFileSync(join(artifacts, REPORT), "utf8")) as ExclusionReport;
}

/** The rule the report says excluded one issue, or undefined when it does not name that issue at all. */
function ruleFor(report: ExclusionReport, id: string): string | undefined {
  return report.excluded.find((entry) => entry.id === id)?.rule;
}

function pick(root: string, artifacts: string): { stdout: string; stderr: string; status: number | null } {
  return runScript(drain.script("pick"), root, { ARTIFACTS_DIR: artifacts });
}

function open(root: string, artifacts: string): { stdout: string; stderr: string; status: number | null } {
  return runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts });
}

/** Run one drain from its own artifacts directory — what "the next drain" means to these nodes. */
async function nextDrain(root: string, fn: (artifacts: string) => void): Promise<void> {
  const artifacts = mkTemp("artifacts-next-");
  try {
    fn(artifacts);
  } finally {
    rmSync(artifacts, { recursive: true, force: true });
  }
}

/** The merge commits Main carries, by subject: a run that must not close over the wrong domain. */
function merges(root: string): string[] {
  return gitC(root, "log", "--merges", "--format=%s", "main")
    .split("\n")
    .filter((line) => line !== "");
}

try {
  // The gate: the one way into the frontier. Every issue below is eligible-looking — open, unblocked,
  // gate-labelled and offered by the store's own ready query — until the operator pulls the gate label,
  // which is what a move back to a triage state does.
  await withTarget(async (root, artifacts) => {
    const control = publishIssue(root, {
      title: "the control",
      handle: "feat/01",
      slug: "the-control",
      labels: [GATE_LABEL],
    });
    const triaged = TRIAGE_LABELS.map((label, i) => ({
      label,
      issue: publishIssue(root, {
        title: `moved to ${label}`,
        handle: `feat/0${i + 2}`,
        slug: `moved-to-${label}`,
        labels: [GATE_LABEL],
      }),
    }));
    const unlabelled = publishIssue(root, {
      title: "gate pulled and nothing applied",
      handle: "feat/06",
      slug: "gate-pulled-and-nothing-applied",
      labels: [GATE_LABEL],
    });
    const failed = publishIssue(root, {
      title: "failed, then braked",
      handle: "feat/07",
      slug: "failed-then-braked",
      labels: [GATE_LABEL],
    });
    failAttempt(root, failed.id, "the attempt did not land");
    const braked = [...triaged.map((t) => t.issue), unlabelled, failed];

    expectEqual(
      "staged: the store offers every one of them, the failed one included",
      storeReady(root).sort(),
      [control, ...braked].map((i) => i.id).sort(),
    );

    // The brake, from the side it can be pulled: a triage move is the role label replacing the gate.
    // The failed issue is braked out of the retry channel too — the brake is not fresh-work-only.
    for (const { label, issue } of triaged) moveToTriage(root, issue.id, label);
    bd(root, "update", unlabelled.id, "--remove-label", GATE_LABEL);
    bd(root, "update", failed.id, "--remove-label", GATE_LABEL);

    // Readiness itself did not change: the store still says they can start, because the gate is this
    // flow's policy and not the store's. The exclusion is the drain's, so the report has to explain it.
    expect(
      "staged: the store still offers the braked ones",
      braked.every((issue) => storeReadyAll(root).includes(issue.id)),
      braked.map((issue) => issue.id),
    );

    const run = pick(root, artifacts);
    expectEqual("pick exits clean", run.status, 0);
    expectEqual("the drain claims only the issue that kept its gate", JSON.parse(run.stdout), [control.handle]);
    expectEqual("and claims it", storeIssue(root, control.id).status, "in_progress");
    const report = readReport(artifacts);
    for (const issue of braked) {
      expectEqual(`${issue.handle} was never claimed`, storeIssue(root, issue.id).status, "open");
      expectEqual(`the report names why ${issue.handle} was left out`, ruleFor(report, issue.id), "missing-gate-label");
    }
    expectEqual(
      "the report explains every braked issue and nothing else",
      report.excluded.map((entry) => entry.id).sort(),
      braked.map((issue) => issue.id).sort(),
    );

    // The next drain, with its own memory: the brake is a store state, not a per-run subtraction.
    await nextDrain(root, (next) => {
      const second = pick(root, next);
      expectEqual("the next drain offers nothing", JSON.parse(second.stdout), []);
      const nextReport = readReport(next);
      for (const issue of braked) {
        expectEqual(`the next drain still leaves ${issue.handle} alone`, storeIssue(root, issue.id).status, "open");
        expectEqual(
          `and still explains ${issue.handle} with the gate`,
          ruleFor(nextReport, issue.id),
          "missing-gate-label",
        );
      }
    });
  });

  // Abandoning work is a label. It never closes the issue — a close is what releases what waited on it —
  // so a dependent stays blocked across drains, and the pack itself never closes the abandoned issue.
  await withTarget(async (root, artifacts) => {
    const abandoned = publishIssue(root, {
      title: "abandoned",
      handle: "feat/10",
      slug: "abandoned",
      labels: [GATE_LABEL],
    });
    const dependent = publishIssue(root, {
      title: "waiting on the abandoned one",
      handle: "feat/11",
      slug: "waiting-on-the-abandoned-one",
      labels: [GATE_LABEL],
    });
    bd(root, "dep", "add", dependent.id, abandoned.id);
    moveToTriage(root, abandoned.id, "wontfix");

    expectEqual("the abandoned issue carries the label", storeIssue(root, abandoned.id).labels, ["wontfix"]);
    expectEqual("and is still open, not closed", storeIssue(root, abandoned.id).status, "open");
    expectEqual("with no close reason", storeIssue(root, abandoned.id).close_reason ?? null, null);
    expectEqual("its dependent is blocked by it", storeBlocked(root), [dependent.id]);
    expectEqual("so the store does not offer the dependent", storeReadyAll(root).includes(dependent.id), false);

    for (const nth of ["first", "second"] as const) {
      await nextDrain(root, (runArtifacts) => {
        const picked = pick(root, runArtifacts);
        expectEqual(`the ${nth} drain claims nothing`, JSON.parse(picked.stdout), []);
        expectEqual(
          `the ${nth} drain explains the abandoned issue`,
          ruleFor(readReport(runArtifacts), abandoned.id),
          "missing-gate-label",
        );
        expectEqual(
          `the ${nth} drain does not explain a blocked issue it never saw`,
          ruleFor(readReport(runArtifacts), dependent.id),
          undefined,
        );
        expectEqual(`after the ${nth} drain the dependent is still blocked`, storeBlocked(root), [dependent.id]);
        expectEqual(`after the ${nth} drain the abandoned issue is still open`, storeIssue(root, abandoned.id).status, "open");
      });
    }
    // The counterfactual, staged directly: a close releases the dependent whatever reason it carries,
    // which is exactly why an abandoned issue must stay open.
    bd(root, "close", abandoned.id, "-r", "wontfix");
    expectEqual("a close releases the dependent, whatever its reason", storeReady(root), [dependent.id]);
  });

  // Decision issues: a separate domain. A drain never claims one, and the repair never touches one's
  // status — closing or reopening a decision issue would fight whoever claimed it, and its closure must
  // never release implementation work.
  await withTarget(async (root, artifacts) => {
    const merged = publishIssue(root, {
      title: "a claimed decision whose answer is on Main",
      type: "decision",
      handle: "feat/20",
      slug: "a-claimed-decision",
      labels: [GATE_LABEL],
    });
    const plain = publishIssue(root, {
      title: "a claimed decision with nothing in git",
      type: "decision",
      handle: "feat/21",
      slug: "a-claimed-decision-with-nothing-in-git",
      labels: [GATE_LABEL],
    });
    const ready = publishIssue(root, {
      title: "a decision nobody has claimed",
      type: "decision",
      handle: "feat/22",
      slug: "a-decision-nobody-has-claimed",
      labels: [GATE_LABEL],
    });
    bd(root, "update", merged.id, "-s", "in_progress");
    bd(root, "update", plain.id, "-s", "in_progress");

    // The claimed one has a merge on Main even: the state a repair that ignored domains would close.
    const branch = "beads/feat/20-a-claimed-decision";
    const worktree = join(root, "worktrees", "feat-20-a-claimed-decision");
    gitC(root, "worktree", "add", "-b", branch, worktree, "main");
    commitFile(worktree, "answer.txt", "the answer\n", "the wayfinder's answer");
    gitC(root, "merge", "--no-ff", "-m", `beads-dag: merge ${branch}`, branch);
    const landed = gitC(root, "rev-parse", "main");

    const opened = open(root, artifacts);
    expectEqual("open exits clean with a decision claimed", opened.status, 0);
    expectEqual("and speaks the protocol", opened.stdout, nodeLine(OPENED));
    for (const [issue, why] of [
      [merged, "its answer is on Main"],
      [plain, "nothing is in git"],
    ] as const) {
      expectEqual(
        `the repair leaves ${issue.handle} where the wayfinder put it (${why})`,
        storeIssue(root, issue.id).status,
        "in_progress",
      );
      expectEqual(`and records nothing on ${issue.handle}`, storeIssue(root, issue.id).comment_count, 0);
      expectEqual(`and does not close ${issue.handle}`, storeIssue(root, issue.id).close_reason ?? null, null);
      expect(`the report says ${issue.handle} was left alone`, opened.stderr.includes(`${issue.handle}: left alone`), opened.stderr);
    }
    expectEqual("Main did not move", gitC(root, "rev-parse", "main"), landed);
    expectEqual("the merge that landed stays the only one", merges(root), [`beads-dag: merge ${branch}`]);
    expectEqual("and the worktree stays", existsSync(worktree), true);

    const picked = pick(root, artifacts);
    expectEqual("pick claims no decision issue", JSON.parse(picked.stdout), []);
    expectEqual("not even the gate-labelled ready one", storeIssue(root, ready.id).status, "open");
    const report = readReport(artifacts);
    expectEqual("the ready decision is reported by type", ruleFor(report, ready.id), "decision-type");
    expectEqual("and the claimed ones were never in the store's answer", report.excluded.map((e) => e.id), [ready.id]);
  });

  // The graph preflight: an implementation issue blocked by a decision issue is refused loudly, naming
  // the edge, before anything is claimed or repaired. The decision is closed already, so the store has
  // released the dependent — only a drain that ignored the edge would work it.
  await withTarget(async (root, artifacts) => {
    const impl = publishIssue(root, {
      title: "blocked by a question",
      handle: "feat/30",
      slug: "blocked-by-a-question",
      labels: [GATE_LABEL],
    });
    const decision = publishIssue(root, {
      title: "the question",
      type: "decision",
      handle: "feat/31",
      slug: "the-question",
    });
    bd(root, "dep", "add", impl.id, decision.id);
    bd(root, "close", decision.id, "-r", "answered");
    const leftover = publishIssue(root, {
      title: "a leftover from a killed run",
      handle: "feat/32",
      slug: "a-leftover-from-a-killed-run",
      labels: [GATE_LABEL],
    });
    bd(root, "update", leftover.id, "-s", "in_progress");

    expectEqual("staged: the store has released the dependent", storeReadyAll(root).includes(impl.id), true);

    const opened = open(root, artifacts);
    expect("open fails loudly", opened.status !== 0, opened.stdout);
    expectEqual("and prints no token", opened.stdout, "");
    for (const token of [impl.id, impl.handle, decision.id, decision.handle]) {
      expect(`the reason names ${token}`, opened.stderr.includes(token), opened.stderr);
    }
    expect("the reason names the refused domain", /decision/.test(opened.stderr), opened.stderr);
    expectEqual("nothing was claimed", storeIssue(root, impl.id).status, "open");
    expectEqual("and the leftover was not repaired either", storeIssue(root, leftover.id).status, "in_progress");
    expectEqual("with no comment on it", storeIssue(root, leftover.id).comment_count, 0);
  });

  // The preflight refuses that one shape and nothing else: implementation-to-implementation blocking is
  // the graph working as designed, and a non-blocking edge to a decision issue does not block.
  await withTarget(async (root, artifacts) => {
    const blocker = publishIssue(root, {
      title: "the blocker",
      handle: "feat/40",
      slug: "the-blocker",
      labels: [GATE_LABEL],
    });
    const blocked = publishIssue(root, {
      title: "the blocked",
      handle: "feat/41",
      slug: "the-blocked",
      labels: [GATE_LABEL],
    });
    bd(root, "dep", "add", blocked.id, blocker.id);
    const decision = publishIssue(root, {
      title: "a related question",
      type: "decision",
      handle: "feat/42",
      slug: "a-related-question",
    });
    bd(root, "dep", "relate", blocked.id, decision.id);
    // `bd dep relate` leaves its edge uncommitted, and the blocked-ness recompute refuses a dirty
    // dependency working set; pin it the way an operator would before the drain runs.
    bd(root, "dolt", "commit", "-m", "link the question");

    const opened = open(root, artifacts);
    expectEqual("open exits clean when the edge stays in the domain", opened.status, 0);
    expectEqual("and speaks the protocol", opened.stdout, nodeLine(OPENED));
    const picked = pick(root, artifacts);
    expectEqual("the drain works the implementation blocker", JSON.parse(picked.stdout), [blocker.handle]);
    expectEqual("and never the blocked issue", storeIssue(root, blocked.id).status, "open");
    expectEqual("which the report does not need to explain: the store never offered it", ruleFor(readReport(artifacts), blocked.id), undefined);
  });

  // The window between open and the claim, which is what the check cannot afford to miss: open's read is
  // one moment and a drain's cycles go on for hours, and the store stays writable throughout — the
  // wayfinder publishing an issue, linking it and answering a question are store writes like any other.
  // So the whole shape arrives AFTER open passed, and open's preflight could not have seen any of it: a
  // question and the implementation issue that waits on it are published, the edge is written, and the
  // question is answered. Answering it is the close that releases the dependent, and the store's own
  // ready answer offers it as work. The claim has to refuse the cycle, and the run with it, or a
  // decision's closure would have started implementation work that was never built.
  await withTarget(async (root, artifacts) => {
    const opened = open(root, artifacts);
    expectEqual("open exits clean on a store with no issues in it", opened.status, 0);
    expectEqual("and speaks the protocol", opened.stdout, nodeLine(OPENED));

    // The window itself: the question, the implementation issue, their relation, then the answer. Every
    // one of them lands after open and before the cycle that would claim.
    const decision = publishIssue(root, {
      title: "a question that arrives mid-run",
      type: "decision",
      handle: "feat/51",
      slug: "a-question-that-arrives-mid-run",
    });
    const impl = publishIssue(root, {
      title: "published waiting on that question",
      handle: "feat/50",
      slug: "published-waiting-on-that-question",
      labels: [GATE_LABEL],
    });
    bd(root, "dep", "add", impl.id, decision.id);
    expectEqual(
      "the store holds the implementation issue back while the question is open",
      storeReadyAll(root).includes(impl.id),
      false,
    );
    bd(root, "close", decision.id, "-r", "answered");
    expectEqual("and offers it the moment the question is answered", storeReadyAll(root).includes(impl.id), true);

    const picked = pick(root, artifacts);
    expect("the claim refuses the cycle", picked.status !== 0, picked.stdout);
    expectEqual("and prints no token", picked.stdout, "");
    for (const token of [impl.id, impl.handle, decision.id, decision.handle]) {
      expect(`the reason names ${token}`, picked.stderr.includes(token), picked.stderr);
    }
    expect("the reason is the preflight's own", picked.stderr.startsWith("closure would cross domains:"), picked.stderr);
    expectEqual("nothing was claimed", storeIssue(root, impl.id).status, "open");
    expectEqual("no cycle report was written", existsSync(join(artifacts, REPORT)), false);
    expectEqual("and nothing was recorded as attempted", existsSync(join(artifacts, "attempted-ids.json")), false);

    // The operator's fix is the check's own, and it is the edge and not something else that stopped the
    // cycle: remove the relation and the same run directory claims the issue the answer released.
    bd(root, "dep", "remove", impl.id, decision.id);
    const after = pick(root, artifacts);
    expectEqual("the cycle runs once the edge is gone", after.status, 0);
    expectEqual("and claims the issue the answer released", JSON.parse(after.stdout), [impl.handle]);
  });

  // The check at the claim is the preflight itself, so it reads what the preflight reads — every issue,
  // closed ones included — and not the ready set, and not only the edges of what a cycle would claim. A
  // cross-domain edge is the graph's shape, and open refuses a run for one wherever it sits; the same
  // shape appearing between open and a cycle refuses that cycle just the same, even when the cycle would
  // otherwise have claimed work that had nothing to do with it.
  await withTarget(async (root, artifacts) => {
    const impl = publishIssue(root, {
      title: "waiting on two blockers",
      handle: "feat/60",
      slug: "waiting-on-two-blockers",
      labels: [GATE_LABEL],
    });
    const other = publishIssue(root, {
      title: "the implementation blocker",
      handle: "feat/61",
      slug: "the-implementation-blocker",
      labels: [GATE_LABEL],
    });
    const decision = publishIssue(root, {
      title: "a question nobody has answered",
      type: "decision",
      handle: "feat/62",
      slug: "a-question-nobody-has-answered",
    });
    bd(root, "dep", "add", impl.id, other.id);

    const opened = open(root, artifacts);
    expectEqual("open exits clean", opened.status, 0);
    expectEqual("and the store offers the implementation blocker", storeReady(root), [other.id]);

    // The crossing edge arrives after open. It releases nothing: the question is open, and the
    // implementation issue waits on an implementation blocker as well, so the store offers neither of
    // them. The graph is the wrong shape all the same.
    bd(root, "dep", "add", impl.id, decision.id);

    const picked = pick(root, artifacts);
    expect("the claim refuses the cycle over an edge it was not going to claim through", picked.status !== 0, picked.stdout);
    expectEqual("and prints no token", picked.stdout, "");
    expectEqual("so the implementation blocker was not claimed either", storeIssue(root, other.id).status, "open");
    expectEqual("and the dependent stayed open", storeIssue(root, impl.id).status, "open");
  });

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
