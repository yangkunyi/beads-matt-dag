/**
 * The naming rule: everything git needs to know about an issue is derived from the issue's two
 * metadata keys, `handle` (`<feature>/<NN>`) and `slug`.
 *
 * The bead's own id never appears in git, so the store can be restored or rewritten without
 * invalidating the code's history; the handle and the slug are what the tracker publishes and what
 * every git name comes from. Derivation is the point: a name is computed, never discovered. Nothing
 * here - or above it - lists a directory looking for a candidate, and an issue whose metadata cannot
 * name a place fails loudly rather than starting work somewhere nobody can name.
 *
 * One issue, one set of names, one function. The branch and the worktree cannot drift apart,
 * because nothing else spells them. The brief is the bead's `description`, not a path.
 */
import { join } from "node:path";

/** An issue's identity, as the store reports it: the pack reads these three fields off an issue. */
export type IssueIdentity = {
  id: string;
  handle: string | undefined;
  slug: string | undefined;
};

/** Every git name one issue has. */
export type IssueNames = {
  /** `<feature>/<NN>`, the handle the names derive from. */
  handle: string;
  /** The one path segment every name ends with: the issue's own slug, validated here. */
  slug: string;
  /** The branch the issue's work is committed on, and what the settlement merges into Main. */
  branch: string;
  /** The worktree's directory, relative to the Target. */
  worktreeRel: string;
};

/**
 * A handle is `<feature>/<NN>`: exactly one slash, no whitespace, and two segments that are safe to
 * paste into a git ref and a filesystem path. `..` and a leading dot are rejected for that reason - a
 * name that could climb out of the Target is not a name this rule may hand to git or to the body path.
 */
const HANDLE = /^([A-Za-z0-9_][A-Za-z0-9._-]*)\/([A-Za-z0-9_][A-Za-z0-9._-]*)$/;

/** A slug is what can be pasted into a branch, a directory and a file name: one path segment. */
const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function requireHandle(issue: IssueIdentity): { handle: string; feature: string; number: string } {
  if (issue.handle === undefined) {
    throw new Error(
      `issue ${issue.id} carries no handle metadata: the tracker publishes "handle" (<feature>/<NN>) ` +
        "with every issue, and every git name derives from it",
    );
  }
  const parts = HANDLE.exec(issue.handle);
  if (!parts) {
    throw new Error(`issue ${issue.id} carries handle ${JSON.stringify(issue.handle)}, which is not <feature>/<NN>`);
  }
  return { handle: issue.handle, feature: parts[1]!, number: parts[2]! };
}

function requireSlug(issue: IssueIdentity): string {
  if (issue.slug === undefined) {
    throw new Error(
      `issue ${issue.id} carries no slug metadata: the tracker publishes "slug" with every issue, and ` +
        "the branch, the worktree and the body's path all derive from it",
    );
  }
  if (!SLUG.test(issue.slug)) {
    throw new Error(
      `issue ${issue.id} carries slug ${JSON.stringify(issue.slug)}, which cannot name a branch, a worktree or a file`,
    );
  }
  return issue.slug;
}

/** The issue's whole identity in git, derived from the two metadata keys and from nothing else. */
export function issueNames(issue: IssueIdentity): IssueNames {
  const { handle, feature, number } = requireHandle(issue);
  const slug = requireSlug(issue);
  return {
    handle,
    slug,
    branch: `beads/${feature}/${number}-${slug}`,
    worktreeRel: join("worktrees", `${feature}-${number}-${slug}`),
  };
}

/** The brief is the bead's description. A missing description is not a file to go looking for. */
export function issueBrief(issue: { id: string; description?: string }): string {
  const text = issue.description ?? "";
  if (text.trim() === "") {
    throw new Error(`issue ${issue.id} has no description; the brief lives on the bead, not in a file`);
  }
  return text;
}
