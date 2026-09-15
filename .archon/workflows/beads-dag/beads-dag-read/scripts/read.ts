/**
 * One question, read and landed.
 *
 * This is the per-ticket node `beads-dag-inquiry` fans out over its pick, one instance per handle (the
 * `executeIssue` seam the drain uses, for the reading domain). It runs one agent turn under the `read`
 * role - persona, session key, brief and wall clock all from the role table - and then lands what the
 * turn produced in one fixed order:
 *
 *   1. the reading turn itself, in the Target, with the store read-only;
 *   2. the turn's answer is the draft answer - a turn that produced no text produced no draft, and the
 *      reading has not landed;
 *   3. the note file is checked for existence at the path derived from the ticket's own names. The note is
 *      the record of a reading: a turn that wrote no note failed, whatever it said;
 *   4. the documents (the effort's `sources/` and the note) are committed to the Target's current branch
 *      as **one path-scoped commit** under the Main lock, subject `read: <handle> <slug>`;
 *   5. the draft answer becomes a comment on the ticket, its first line marked `draft` and naming the
 *      note's path and the commit;
 *   6. in the same act, the `answer:draft` label is added and the status goes back to `open` - one store
 *      command, because nobody is reading the question any more and the label must state a fact that is
 *      true when it is written.
 *
 * Any step failing before 4 is an ordinary failed attempt: the reason as a comment (`attempt N failed:
 * <reason>`, the drain's convention with its ordinal), the ticket back to `open`, no draft label, and
 * nothing committed. What fails after 4 is not a failure the run can undo - the reading landed - and the
 * one residual the spec names is a kill between the comment and the label, which the next opening node
 * repairs as "did not land" (leftovers.ts).
 *
 * Two things this node deliberately does not do. It never closes a question ticket: a question's `closed`
 * means its answer is written, which is a session's act on the operator's word, and this executor's writes
 * are documents, claims and draft answers. And it never writes the store as a worker would: the reading
 * turn runs with `BD_READONLY=1` (roles.ts, worker-env.ts), so the reader itself cannot claim, comment or
 * close - the store's writes in this executor are this node's, after the turn.
 *
 * Beside the landing, the node keeps the one thing about a reading that only this process can see: what
 * the turn wrote under the effort that the flow does not commit (the claims file `note.ts` is handed, a
 * working note). The effort's working tree is read before the turn and again at every exit, and the
 * difference - what this turn wrote that the commit did not land - goes into the run's record
 * (`UNNAMED_PATHS_FILE`, inquiry.ts) for the report to name. A path that was already lying there before
 * this run is not this run's, and a turn that failed names its leftovers all the same: the spec's rule is
 * about what the run wrote, not about what landed.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { defaultAgent, type AgentRunner } from "../../beads-dag-drain/scripts/agent.ts";
import { loadConfig, type PackConfig } from "../../beads-dag-drain/scripts/config.ts";
import { commitDocuments, documentSubject, uncommittedUnder } from "../../beads-dag-drain/scripts/doc-commit.ts";
import { revParse } from "../../beads-dag-drain/scripts/git.ts";
import { bodyPath, issueNames } from "../../beads-dag-drain/scripts/naming.ts";
import { runNode } from "../../beads-dag-drain/scripts/node-entry.ts";
import { FAILED, LANDED, nodeLine } from "../../beads-dag-drain/scripts/node-outcomes.ts";
import { roleAgent } from "../../beads-dag-drain/scripts/roles.ts";
import {
  commentIssue,
  issueByHandle,
  openIssueWithLabel,
  preflightStore,
  recordFailedAttempt,
} from "../../beads-dag-drain/scripts/store.ts";
import { DRAFT_LABEL, draftLine, readingPaths, recordUnnamedPaths } from "../../beads-dag-inquiry/scripts/inquiry.ts";

/** What one reading node needs: where to write, and the runner/seam a test replaces. */
export type ReadOpts = {
  artifactsDir: string;
  /** The Target's config. Unset, the Target's own file is read. */
  config?: PackConfig;
  /** The runner this reading spends. A run takes the pack's own; a test hands in a stub. */
  runAgent?: AgentRunner;
};

/**
 * Read one question and land what the reading found, in the order above. Returns the node's token:
 * `landed` when the draft answer, the label and the commit are all there, `failed` when the attempt did
 * not land (the reason is on the ticket and on stderr).
 */
export async function readQuestion(target: string, issueHandle: string, opts: ReadOpts): Promise<string> {
  const config = opts.config ?? loadConfig(target).config;
  const store = preflightStore(target, config);
  // The question itself, by the handle pick printed: the slug is half of the note's path and of the
  // commit's subject, and the store is the only place it is. A handle that names no question fails here,
  // before a turn is spent.
  const issue = issueByHandle(store, target, issueHandle);
  const names = issueNames(issue);
  const paths = readingPaths(names);
  const runAgent = opts.runAgent ?? defaultAgent;

  /**
   * What the effort held uncommitted before the turn. The reading's own leftovers are the difference, so
   * a file an earlier run or the operator left in the effort is never named as this turn's.
   */
  const before = new Set(uncommittedUnder(target, paths.corpusRel));

  /**
   * What this turn wrote under the effort that the commit will not land, recorded for the report. Called
   * at every exit, `committed` being the files the commit took - empty when no commit happened, so a
   * failed turn's leftovers are named exactly like a landed reading's.
   */
  const recordLeftBehind = (committed: readonly string[]): void => {
    recordUnnamedPaths(opts.artifactsDir, {
      id: issue.id,
      handle: names.handle,
      paths: uncommittedUnder(target, paths.corpusRel).filter(
        (path) => !before.has(path) && !committed.includes(path),
      ),
    });
  };

  /**
   * The attempt did not land. The reason is recorded on the question - `attempt N failed: <reason>` as a
   * comment, and the question back to `open` - so the next reading run retries it knowingly; the node
   * reports `failed` and the run goes on to the other questions in its batch.
   */
  const didNotLand = (reason: string): string => {
    recordFailedAttempt(store, target, issue.id, reason);
    console.error(`${names.handle}: ${reason}`);
    return FAILED;
  };

  const turn = await runAgent(
    roleAgent({
      role: "read",
      args: {
        handle: names.handle,
        bodyPath: bodyPath(target, names),
        corpusRel: paths.corpusRel,
        noteRel: paths.noteRel,
      },
      // The turn runs in the Target, not in a worktree: a reading touches no branch of its own, and its
      // whole product is the corpus and the note under `.scratch/`.
      cwd: target,
      artifactsDir: opts.artifactsDir,
      config,
    }),
  );
  console.error(`${names.handle}: read session ${turn.sessionFile}`);

  // The turn's answer is the draft answer the comment is built from, and a reading that did not speak has
  // nothing to put on the ticket: the runner's own reason is what the question records.
  if (turn.answer.kind !== "text") {
    recordLeftBehind([]);
    return didNotLand(turn.lastError ?? "the reading turn produced no draft answer");
  }
  // The note is the record of a reading, and its path is derived, never discovered. Both checks sit
  // before the commit on purpose: a reading that did not land must leave nothing half-landed.
  if (!existsSync(join(target, paths.noteRel))) {
    recordLeftBehind([]);
    return didNotLand(`the reading wrote no note at ${paths.noteRel}`);
  }

  let commit: string;
  try {
    const result = await commitDocuments(target, {
      subject: documentSubject("read", names.handle, names.slug),
      paths: [paths.sourcesRel, paths.noteRel],
    });
    recordLeftBehind(result.landed);
    // Nothing to commit is not a failure: a re-read whose bytes are exactly the ones HEAD holds has
    // already landed, and the commit that carries the note is the one HEAD names. Naming it keeps the
    // comment's first line true - it always names the commit the note is in.
    commit = result.commit ?? revParse(target);
  } catch (e) {
    recordLeftBehind([]);
    return didNotLand(
      `the reading's documents could not be committed: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  commentIssue(store, target, issue.id, `${draftLine(paths.noteRel, commit)}\n\n${turn.answer.text.trim()}`);
  // One store command, and it is this node's last act for the question: the claim is released and the
  // label lands together. Steps from here on are not failures the node can undo - the reading landed.
  openIssueWithLabel(store, target, issue.id, DRAFT_LABEL);
  console.error(`${names.handle}: draft answer landed (${paths.noteRel} at ${commit})`);
  return LANDED;
}

if (import.meta.main) {
  await runNode({
    issue: true,
    artifacts: true,
    run: async ({ target, issueHandle, artifactsDir, config }) =>
      nodeLine(await readQuestion(target, issueHandle, { artifactsDir, config })),
  });
}
