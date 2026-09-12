/**
 * The recorded position: which Main tip a review has looked at, kept as a local git ref in the Target.
 *
 * **A ref, not a file**: the fact is a git fact - which commit's work has been reviewed is a place in
 * this repository's history - and a ref is git's own way to name a commit: it can only point at a
 * commit the repository has, it moves atomically, and it travels with the repository instead of
 * living beside it as a second record that a checkout can drift from. It is not a store field either:
 * it says nothing about any issue's state, only how far Main's reviews have reached (ADR-0005 - state
 * in the store, the work itself in git).
 *
 * Absence is not an error. A Target that has never recorded a position behaves exactly as every run
 * did before the position existed - its report covers the merges it made - and the opening node
 * records Main's tip as the first position. From then on the range both readers cover starts where
 * the last review that wrote findings stopped, so a run killed between its merge and its review does
 * not drop that merge out of every later report.
 *
 * Two writers, both here, both forward-only: the opening node records a position when there is none
 * (nothing has been reviewed yet), and the review node advances it once it has written findings.
 */
import { git, gitOrThrow, isAncestor, revParse } from "./git.ts";
import { mainBranch } from "./worktree.ts";

/** The Target-local ref that holds the position. Not a branch: it is not a line of work, only a place. */
export const REVIEWED_REF = "refs/beads-dag/reviewed";

/** The recorded position, or undefined when this Target has none. A ref git cannot read reads as none. */
export function reviewedPosition(target: string): string | undefined {
  const r = git(target, ["rev-parse", "--verify", "--quiet", REVIEWED_REF]);
  const sha = r.out.trim();
  return r.ok && sha !== "" ? sha : undefined;
}

/**
 * The position a run opens on: the recorded one when the Target has one, else Main's tip, recorded
 * now.
 *
 * A fresh Target has no position, and inventing one from history would make the first run's report
 * cover work nobody asked it to; recording the tip it opened on keeps the first run's range exactly
 * what it is today - and it is what lets a run killed before its review still have its merge covered
 * by the next one. The record is a must-not-exist write, so two runs opening a fresh Target at once
 * cannot jump the position over the other's merges: the first writer's tip stands.
 */
export function positionToOpenOn(target: string): string {
  const current = reviewedPosition(target);
  if (current !== undefined) return current;
  const tip = revParse(target, mainBranch(target));
  git(target, ["update-ref", REVIEWED_REF, tip, ""]);
  return reviewedPosition(target) ?? tip;
}

/**
 * Advance the position to the end of a range a review actually wrote findings on.
 *
 * Forward only: two runs may review over the same base, and the later head contains the earlier one,
 * so a head the current position is ahead of is never written. A position git cannot compare with
 * (a rewritten or pruned history) is replaced by the new head rather than wedging the record.
 */
export function advanceReviewed(target: string, head: string): void {
  const current = reviewedPosition(target);
  if (current !== undefined && isAncestor(target, head, current)) return;
  gitOrThrow(target, ["update-ref", REVIEWED_REF, head]);
}
