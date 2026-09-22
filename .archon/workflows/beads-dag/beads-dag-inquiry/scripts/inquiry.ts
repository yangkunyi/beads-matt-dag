/**
 * The inquiry executor's frontier vocabulary, and the premises it opens on.
 *
 * The domain is the questions: an issue of the store's `decision` type carrying the flow's word for the
 * reading leg. The labels that gate the frontier live here - the leg label, the map's own label - so the
 * pick, the repair and the report cannot spell those two ways. The landing's own label and the paths a
 * reading writes live in the reading include: that folder owns them, and this one imports them.
 *
 * The two premises are the Target's, not the store's: the reading tools are a copy the Target makes
 * (`tools/inquiry/`, the flow's own repository holds the original), and the efforts live under `.scratch/`
 * - the directory every question's body is published into and the corpus is written into. Both are
 * refused loudly at the opening node, so "nothing happened" is distinguishable from "the run could not
 * start". The pack ships neither: copying the tools in is the whole distribution story.
 */
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { EFFORT_ROOT_REL } from "../../beads-dag-read/scripts/reading.ts";

/** The reading gate: `bd set-state <id> leg=research` writes this label as the fast cache. */
export const READING_LEG_LABEL = "leg:research";

/** The grilling leg: `bd set-state <id> leg=grilling`. A reading run leaves these claims alone. */
export const GRILL_LABEL = "leg:grilling";

/** A map is a pinned decision. It is a direction, not a ticket. */
export function isMapContainer(issue: { status: string }): boolean {
  return issue.status === "pinned";
}

export function hasReadingLeg(issue: { labels: readonly string[] }): boolean {
  return issue.labels.includes(READING_LEG_LABEL);
}

/** The Target's copy of the reading tools, relative to it. Copied in, never installed. */
export const READING_TOOLS_REL = join("tools", "inquiry");

/** Whether a path names a directory that is there; a file where a directory belongs is not the premise. */
function isDirectory(path: string): boolean {
  if (!existsSync(path)) return false;
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/**
 * The reading premises, refused loudly and before anything is claimed or repaired: the Target has the
 * reading tools, and it has an effort area. Both names are absolute, so the operator sees exactly which
 * path was missing and where the run looked.
 */
export function preflightReading(target: string): void {
  const tools = join(target, READING_TOOLS_REL);
  if (!isDirectory(tools)) {
    throw new Error(
      `no reading tool directory: ${tools} is missing; the reading tools are a copy the Target makes - ` +
        `bun and curl are all they need, and the flow's own repository holds the original at ${READING_TOOLS_REL}/ - ` +
        "copy the directory into the Target, there is nothing to install",
    );
  }
  const efforts = join(target, EFFORT_ROOT_REL);
  if (!isDirectory(efforts)) {
    throw new Error(
      `no effort directory: ${efforts} is missing; a Target keeps its efforts under ${EFFORT_ROOT_REL}/<effort>/, ` +
        "one directory per effort holding the published bodies and the corpus a reading writes - " +
        "publish a question ticket's body under it (or make the directory) before a reading run can start",
    );
  }
}
