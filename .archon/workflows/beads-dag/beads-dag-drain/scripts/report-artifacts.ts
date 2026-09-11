/**
 * The drain-end artifacts, and the skip protocol that crosses the review -> summary boundary.
 *
 * Three names, all relative to the run's ARTIFACTS_DIR:
 *
 * - **review-base** — Main's tip when the drain opened, written once by the opening node before any
 *   merge. It is the source of the range both readers report on: `base..Main` is this run's work, and
 *   nothing before the base can be this run's.
 * - **review.md** — the reviewers' findings, one section per axis.
 * - **summary.md** — the one report a human reads first, merged from review.md.
 *
 * The skip protocol lives here with them, so producer and consumer cannot spell a sentinel differently:
 * a node with nothing to report writes one line instead of spending an agent, and the consumer reads it
 * back through `reviewSkipReason`. `review error:` is a skip with a reason, so a review that failed is
 * never summarised as if it held findings.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gitOrThrow } from "./git.ts";
import { nodeLine } from "./node-outcomes.ts";
import { mainBranch } from "./worktree.ts";

/** The drain-end artifacts, relative to ARTIFACTS_DIR. */
export const REVIEW_BASE_REL = "review-base";
export const REVIEW_MD_REL = "review.md";
export const SUMMARY_MD_REL = "summary.md";

/**
 * The two openers of the skip protocol. A node with nothing to report writes one instead of spending
 * an agent, and the consumer reads it back through reviewSkipReason.
 */
const SKIP = "skip:";
const REVIEW_ERROR = "review error:";

/** What a reader with nothing to report writes: the skip line, ended like every node token (nodeLine). */
export function skipLine(reason: string): string {
  return nodeLine(`${SKIP} ${reason}`);
}

/** A review failure without the line ending: one axis' section body inside review.md. */
export function reviewErrorText(detail: string): string {
  return `${REVIEW_ERROR} ${detail}`;
}

/** review.ts's own failure line: the range could not be read at all. The consumer reads it as a skip. */
export function reviewErrorLine(detail: string): string {
  return nodeLine(reviewErrorText(detail));
}

/**
 * The one reader of review.md's skip protocol: the reason line when the review holds no report
 * (skipped, or failed), null when it is findings the summary node may merge. Empty content is null
 * too - summary.ts owns that case, because review.ts cannot produce it.
 */
export function reviewSkipReason(reviewMd: string): string | null {
  const first = reviewMd.trim().split("\n")[0] ?? "";
  return first.startsWith(SKIP) || first.startsWith(REVIEW_ERROR) ? first : null;
}

/** One drain-end artifact ends with exactly one newline, the convention every node token follows. */
export function writeArtifact(file: string, body: string): void {
  writeFileSync(file, body.endsWith("\n") ? body : nodeLine(body));
}

/** review-base read back: the SHA, or the skip line the reader writes instead of reporting. */
type ReviewBaseRead = { base: string } | { skip: string };

/** The base both drain-end readers need, so the artifact's shape (one SHA) is read in one place. */
export function readReviewBase(artifactsDir: string): ReviewBaseRead {
  const baseFile = join(artifactsDir, REVIEW_BASE_REL);
  if (!existsSync(baseFile)) return { skip: skipLine("no review-base") };
  const base = readFileSync(baseFile, "utf8").trim();
  if (!base) return { skip: skipLine("empty review-base") };
  return { base };
}

/**
 * Record the range's base: Main's tip as this run finds it, before anything is merged.
 *
 * The opening node is where this runs, and its order is deliberate but not load-bearing: the repair it
 * runs just before this neither moves Main (it closes an issue whose merge already landed, or reopens
 * one that never merged) nor makes a commit, so a base taken before the repair and one taken after it
 * are the same commit. Recording it here, in the always-run opening step, is what makes it once per
 * run and before every merge: the loop that can merge runs after this node, so no merge of this run
 * can precede its own base.
 */
export function writeReviewBase(target: string, artifactsDir: string): string {
  mkdirSync(artifactsDir, { recursive: true });
  // The Target's own checkout: its checked-out branch is Main (worktree.ts), which is what merges land
  // on. The readers resolve the same branch for the range's end.
  const sha = gitOrThrow(target, ["rev-parse", mainBranch(target)]);
  writeArtifact(join(artifactsDir, REVIEW_BASE_REL), sha);
  return sha;
}
