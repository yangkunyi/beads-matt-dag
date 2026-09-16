/**
 * The experiment record: its path, its shape, and the completeness check that closes a ticket.
 *
 * `closed` on an experiment ticket means the result is recorded (ADR-0006). That is a completeness
 * check, not a judgement, and it lives here so the document's shape and the node's check cannot spell
 * the same rule two ways. A record is complete when it exists at the ticket's own path, holds an
 * attempts-table row, and holds the four closing lines, each identified by its literal label:
 * `measured:`, `reference:`, `covered:`, `reading:`. Missing anything is named as
 * `record incomplete — <what is missing>`; only a complete record closes.
 *
 * The unread marker is the record's `reading:` line plus a `reading:none` label stamped in the same
 * act as the close. Clearing it is one act too: the line takes the operator's words, the label comes
 * off, a comment is appended.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadConfig, type PackConfig } from "../../scripts/config.ts";
import type { IssueNames } from "../../scripts/naming.ts";
import { commentIssue, preflightStore, removeLabel } from "../../scripts/store.ts";

/** The four closing-line labels. The document's shape and the check are this list. */
export const RECORD_CLOSING_LABELS = ["measured:", "reference:", "covered:", "reading:"] as const;

/** The store label stamped in the same act as the close: a recorded result nobody has read. */
export const READING_NONE_LABEL = "reading:none";

/** The unread marker's value on a freshly closed record. */
export const READING_NONE_YET = "none yet";

/**
 * The record one ticket owns: `.scratch/<feature>/results/<NN>-<slug>.md`. Derived from the issue's
 * own names, never discovered - a ticket whose handle or slug cannot name a file has already been
 * refused, and a record written anywhere else is a record the check will not find.
 */
export function experimentRecordRel(names: IssueNames): string {
  const feature = names.handle.split("/")[0]!;
  const number = names.handle.split("/")[1]!;
  return join(".scratch", feature, "results", `${number}-${names.slug}.md`);
}

/** The first line of a closed record's comment: the record's path, and the commit that carries it. */
export function recordedLine(recordRel: string, commit: string): string {
  return `recorded: ${recordRel} (commit ${commit})`;
}

/** A markdown table separator: `| --- | --- |`, with optional alignment colons. */
function isTableSeparator(line: string): boolean {
  return /^\s*\|[\s|:-]+\|\s*$/.test(line);
}

/** A markdown table row that is not a separator: a header or a data row. */
function isTableRow(line: string): boolean {
  return /^\s*\|/.test(line) && !isTableSeparator(line);
}

/**
 * Whether the text holds an attempts-table row: a markdown table with a header and at least one data
 * row. The check is mechanical - a pipe-row count - so it cannot be satisfied by a sentence that
 * mentions a table.
 */
export function hasAttemptsRow(text: string): boolean {
  return text.split("\n").filter(isTableRow).length >= 2;
}

/** Whether a closing line identified by its literal label is present, at the start of a line. */
export function hasClosingLabel(text: string, label: (typeof RECORD_CLOSING_LABELS)[number]): boolean {
  return text.split("\n").some((line) => line.trimStart().startsWith(label));
}

/**
 * What a record that exists is still missing. Empty means complete. The file itself is the caller's
 * to name: a missing file is the path, not a reading of contents that are not there.
 */
export function missingFromRecord(text: string): string[] {
  const missing: string[] = [];
  if (!hasAttemptsRow(text)) missing.push("attempts-table row");
  for (const label of RECORD_CLOSING_LABELS) {
    if (!hasClosingLabel(text, label)) missing.push(label);
  }
  return missing;
}

/**
 * The completeness check: the record at `recordRel` under the Target, or the list of what is missing.
 *
 * A missing file is that path, and nothing else is named - there is no table and no label to find in
 * a file that is not there. An existing file is read for a row and the four labels. The reason the
 * node comments is `record incomplete — ` plus this list, joined with `, `.
 */
export function inspectRecord(target: string, recordRel: string): string[] {
  const path = join(target, recordRel);
  if (!existsSync(path)) return [recordRel];
  return missingFromRecord(readFileSync(path, "utf8"));
}

/** Rewrite the record's `reading:` line; append one if the file has none. */
function setReadingLine(text: string, reading: string): string {
  const line = `reading: ${reading}`;
  const lines = text.split("\n");
  let found = false;
  const next = lines.map((row) => {
    if (row.trimStart().startsWith("reading:")) {
      found = true;
      return line;
    }
    return row;
  });
  if (found) return next.join("\n");
  const body = text.endsWith("\n") || text === "" ? text : `${text}\n`;
  return `${body}${line}\n`;
}

/**
 * Clear the unread marker in one act: the record's `reading:` line takes the operator's words, the
 * `reading:none` label comes off, a comment is appended. The sweep (`bd list -t experiment -s closed
 * -l reading:none`) is empty for this ticket afterwards. The record change is a document; committing
 * it is the session's.
 */
export function clearUnreadMarker(
  target: string,
  id: string,
  recordRel: string,
  reading: string,
  config?: PackConfig,
): void {
  const store = preflightStore(target, config ?? loadConfig(target).config);
  const path = join(target, recordRel);
  writeFileSync(path, setReadingLine(readFileSync(path, "utf8"), reading));
  removeLabel(store, target, id, READING_NONE_LABEL);
  commentIssue(store, target, id, `reading: ${reading}`);
}
