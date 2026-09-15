#!/usr/bin/env bun
/**
 * Repro: the thin experiment script's two verbs, pinned without DVC.
 *
 * `tools/experiments/` is a Target-side tool directory — copied in, no package — carrying the two things
 * an experiment cannot reconstruct afterwards: a run's identity, reserved **before** anything executes,
 * and the numbers, collected **after**. Both verbs shell out to `dvc` and read its JSON, and both are
 * driven here against `experiments-stub-dvc.ts` on PATH, so the suite needs no DVC on the machine: the stub
 * answers `exp run --queue`, `exp show --json` and `exp run --run-all` in DVC 3.67.1's measured shapes,
 * keeps the queue in the repository it is called from, and reports that repository's real HEAD as the run's
 * revision (the lock hash is read out of the revision with git, so the revision has to exist).
 *
 * What is asserted is what an observer outside the tool can see: the one JSON line on stdout, the
 * registration under the run's artifacts, the argv the stub was handed, and the per-run report — including
 * a metric whose entry is an error, which must come back empty rather than as a number. The real DVC is
 * exercised by `tools/experiments/smoke.ts`, not here.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { delimiter, dirname, join } from "node:path";
import { expect, expectEqual, gitC, mkTemp } from "./target.ts";

/**
 * `tools/experiments/` lives in the repository, not in the pack: the pack is copied to a machine's Archon
 * home, a tool directory is something a Target copies in. The suite runs from this repository, so git names
 * the root — and a tool that is not there fails this repro loudly instead of reporting a green suite.
 */
const REPO_ROOT = execFileSync("git", ["-C", import.meta.dir, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const TOOL = join(REPO_ROOT, "tools", "experiments");
const STUB = join(import.meta.dir, "experiments-stub-dvc.ts");
if (!existsSync(join(TOOL, "register.ts"))) {
  throw new Error(`no ${TOOL}/register.ts: the suite drives the tool directory in the repository it lives in`);
}

type Repo = { root: string; bin: string; artifacts: string; head: string };
type StubState = { runs: { name: string; copies: string[]; executed: boolean }[]; calls: string[] };
type Result = { stdout: string; stderr: string; status: number | null };

/** A throwaway repository the stub answers for, with its own PATH and the run's artifacts beside it. */
function withRepo(fn: (repo: Repo) => void): void {
  const dir = mkTemp("experiments-");
  const root = join(dir, "repo");
  const bin = join(dir, "bin");
  const artifacts = join(dir, "artifacts");
  try {
    mkdirSync(root, { recursive: true });
    gitC(root, "init", "-b", "main");
    gitC(root, "config", "user.name", "test");
    gitC(root, "config", "user.email", "test@example.com");
    writeFileSync(join(root, "params.yaml"), "v: 0\n");
    // The lock is read out of the run's revision, so the revision has to carry one; report.json stands in
    // for a metric file DVC does not declare as a metric at all.
    writeFileSync(join(root, "dvc.lock"), '{"stub": "the run\'s lock"}\n');
    writeFileSync(join(root, "report.json"), '{"score": 1.5}\n');
    writeFileSync(join(root, ".gitignore"), "/data/\n");
    mkdirSync(join(root, "data"), { recursive: true });
    writeFileSync(join(root, "data", "one.txt"), "a\n");
    gitC(root, "add", "-A");
    gitC(root, "commit", "-qm", "an experiment's repository");

    // The stub, on a PATH of the repro's own. A script on PATH needs an interpreter the suite cannot
    // assume is there, so what lands on PATH is a sh wrapper around the runtime this repro is already on.
    mkdirSync(bin, { recursive: true });
    const wrapper = join(bin, "dvc");
    writeFileSync(wrapper, `#!/bin/sh\nexec "${process.execPath}" "${STUB}" "$@"\n`);
    chmodSync(wrapper, 0o755);

    fn({ root, bin, artifacts, head: gitC(root, "rev-parse", "HEAD") });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** One verb, run the way the executor would: the repository as cwd, the run's artifacts in the environment. */
function tool(script: string, repo: Repo, args: string[], env: NodeJS.ProcessEnv = {}): Result {
  const r = spawnSync(process.execPath, [join(TOOL, script), ...args], {
    cwd: repo.root,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: [repo.bin, process.env.PATH ?? ""].filter(Boolean).join(delimiter),
      ARTIFACTS_DIR: repo.artifacts,
      ...env,
    },
  });
  return { stdout: r.stdout ?? "", stderr: r.stderr ?? "", status: r.status };
}

/** A PATH with git on it and no `dvc` anywhere, the way a machine without a run tool looks. */
function withoutDvc(repo: Repo): NodeJS.ProcessEnv {
  const gitDir = dirname(execFileSync("which", ["git"], { encoding: "utf8" }).trim());
  return { PATH: [gitDir, join(repo.root, "..", "not-a-dvc")].join(delimiter), DVC_BIN: "" };
}

const stubState = (repo: Repo): StubState =>
  JSON.parse(readFileSync(join(repo.root, ".stub-dvc.json"), "utf8")) as StubState;

const registered = (repo: Repo, name: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(repo.artifacts, "experiments", `${name}.json`), "utf8")) as Record<string, unknown>;

const identityOf = (result: Result): Record<string, any> => JSON.parse(result.stdout);

try {
  // The identity, reserved before anything executes: the name, the points, the parameters DVC resolved and
  // the commit the run starts from — printed as one line, and written where the run's artifacts are.
  withRepo((repo) => {
    const r = tool("register.ts", repo, ["--name", "pilot", "--set", "v=1"]);
    expectEqual("register exits clean", r.status, 0);
    expectEqual("the identity is one JSON line", r.stdout.trim().split("\n").length, 1);
    const identity = identityOf(r);
    expectEqual("the identity names the run", identity.name, "pilot");
    expectEqual("the identity carries the points", identity.points, ["v=1"]);
    expectEqual("the identity carries the commit the run starts from", identity.code, repo.head);
    expectEqual("the parameters are the ones DVC resolved for the queued run", identity.runs, [
      { name: "pilot", params: { "params.yaml": { v: 1 } } },
    ]);
    expectEqual("the registration is the identity, in the run's artifacts", registered(repo, "pilot"), identity);
    const state = stubState(repo);
    expect(
      "the run was queued, not run",
      state.calls.includes("exp run --queue -n pilot -S v=1"),
      state.calls,
    );
    expectEqual("nothing executed at registration", state.runs.filter((run) => run.executed).length, 0);
  });

  // A sweep is one register: the comma list is DVC's own expansion, and each queued run carries its point.
  withRepo((repo) => {
    const r = tool("register.ts", repo, ["--name", "sweep-a", "--set", "v=1,2"]);
    expectEqual("a sweep registers clean", r.status, 0);
    const identity = identityOf(r);
    expectEqual("one register queued one run per point", identity.runs.map((run: any) => run.name), ["sweep-a-1", "sweep-a-2"]);
    expectEqual(
      "each run carries its own point's params",
      identity.runs.map((run: any) => run.params["params.yaml"].v),
      [1, 2],
    );
  });

  // The ticket's declared ignored data paths: passed to the queue (the only call where `-C` has an
  // effect), recorded in the registration — and refused when the path is not there to be copied.
  withRepo((repo) => {
    const queued = tool("register.ts", repo, ["--name", "copied", "--copy", "data"]);
    expectEqual("a declared ignored path queues clean", queued.status, 0);
    expect("the path goes to the queue call", stubState(repo).calls.includes("exp run --queue -n copied -C data"), stubState(repo).calls);
    expectEqual("the registration records what the run was given", identityOf(queued).copies, ["data"]);

    const refused = tool("register.ts", repo, ["--name", "starved", "--copy", "no-such-data"]);
    expect("a path that is not there is refused", refused.status !== 0, refused.status);
    expectEqual("the refusal prints no identity", refused.stdout, "");
    expect("the refusal says nothing was queued", /nothing was queued/i.test(refused.stderr), refused.stderr);
    expect("nothing is registered for it", !existsSync(join(repo.artifacts, "experiments", "starved.json")), refused.stderr);
    expect("the queue does not hold it", !stubState(repo).runs.some((run) => run.name === "starved"), stubState(repo).runs);
  });

  // A queue that came back executed is refused: registration reserves an identity and must not run it.
  withRepo((repo) => {
    const r = tool("register.ts", repo, ["--name", "eager"], { STUB_DVC_RUN_AT_QUEUE: "1" });
    expect("a queue that executed is refused", r.status !== 0, r.status);
    expect("the refusal says what the queue did", /must not run it/.test(r.stderr), r.stderr);
    expect("nothing is registered", !existsSync(join(repo.artifacts, "experiments", "eager.json")), r.stderr);
  });

  // The collection: the queue is executed, and each run is reported with its number and the pointers that
  // say which bytes produced it.
  withRepo((repo) => {
    tool("register.ts", repo, ["--name", "pilot", "--set", "v=1"]);
    const r = tool("collect.ts", repo, ["--metric", "metrics.json:acc", "--jobs", "2"]);
    expectEqual("collect exits clean", r.status, 0);
    const report = JSON.parse(r.stdout);
    expectEqual("one run is reported", report.runs.length, 1);
    const run = report.runs[0];
    expectEqual("the metric's value is the run's", run.metric.value, 1);
    expectEqual("the metric names the file it was read from", run.metric.file, "metrics.json");
    expectEqual("the metric says which read produced it", run.metric.source, "dvc exp show");
    expectEqual("the parameters are the run's", run.params, { "params.yaml": { v: 1 } });
    expectEqual("the code commit is the one the run started from", run.code, repo.head);
    expectEqual("the lock hash is the run's own lock", run.lock.hash, gitC(repo.root, "rev-parse", `${run.rev}:dvc.lock`));
    expectEqual("the artifact pointers are DVC's", run.artifacts.map((a: any) => a.path), ["model.bin"]);
    expect("an artifact carries its hash", run.artifacts[0].hash.length > 0, run.artifacts);
    expect("the queue ran with the jobs asked for", stubState(repo).calls.includes("exp run --run-all -j 2"), stubState(repo).calls);
  });

  // A metric whose entry is an error is empty — never a number. DVC calls the run Success, so a zero read
  // out of an error is a silently wrong result, which is the whole reason the entry is checked.
  withRepo((repo) => {
    tool("register.ts", repo, ["--name", "broken-a"]);
    const metric = JSON.parse(tool("collect.ts", repo, ["--metric", "metrics.json:acc"]).stdout).runs[0].metric;
    expect("an error entry reads as empty", metric.value === null, metric);
    expect("the empty metric is never a number", typeof metric.value !== "number", metric);
    expect("the reason is DVC's own error", /FileNotFoundError/.test(metric.error ?? ""), metric);
    expectEqual("the file it looked in is named", metric.file, "metrics.json");
  });

  // A metric file DVC does not declare at all is read from the run's revision, and says so.
  withRepo((repo) => {
    tool("register.ts", repo, ["--name", "undeclared-a"]);
    const metric = JSON.parse(tool("collect.ts", repo, ["--metric", "report.json:score"]).stdout).runs[0].metric;
    expectEqual("the declared file is read from the run's revision", metric.value, 1.5);
    expect("the source says the read was git's", /^git show /.test(metric.source ?? ""), metric);
  });

  // Nothing to collect, and no run tool: both refused loudly, with nothing on stdout.
  withRepo((repo) => {
    const empty = tool("collect.ts", repo, ["--metric", "acc"]);
    expect("collect with nothing registered is refused", empty.status !== 0, empty.status);
    expectEqual("the refusal prints no report", empty.stdout, "");
    expect("the refusal names what it looked for", /registration/i.test(empty.stderr), empty.stderr);

    const noDvc = tool("register.ts", repo, ["--name", "nowhere"], withoutDvc(repo));
    expect("a machine without dvc is refused", noDvc.status !== 0, noDvc.status);
    expectEqual("the refusal prints no identity", noDvc.stdout, "");
    expect("the refusal names PATH", /PATH/.test(noDvc.stderr), noDvc.stderr);
    expect("the refusal names the tool it could not find", /no dvc/.test(noDvc.stderr), noDvc.stderr);

    const escaped = tool("register.ts", repo, ["--name", "escape-hatch"], {
      ...withoutDvc(repo),
      DVC_BIN: join(repo.bin, "dvc"),
    });
    expectEqual("DVC_BIN is the escape hatch", escaped.status, 0);
    expectEqual("the escape hatch registered the run", identityOf(escaped).name, "escape-hatch");
  });

  // The usage contract, and a registered run DVC no longer lists: still reported, never dropped.
  withRepo((repo) => {
    const noName = tool("register.ts", repo, []);
    expectEqual("register without --name is a usage mistake", noName.status, 2);
    expect("the usage comes with it", /usage: bun tools\/experiments\/register\.ts/.test(noName.stderr), noName.stderr);

    const noMetric = tool("collect.ts", repo, []);
    expectEqual("collect without --metric is a usage mistake", noMetric.status, 2);
    expect("the usage comes with it", /usage: bun tools\/experiments\/collect\.ts/.test(noMetric.stderr), noMetric.stderr);

    tool("register.ts", repo, ["--name", "vanished"]);
    const state = stubState(repo);
    writeFileSync(join(repo.root, ".stub-dvc.json"), JSON.stringify({ runs: [], calls: state.calls }));
    const report = JSON.parse(tool("collect.ts", repo, ["--metric", "metrics.json:acc"]).stdout);
    expectEqual("a registered run DVC no longer lists is still reported", report.runs.length, 1);
    expect("the report says which run it could not find", /no such run/.test(report.runs[0].error ?? ""), report.runs[0]);
    expect("and the metric is empty, never a number", report.runs[0].metric.value === null, report.runs[0].metric);
  });

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
