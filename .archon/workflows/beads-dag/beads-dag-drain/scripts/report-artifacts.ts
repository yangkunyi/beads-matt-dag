/**
 * The drain-end artifacts, and the skip protocol that crosses the review -> summary boundary.
 *
 * Three names, all relative to the run's ARTIFACTS_DIR:
 *
 * - **review-base** — the range's base, written once by the opening node before any merge: the
 *   recorded position (`review-position.ts`) when the Target has one, else Main's tip as this run
 *   opened on it. It is the source of the range both readers report on, so a review that advances the
 *   position cannot empty the summary's range: `base..Main` is what this run and its predecessors left
 *   unviewed, and nothing before the base can be in this run's report.
 * - **review.md** — the reviewers' findings, one section per axis.
 * - **summary.md** — the one report a human reads first, merged from review.md.
 *
 * The skip protocol lives here with them, so producer and consumer cannot spell a sentinel differently:
 * a node with nothing to report writes one line instead of spending an agent, and the consumer reads it
 * back through `reviewSkipReason`. `review error:` is a skip with a reason, so a review that failed is
 * never summarised as if it held findings - and it is what `reviewWroteFindings` reads back before the
 * recorded position may advance.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { nodeLine } from "./node-outcomes.ts";
import { positionToOpenOn } from "./review-position.ts";

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

/**
 * Whether one review's artifact holds findings - the readback the review node makes before advancing
 * the recorded position. The protocol answers it: a `skip:` line (nothing to look at) and a
 * `review error:` line (the review failed) are what `reviewSkipReason` reads back, and anything else
 * is a review. An empty artifact is no review either; review.ts cannot produce one, but a reader
 * must never advance on a file it could not read.
 */
export function reviewWroteFindings(reviewMd: string): boolean {
  return reviewMd.trim().length > 0 && reviewSkipReason(reviewMd) === null;
}

/** True when one axis' section body is that axis' failure rather than a review of it. */
export function isReviewError(body: string): boolean {
  return body.trimStart().startsWith(REVIEW_ERROR);
}

/** One failed axis' reason, stripped of the marker; "" when the body is not a failure. */
export function reviewErrorDetail(body: string): string {
  return isReviewError(body) ? body.trimStart().slice(REVIEW_ERROR.length).trim() : "";
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
 * Record the range's base: the Target's recorded position, before anything is merged.
 *
 * A Target with no recorded position behaves as every run did before the position existed - the base
 * is Main's tip as this run finds it, and this is where the Target starts recording, through
 * `positionToOpenOn` (review-position.ts). The opening node is where this runs, so the base is one
 * commit per run, taken before any merge the run can make - and the repair it runs just before this
 * neither moves Main nor makes a commit, so the order does not change the base.
 */
export function writeReviewBase(target: string, artifactsDir: string): string {
  mkdirSync(artifactsDir, { recursive: true });
  const base = positionToOpenOn(target);
  writeArtifact(join(artifactsDir, REVIEW_BASE_REL), base);
  return base;
}
