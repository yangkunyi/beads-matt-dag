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
 *
 * One block here is not vocabulary but the run's own record: the paths a reading wrote that the flow does
 * not name - written by the read node, read by the report (`UNNAMED_PATHS_FILE`), and kept here because
 * both sides have to spell the file and its shape the same way.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { IssueNames } from "../../scripts/naming.ts";

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
 * directory a reading turn writes into is derived per ticket from the handle's feature (`readingPaths`
 * below), where the naming rule already lives. What open can and does test is that the Target has an
 * effort area at all.
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

/** The paths one question's reading owns: the corpus it writes into, and the note the run commits. */
export type ReadingPaths = {
  /** The handle's feature: the effort directory the corpus lives under. */
  feature: string;
  /** `.scratch/<feature>` — the corpus directory handed to the reader. */
  corpusRel: string;
  /** `.scratch/<feature>/sources` — the receipts, one per source the reading fetched. */
  sourcesRel: string;
  /** `.scratch/<feature>/notes/<slug>.md` — the note, whose file name is the ticket's slug. */
  noteRel: string;
};

/**
 * Derive the reading's paths from the issue's own names, and nothing else: the effort is the handle's
 * feature (`beads-dag/24` reads into `.scratch/beads-dag/`), the corpus is that effort's directory, and
 * the note's file name is the ticket's slug.
 *
 * The names are the validated ones (`issueNames`, naming.ts): a handle or a slug that cannot name a file
 * has already been refused there, so a question whose metadata cannot say where its note belongs fails
 * before a turn is spent, instead of writing a corpus nobody can find again. Discovery is out of the
 * question - the note's path is computed, exactly as the body's is.
 */
export function readingPaths(names: IssueNames): ReadingPaths {
  const feature = names.handle.split("/")[0]!;
  const corpusRel = join(EFFORT_ROOT_REL, feature);
  return {
    feature,
    corpusRel,
    sourcesRel: join(corpusRel, "sources"),
    noteRel: join(corpusRel, "notes", `${names.slug}.md`),
  };
}

/**
 * The first line of a landed reading's comment: the marker that says this is a draft, the note's path,
 * and the commit that carries it. The reading's own words follow it, and a session's final answer is
 * appended under them - so the first line is what a reader (or a query) sees first, and it names the two
 * things the landing produced: the note and the commit.
 */
export function draftLine(noteRel: string, commit: string): string {
  return `draft: ${noteRel} (commit ${commit})`;
}

/**
 * The line `draftLine` writes, as the report reads it back: one producer and one consumer, so the two
 * cannot spell a landing two ways. The path is `\S+` because every path this flow hands the reader is
 * made of segments that cannot hold a space (the handle and the slug are validated in naming.ts), and
 * the commit is whatever `git rev-parse` answered with - 40 hex digits, 64 in a sha256 repository.
 */
const DRAFT_LINE = /^draft: (\S+) \(commit ([0-9a-f]{7,64})\)$/;

/** Where one landed reading is, as its comment names it. */
export type LandedDraft = { noteRel: string; commit: string };

/** The landing one comment records, or undefined when that comment is not a landing. */
function readDraftLine(comment: string): LandedDraft | undefined {
  const first = comment.split("\n", 1)[0] ?? "";
  const m = DRAFT_LINE.exec(first.trim());
  return m === null ? undefined : { noteRel: m[1]!, commit: m[2]! };
}

/**
 * The landing a question's comment thread holds: the latest draft line, because a question read twice
 * leaves two of them (the residual the spec names - a run killed between the comment and the label) and
 * the newest is the reading that landed. Undefined when no comment names a landing, which is a state the
 * report says out loud rather than guessing at.
 */
export function landedDraft(comments: readonly string[]): LandedDraft | undefined {
  let found: LandedDraft | undefined;
  for (const comment of comments) {
    const draft = readDraftLine(comment);
    if (draft !== undefined) found = draft;
  }
  return found;
}

/**
 * What one reading wrote that the flow does not name, as the run leaves it for its report.
 *
 * A reading writes documents the flow names - the receipts, the note - and the node commits exactly
 * those. It also writes whatever a reading needs on the way (the claims file `note.ts` is handed, a
 * working note), and none of that is a document: committing it would put a reader's scratch in Main, and
 * leaving it silently is what the spec refuses - "a path the run wrote that the flow does not name is
 * left uncommitted and **named in the run's report**". The store cannot answer it, and neither can the
 * commit: the run is the only thing that saw the working tree before the turn and after it, so the read
 * node writes what it found here, beside `attempted-ids.json` and `repairs.json`, and the report is what
 * says it out loud. Nothing reads it back as state (ADR-0005).
 *
 * One line per ticket, appended: a batch reads its questions at once, and an append is the one write two
 * nodes can make to one file without losing each other's. The report keeps the last line per ticket.
 */
export const UNNAMED_PATHS_FILE = "unnamed-paths.jsonl";

/** One ticket's unnamed paths: what a reading left that the flow will not commit. */
export type UnnamedPaths = { id: string; handle: string; paths: string[] };

/**
 * Record what one reading left behind. Nothing to record writes nothing: a reading that left no unnamed
 * path has no row in the report, and an empty row would read as a ticket with a problem it does not have.
 */
export function recordUnnamedPaths(artifactsDir: string, entry: UnnamedPaths): void {
  if (entry.paths.length === 0) return;
  mkdirSync(artifactsDir, { recursive: true });
  appendFileSync(join(artifactsDir, UNNAMED_PATHS_FILE), `${JSON.stringify(entry)}\n`);
}

/**
 * The run's unnamed paths, one entry per ticket, in the order the tickets were read. A line that cannot
 * be read is skipped rather than failing the report: this is run bookkeeping, and a report with one row
 * missing is better than no report - the same reading `attempted.ts` takes of its own file.
 */
export function readUnnamedPaths(artifactsDir: string): UnnamedPaths[] {
  const path = join(artifactsDir, UNNAMED_PATHS_FILE);
  if (!existsSync(path)) return [];
  const byId = new Map<string, UnnamedPaths>();
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (line.trim() === "") continue;
    try {
      const raw: unknown = JSON.parse(line);
      const entry = raw as Partial<UnnamedPaths>;
      if (typeof entry.id !== "string" || typeof entry.handle !== "string" || !Array.isArray(entry.paths)) continue;
      const paths = entry.paths.filter((p): p is string => typeof p === "string");
      if (paths.length === 0) continue;
      byId.set(entry.id, { id: entry.id, handle: entry.handle, paths });
    } catch {
      continue;
    }
  }
  return [...byId.values()];
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
