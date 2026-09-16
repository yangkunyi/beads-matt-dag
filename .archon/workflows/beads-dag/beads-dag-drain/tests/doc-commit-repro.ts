#!/usr/bin/env bun
/**
 * Repro: a run's own documents land as one path-scoped commit, under the Main lock.
 *
 * The module under test is `doc-commit.ts`, and what it has to be is the thing a merge is not: the two
 * document-writing executors land their own files on the Target's current branch, and neither of them may
 * merge an issue. So the evidence here is all git's: the commit's file list is exactly the paths the run
 * named, a file another session staged before the commit is still staged after it, a path the run wrote
 * that the flow did not name stays out, and a named path with nothing to commit is not an error and
 * produces no commit. The Target is a throwaway repository with a real store - the ticket's own handle and
 * slug are what the commit subject is built from - and the last section proves the Main lock by making a
 * second process wait for it.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { commitDocuments, documentSubject } from "../../scripts/doc-commit.ts";
import { isMainLockHeld, lockFilePath, withMainLock } from "../../scripts/lock.ts";
import {
  GATE_LABEL,
  drain,
  expect,
  kernelDir,
  expectEqual,
  expectReject,
  gitC,
  publishIssue,
  storeIssue,
  withTarget,
  writeStoreConfig,
} from "./target.ts";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Wait until the child has said what this test is waiting for, or fail with everything it did say. */
async function until(child: ChildProcess, thought: () => boolean, said: () => string, what: string): Promise<void> {
  const deadline = Date.now() + 20_000;
  while (!thought()) {
    if (child.exitCode !== null) {
      throw new Error(`${what}: the child was gone first, having said ${JSON.stringify(said())}`);
    }
    if (Date.now() > deadline) throw new Error(`${what}: the child said only ${JSON.stringify(said())}`);
    await sleep(20);
  }
}

/** Wait for a child that may already be gone by the time this is called. */
function gone(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) return Promise.resolve();
  return new Promise((resolve) => child.once("exit", () => resolve()));
}

/** The Target's git answer to "what is staged", which is the session's work this commit must not touch. */
function staged(root: string): string[] {
  const out = gitC(root, "diff", "--cached", "--name-only");
  return out === "" ? [] : out.split("\n").sort();
}

try {
  // One ticket's documents land as one commit. The paths are named, so another session's staged work
  // survives untouched, a path the run wrote but the flow did not name stays uncommitted, and the lock is
  // taken and released around the commit alone.
  await withTarget(async (root) => {
    writeStoreConfig(root);
    const issue = publishIssue(root, {
      title: "a reading",
      handle: "feat/07",
      slug: "the-reading",
      labels: [GATE_LABEL],
    });
    const { handle, slug } = storeIssue(root, issue.id).metadata as { handle: string; slug: string };

    // The reading's documents - a receipt and the note - and a file it wrote that no flow names.
    const receipt = join(".scratch", "feat", "sources", "receipt-1.md");
    const note = join(".scratch", "feat", "notes", "07-the-reading.md");
    const stray = join(".scratch", "feat", "notes", "a-note-for-nobody.md");
    for (const [path, body] of [
      [receipt, "the source says ...\n"],
      [note, "# the reading\n"],
      [stray, "not this ticket's document\n"],
    ] as const) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), body);
    }

    // Another session's work, already staged: the commit must not touch it, and its bytes must not enter
    // the commit. This is the accident the pathspec rule exists for.
    writeFileSync(join(root, "README.md"), "another session's staged change\n");
    gitC(root, "add", "README.md");
    const before = Number(gitC(root, "rev-list", "--count", "HEAD"));

    const landed = await commitDocuments(root, {
      subject: documentSubject("read", handle, slug),
      paths: [receipt, note],
    });

    expectEqual("the reading's documents land in one commit", landed.committed, true);
    expectEqual("the commit is the Target's new tip", landed.commit, gitC(root, "rev-parse", "HEAD"));
    expectEqual("one commit, for one ticket", Number(gitC(root, "rev-list", "--count", "HEAD")), before + 1);
    expectEqual("with the domain's word and the ticket's names", gitC(root, "log", "-1", "--format=%s"), "read: feat/07 the-reading");
    expectEqual(
      "naming exactly the paths the run wrote",
      gitC(root, "show", "--name-only", "--format=", "HEAD").split("\n").sort(),
      [note, receipt].sort(),
    );
    expectEqual("and reporting them back", landed.landed.slice().sort(), [note, receipt].sort());
    expectEqual("with nothing named and unwritten", landed.unchanged, []);
    expectEqual("another session's staged work survives the commit", staged(root), ["README.md"]);
    expectEqual("and its staged bytes are not in the commit", gitC(root, "show", "HEAD:README.md"), "x");
    expectEqual("a document the flow did not name is left uncommitted", gitC(root, "ls-files", "--", stray), "");
    expectEqual("and so is the published body", gitC(root, "ls-files", "--", join(".scratch", "feat", "issues", "07-the-reading.md")), "");
    expectEqual("the Main lock is released after the commit", existsSync(lockFilePath(root)), false);
    expectEqual("and this process holds nothing", isMainLockHeld(), false);

    // A named path with nothing to commit - already at HEAD, or never written - is not an error, and when
    // every named path is like that there is no commit at all.
    const never = join(".scratch", "feat", "notes", "99-never-written.md");
    const again = await commitDocuments(root, { subject: documentSubject("read", handle, slug), paths: [receipt, note, never] });
    expectEqual("nothing to commit is not an error", again.committed, false);
    expectEqual("and makes no commit", gitC(root, "rev-parse", "HEAD"), landed.commit);
    expectEqual("with nothing landed", again.landed, []);
    expectEqual("and every named path reported back", again.unchanged.slice().sort(), [note, receipt, never].sort());
    expectEqual("the session's staged file is still staged", staged(root), ["README.md"]);

    // The other domain's word, and one commit per ticket: an experiment's record lands under `record:`.
    const record = join(".scratch", "feat", "results", "07-the-reading.md");
    mkdirSync(dirname(join(root, record)), { recursive: true });
    writeFileSync(join(root, record), "| run | metric |\n");
    const recorded = await commitDocuments(root, { subject: documentSubject("record", handle, slug), paths: [record] });
    expectEqual("an experiment's record lands with its own word", gitC(root, "log", "-1", "--format=%s"), "record: feat/07 the-reading");
    expectEqual("as another commit", recorded.commit, gitC(root, "rev-parse", "HEAD"));
    expectEqual("naming the record alone", gitC(root, "show", "--name-only", "--format=", "HEAD").split("\n"), [record]);
    expectEqual("and the session's staged file is still the session's", staged(root), ["README.md"]);

    // A named path the Target ignores can never hold a landing, so it is refused loudly rather than
    // reported as "nothing to commit".
    writeFileSync(join(root, ".gitignore"), `${readFileSync(join(root, ".gitignore"), "utf8")}/.scratch/feat/ignored/\n`);
    const ignored = join(".scratch", "feat", "ignored", "a-note.md");
    mkdirSync(dirname(join(root, ignored)), { recursive: true });
    writeFileSync(join(root, ignored), "# ignored\n");
    await expectReject(
      "a named path the Target ignores",
      () => commitDocuments(root, { subject: documentSubject("read", handle, slug), paths: [ignored] }),
      /is ignored by the Target's git/,
    );
    expectEqual("and no commit is made for it", gitC(root, "rev-parse", "HEAD"), recorded.commit);
  });

  // The Main lock is what keeps two writers apart, so the commit takes it: while another process holds it
  // the commit waits, and it lands once that process lets go.
  await withTarget(async (root) => {
    const doc = join(".scratch", "feat", "notes", "09-the-locked-doc.md");
    mkdirSync(dirname(join(root, doc)), { recursive: true });
    writeFileSync(join(root, doc), "# locked\n");
    const childScript = join(root, "commit-under-someone-elses-lock.ts");
    writeFileSync(
      childScript,
      [
        `import { commitDocuments } from ${JSON.stringify(join(kernelDir, "doc-commit.ts"))};`,
        `process.stdout.write("started\\n");`,
        `const r = await commitDocuments(${JSON.stringify(root)}, { subject: "read: feat/09 the-locked-doc", paths: [${JSON.stringify(doc)}] });`,
        `process.stdout.write("done " + r.committed + "\\n");`,
        "",
      ].join("\n"),
    );

    const base = gitC(root, "rev-parse", "HEAD");
    let child: ChildProcess | undefined;
    let said = "";
    await withMainLock(root, async () => {
      child = spawn(process.execPath, [childScript], { cwd: root, stdio: ["ignore", "pipe", "inherit"] });
      child.stdout?.on("data", (chunk: Buffer) => {
        said += chunk.toString();
      });
      await until(child, () => said.includes("started"), () => said, "the other process reaches its commit");
      await sleep(600);
      expectEqual("the commit waits while another process holds the lock", said.includes("done"), false);
      expectEqual("and Main has not moved", gitC(root, "rev-parse", "HEAD"), base);
    });

    await until(child!, () => said.includes("done"), () => said, "the commit lands once the lock is free");
    expectEqual("as one commit with its subject", gitC(root, "log", "-1", "--format=%s"), "read: feat/09 the-locked-doc");
    expectEqual("holding the document alone", gitC(root, "show", "--name-only", "--format=", "HEAD").split("\n"), [doc]);
    expectEqual("with the document left clean", gitC(root, "status", "--porcelain", "--", doc), "");
    expect("the lock is gone once the commit is done", !existsSync(lockFilePath(root)));
    await gone(child!);
  });

  // The commit lands on the branch the Target has checked out - the module names no branch of its own,
  // so a document run against a worktree or a side branch lands where that checkout is.
  await withTarget(async (root) => {
    const doc = join(".scratch", "feat", "notes", "10-on-a-branch.md");
    mkdirSync(dirname(join(root, doc)), { recursive: true });
    writeFileSync(join(root, doc), "# on a branch\n");
    const main = gitC(root, "rev-parse", "main");
    gitC(root, "checkout", "-b", "the-runs-branch");

    const landed = await commitDocuments(root, { subject: "read: feat/10 on-a-branch", paths: [doc] });
    expectEqual("the document lands on the checked-out branch", landed.commit, gitC(root, "rev-parse", "the-runs-branch"));
    expect("and that branch's tip moved", gitC(root, "rev-parse", "the-runs-branch") !== main, main);
    expectEqual("with the branch the Target was not on left alone", gitC(root, "rev-parse", "main"), main);
  });

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
