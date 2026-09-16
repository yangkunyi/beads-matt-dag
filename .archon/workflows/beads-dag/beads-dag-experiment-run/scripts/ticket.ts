/**
 * The experiment domain's own names, spelled once for the executor.
 *
 * `domains.ts` (the drain's) already knows the type is a non-work one; what it does not hold is the two
 * facts this executor needs to name things: the label a runnable ticket carries, and the **run's name**.
 *
 * The run's name is `<NN>-<slug>` — the record's own basename at
 * `.scratch/<effort>/results/<NN>-<slug>.md`, and the name the queue reserves. That is the one identity
 * the record and the run cannot disagree about: a ticket whose handle or slug cannot name a file cannot
 * name a run either, and fails here rather than queueing one nobody can find.
 *
 * The run's **identity** — the word in the store's assignee field — is a different thing: the executor's
 * own run, `beads-dag-experiment/<run-id>`, so a session that reads the ticket sees a run and not a
 * person. One ticket's run name names the bytes; the executor's identity names the process that claimed
 * them, and several tickets worked by one executor run carry the same identity.
 */
import { basename } from "node:path";

/** The store type an experiment ticket carries. `domains.ts` excludes it from every drain. */
export const EXPERIMENT_TYPE = "experiment";

/** The label that makes experiment tickets one filter (`bd list -l experiment`). Never the gate label. */
export const EXPERIMENT_LABEL = "experiment";

/** The assignee's prefix: the flow's own run, not a person's name. */
export const RUN_IDENTITY_PREFIX = "beads-dag-experiment";

/** A handle is `<feature>/<NN>`, exactly the shape `naming.ts` requires before it derives a git name. */
const HANDLE = /^([A-Za-z0-9_][A-Za-z0-9._-]*)\/([A-Za-z0-9_][A-Za-z0-9._-]*)$/;

/** A slug is what can be pasted into a file name: one path segment, no slashes and no whitespace. */
const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * The ticket's run name: `<NN>-<slug>`, derived from the two metadata keys the tracker publishes.
 *
 * It is the record's basename and the name the queue reserves, so the check is the same one a file name
 * needs — an issue the store cannot name in a path is an issue the executor cannot run. The message
 * names the issue, because a ticket missing either key is the operator's to fix in the store.
 */
export function runName(issue: { id: string; handle: string | undefined; slug: string | undefined }): string {
  const parts = issue.handle === undefined ? null : HANDLE.exec(issue.handle);
  if (!parts) {
    throw new Error(
      `issue ${issue.id} carries ${issue.handle === undefined ? "no handle" : `handle ${JSON.stringify(issue.handle)}`}: ` +
        "the tracker publishes \"handle\" (<feature>/<NN>) with every issue, and a run's name is derived from it",
    );
  }
  if (issue.slug === undefined || !SLUG.test(issue.slug)) {
    throw new Error(
      `issue ${issue.id} carries ${
        issue.slug === undefined ? "no slug" : `slug ${JSON.stringify(issue.slug)}`
      }: the tracker publishes "slug" with every issue, and the run's name and the record's path end with it`,
    );
  }
  return `${parts[2]}-${issue.slug}`;
}

/**
 * The run's own identity, as the store's assignee field carries it.
 *
 * `run-id` is the basename of the run's artifacts directory — Archon's per-run
 * `artifacts/runs/<run-id>/`, the identity the run lock also names — so a session looking at the ticket
 * can find the run that holds it by `archon workflow status`, and never mistakes the claim for a person.
 */
export function runIdentity(artifactsDir: string): string {
  return `${RUN_IDENTITY_PREFIX}/${basename(artifactsDir)}`;
}
