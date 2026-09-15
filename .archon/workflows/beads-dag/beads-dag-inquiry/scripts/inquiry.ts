/**
 * The inquiry domain's vocabulary, and the premises the reading executor opens on.
 *
 * The domain is the questions: an issue of the store's `decision` type carrying the flow's word for the
 * reading leg. Everything this executor reads or writes about those tickets is named once here - the leg
 * label that gates the frontier, the map's own label, the draft label a landed reading stamps - so the
 * frontier, the repair and the reading turn (#24) cannot spell the same word two ways.
 *
 * The two premises are the Target's, not the store's: the reading tools are a copy the Target makes
 * (`tools/inquiry/`, the flow's own repository holds the original), and the efforts live under `.scratch/`
 * - the directory every question's body is published into and the corpus is written into. Both are
 * refused loudly at the opening node, so "nothing happened" is distinguishable from "the run could not
 * start". The pack ships neither: copying the tools in is the whole distribution story.
 */
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * The leg label that gates this executor's frontier, the role `ready-for-agent` plays for the drain: a
 * question nobody has labelled for a reading is not the reading executor's work. It is the flow's
 * existing word for the leg (`wayfinder:<research|prototype|grilling|task>`), so no new vocabulary.
 */
export const READING_LEG_LABEL = "wayfinder:research";

/**
 * The map's own label. A map is a container, not a ticket, and it never leaves the frontier as one - even
 * though requiring the leg label already excludes it, so that the exclusions report can name the map by
 * the reason that is about maps rather than by "no reading label".
 */
export const MAP_LABEL = "wayfinder:map";

/**
 * What a landed reading stamps on its ticket, in the same act as the status going back to `open`. It is
 * what keeps a batch run safe - a ticket whose reading landed is no longer in the frontier - and what the
 * session's sweep lists (`bd list -t decision -s open -l answer:draft`).
 */
export const DRAFT_LABEL = "answer:draft";

/** The Target's copy of the reading tools, relative to it. Copied in, never installed. */
export const READING_TOOLS_REL = join("tools", "inquiry");

/**
 * The directory the Target's efforts live under, relative to it: every effort is `.scratch/<effort>/`,
 * holding the published bodies (`issues/`), the corpus (`sources/`, `notes/`) and, for the other
 * executor, the records (`results/`).
 *
 * This is the run-level effort directory, and it is the root on purpose: a run's questions may be
 * published under any effort, so `<effort>` is not one name the opening node could test - the corpus
 * directory a reading turn writes into is derived per ticket from the handle's feature (#24), where the
 * naming rule already lives. What open can and does test is that the Target has an effort area at all.
 */
export const EFFORT_ROOT_REL = ".scratch";

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
