/**
 * The document commit: a run's own documents land on the Target's branch, one commit per ticket.
 *
 * Two executors write documents and merge nothing - a reading's receipts and note, an experiment's record
 * and collected numbers - so landing them is a seam of its own and not part of what the drain does to
 * Main. That is why this module lives beside `git.ts` rather than inside `main-writes.ts`: nothing here
 * merges a branch, and nothing there commits a document.
 *
 * Three rules, each the spelling of a fact this flow has already learned:
 *
 * - **only the paths the run names.** The commit passes them as pathspecs (`git commit -- <paths>`), never
 *   `-a` and never the index wholesale, so a session's staged work survives the commit untouched - the
 *   accident this rule exists for already happened once in this repository.
 * - **one commit per ticket, with the domain's word.** The caller lands one ticket's documents in one
 *   call, and `documentSubject` spells the subject: `read: <handle> <slug>`, `record: <handle> <slug>`.
 * - **the Main lock.** The commit writes the Target's branch, so it goes through `withMainLock` and two
 *   writers cannot interleave, whatever kind of run they are. The lock is taken and released here, around
 *   the commit alone; a caller that already holds it joins the same transaction.
 *
 * Nothing to commit is not an error: a named path the run did not write - absent, or already holding
 * exactly these bytes at HEAD - is left out and reported in `unchanged`, and when every named path is
 * like that there is no commit and the call still returns cleanly. A path the run wrote that the flow did
 * not name is never committed: this module sees only the list it is handed, and the run's report is what
 * says what was left behind. A named path the Target ignores fails loudly instead, because nothing
 * written there can ever land.
 */
import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { git, gitOrThrow, revParse } from "./git.ts";
import { withMainLock } from "./lock.ts";

/** The two domains that land documents: a reading's commit, and an experiment's. */
export type DocumentVerb = "read" | "record";

/** The subject one ticket's document commit carries: `<verb>: <handle> <slug>`. */
export function documentSubject(verb: DocumentVerb, handle: string, slug: string): string {
  return `${verb}: ${handle} ${slug}`;
}

/** What one call lands: the ticket's subject, and the paths the run wrote for it. */
export type DocCommitRequest = {
  /** The commit subject - the domain's verb and the ticket's names. */
  subject: string;
  /** The paths the run wrote, relative to the Target's root. A directory is allowed. */
  paths: string[];
};

/** What one call did, for the run's report. */
export type DocCommitResult = {
  /** True when a commit was made; false when every named path already held exactly these bytes. */
  committed: boolean;
  /** The commit that landed, when one did. */
  commit?: string;
  /** The files the commit holds, in the order the named paths were read. */
  landed: string[];
  /** The named paths that held nothing to commit. */
  unchanged: string[];
};

/**
 * The named paths, deduplicated and checked. A path is relative to the Target - every git call runs with
 * `-C <target>` - and may not escape it: a `..` or an absolute path in a commit pathspec would commit
 * something nobody named.
 */
function documentPaths(paths: string[]): string[] {
  const named: string[] = [];
  const seen = new Set<string>();
  for (const raw of paths) {
    const path = raw.trim();
    if (path === "") throw new Error("doc-commit: an empty path names nothing");
    if (isAbsolute(path)) {
      throw new Error(`doc-commit: ${path} is absolute; a document path is relative to the Target`);
    }
    if (path.split("/").includes("..")) throw new Error(`doc-commit: ${path} escapes the Target`);
    if (seen.has(path)) continue;
    seen.add(path);
    named.push(path);
  }
  return named;
}

/** One entry of `git status --porcelain -z`: the two status letters and the path that follows them. */
type StatusEntry = { code: string; path: string };

/**
 * Parse `git status --porcelain -z`. Each entry is `XY <path>` terminated by NUL, and a rename or a copy
 * appends the original path as a codeless field after it - skipped here, never read as a path the run
 * wrote.
 */
function statusEntries(out: string): StatusEntry[] {
  const entries: StatusEntry[] = [];
  const fields = out.split("\0");
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]!;
    if (field === "") continue;
    const code = field.slice(0, 2);
    entries.push({ code, path: field.slice(3) });
    if (code[0] === "R" || code[0] === "C") i++;
  }
  return entries;
}

/**
 * The files under one named path that hold something to commit: untracked (`??`), or different from the
 * index in the worktree (the second status column). A path whose only change is already staged is
 * deliberately not one of them - this module commits the run's own bytes, and what another session put in
 * the index is not the run's.
 *
 * `-uall` expands an untracked directory into its files, so what comes back is files a commit can name.
 */
function writtenUnder(target: string, path: string): string[] {
  const r = git(target, ["status", "--porcelain", "-z", "--untracked-files=all", "--", path]);
  if (!r.ok) throw new Error(`git status failed in ${target} for ${path}: ${r.out}`);
  return statusEntries(r.out)
    .filter((entry) => entry.code === "??" || entry.code[1] !== " ")
    .map((entry) => entry.path);
}

/**
 * A named path with nothing to commit that exists on disk is legitimate only when it already holds the
 * bytes HEAD holds. A path the Target ignores is the other case, and then the flow has named a place
 * nothing can land from - a broken premise, refused loudly rather than reported as "nothing to commit".
 */
function refuseIfIgnored(target: string, path: string): void {
  if (!existsSync(join(target, path))) return;
  if (git(target, ["check-ignore", "--quiet", "--", path]).ok) {
    throw new Error(`doc-commit: ${path} is ignored by the Target's git, so nothing written there can be committed`);
  }
}

/**
 * Land one ticket's documents: one commit, the paths the caller names, under the Main lock.
 *
 * The paths are read one at a time, so `landed` and `unchanged` describe what each named path
 * contributed - naming a directory commits its files, and naming something the run did not write says so
 * rather than failing. When nothing under any named path holds a change there is no commit at all.
 */
export async function commitDocuments(target: string, request: DocCommitRequest): Promise<DocCommitResult> {
  const subject = request.subject.trim();
  if (subject === "") throw new Error("doc-commit: a document commit needs a subject");
  const named = documentPaths(request.paths);
  if (named.length === 0) throw new Error("doc-commit: a document commit names at least one path");

  return await withMainLock<DocCommitResult>(target, () => {
    const landed: string[] = [];
    const unchanged: string[] = [];
    const seen = new Set<string>();
    for (const path of named) {
      const written = writtenUnder(target, path);
      if (written.length === 0) {
        refuseIfIgnored(target, path);
        unchanged.push(path);
        continue;
      }
      for (const file of written) {
        if (seen.has(file)) continue;
        seen.add(file);
        landed.push(file);
      }
    }
    if (landed.length === 0) return { committed: false, landed, unchanged };

    // Stage exactly the files this run wrote, then commit with the same pathspec: the index is touched
    // for them alone, and `git commit -- <paths>` takes their worktree bytes - not the index, and never
    // another session's staged entry.
    gitOrThrow(target, ["add", "-A", "--", ...landed]);
    gitOrThrow(target, ["commit", "-m", subject, "--", ...landed]);
    return { committed: true, commit: revParse(target), landed, unchanged };
  });
}
