#!/usr/bin/env bun
/**
 * Repro: the facts that cross the YAML-to-script boundary, other than the outcome tokens, still agree.
 * The token join lives in node-outcomes-repro.ts (the `[]` literal vs the pick node); this file covers
 * the rest of the boundary, where nothing reads the YAML today:
 *
 *   node `script:`      -> that folder's scripts/<name>.ts exists, and it is read in the folder whose
 *                          YAML declares the node, never across the pack
 *   `with:` keys        -> the INPUTS_<KEY> name the node protocol reads (node-entry.ts)
 *   `inputs.config.default` -> config.ts's DEFAULT_CONFIG_REL
 *   `include:`          -> a workflow folder, whose required inputs the include's wiring supplies
 *   `depends_on` / `$<node>.output` -> names a node declared in the same file
 *   entry scripts       -> every `import.meta.main` script is a declared node, and every declared
 *                          script has an entry, in both directions and inside one folder
 *
 * Read as text on purpose: the pack ships no dependencies, and both files are hand-written in one shape.
 * A missing fact fails the file (the message says what moved), never a run.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_CONFIG_REL } from "../scripts/config.ts";
import { ROLES } from "../scripts/roles.ts";
import { drain, execute, experiment, experimentRun, expect, expectEqual } from "./target.ts";

const nodeEntry = readFileSync(join(drain.dir, "scripts/node-entry.ts"), "utf8");

type YamlNode = {
  id: string;
  script?: string;
  include?: string;
  withKeys: { key: string; value: string }[];
  dependsOn: string[];
  fanOutAs?: string;
  fanOutJoin?: string;
  /** The node's own time budget, where the runner would kill a turn its agent is still on. */
  timeout?: number;
  /** True when the node declares a `when:` - a node that can be skipped is not a terminal state. */
  hasWhen: boolean;
  /** Every `$<name>.output` this node's own keys read. */
  reads: string[];
};

/** The INPUTS_* names the node protocol reads. Archon owns the mapping; this is the other end of it. */
const inputsRead = new Set(nodeEntry.match(/INPUTS_[A-Z_]+/g) ?? []);

/** What one workflow folder's own scripts/ offers, keyed by script name: the roles it names, and
 * whether it is a CLI entry. The roles are read out of the source (`role: "implement"`), which is the
 * one place a node says which role it runs. */
const scriptsByDir = new Map<string, Map<string, { entry: boolean; source: string }>>();
for (const dir of [drain.dir, execute.dir, experiment.dir, experimentRun.dir]) {
  const byName = new Map<string, { entry: boolean; source: string }>();
  for (const file of readdirSync(join(dir, "scripts"))) {
    if (!file.endsWith(".ts")) continue;
    const source = readFileSync(join(dir, "scripts", file), "utf8");
    // The file `script: <name>` names does not resolve without an entry block: nothing would run.
    byName.set(file.replace(/\.ts$/, ""), { entry: /if \(import\.meta\.main\)/.test(source), source });
  }
  scriptsByDir.set(dir, byName);
}

const refs = (text: string): string[] => [...text.matchAll(/\$([a-z][\w-]*)\.output/g)].map((m) => m[1]!);
const listNames = (text: string): string[] =>
  text
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * A line scanner, not a YAML parser. Node keys sit deeper than their `- id:`; `with:` and `fan_out:`
 * open blocks whose entries sit deeper still. Every `- id:` starts a node, the loop body included.
 */
function scanNodes(yaml: string): YamlNode[] {
  const nodes: YamlNode[] = [];
  let node: YamlNode | undefined;
  let nodeIndent = 0;
  let block: "with" | "fan_out" | undefined;
  let blockIndent = 0;
  for (const raw of yaml.split("\n")) {
    const line = raw.replace(/\s+#.*$/, "");
    if (!line.trim()) continue;
    const indent = line.length - line.trimStart().length;
    const head = /^- id:\s*(\S+)\s*$/.exec(line.trim());
    if (head) {
      node = { id: head[1]!, withKeys: [], dependsOn: [], reads: [], hasWhen: false };
      nodes.push(node);
      nodeIndent = indent;
      block = undefined;
      continue;
    }
    if (!node || indent <= nodeIndent) continue;
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line.trim());
    if (!kv) continue;
    // The regex has two groups, so a match gives both: the same `!` the node-id match above uses.
    const key = kv[1]!;
    const value = kv[2]!;
    if (key === "when" && value) node.hasWhen = true;
    if (key === "timeout" && value) node.timeout = Number(value);
    // Any key's value may read another node's output, the fan-out and loop keys included.
    for (const name of refs(value)) node.reads.push(name);
    if (block) {
      if (indent > blockIndent) {
        if (block === "with" && value) node.withKeys.push({ key, value });
        if (block === "fan_out" && key === "as" && value) node.fanOutAs = value;
        if (block === "fan_out" && key === "join" && value) node.fanOutJoin = value;
        continue;
      }
      block = undefined;
    }
    if (key === "with" && !value) {
      block = "with";
      blockIndent = indent;
    } else if (key === "fan_out") {
      block = "fan_out";
      blockIndent = indent;
    } else if (key === "script" && value) node.script = value;
    else if (key === "include" && value) node.include = value;
    else if (key === "depends_on") node.dependsOn = listNames(value);
  }
  return nodes;
}

/** The inputs a workflow declares `required: true` - the ones an `include` must be wired to supply. */
function requiredInputs(yaml: string): string[] {
  const out: string[] = [];
  let inInputs = false;
  let indent = 0;
  let current: string | undefined;
  for (const raw of yaml.split("\n")) {
    const line = raw.replace(/\s+#.*$/, "");
    if (!line.trim()) continue;
    const lead = line.length - line.trimStart().length;
    if (/^inputs:\s*$/.test(line.trim())) {
      inInputs = true;
      indent = lead;
      continue;
    }
    if (!inInputs) continue;
    if (lead <= indent) {
      inInputs = false;
      continue;
    }
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line.trim());
    if (!kv) continue;
    if (lead === indent + 2 && kv[2] === "") current = kv[1]!;
    if (lead > indent + 2 && kv[1] === "required" && kv[2] === "true" && current) out.push(current);
  }
  return out;
}

const yamls = [
  { file: "beads-dag-drain.yaml", dir: drain.dir },
  { file: "beads-dag-execute.yaml", dir: execute.dir },
  { file: "beads-dag-experiment.yaml", dir: experiment.dir },
  { file: "beads-dag-experiment-run.yaml", dir: experimentRun.dir },
].map((w) => ({ ...w, text: readFileSync(join(w.dir, w.file), "utf8") }));

try {
  expect("the node protocol reads INPUTS_* names", inputsRead.size >= 2, [...inputsRead].join(" "));
  expect("the scanner sees the drain's nodes", scanNodes(yamls[0]!.text).length >= 5);

  for (const { file, dir, text } of yamls) {
    const nodes = scanNodes(text);
    const ids = new Set(nodes.map((n) => n.id));
    const folder = dir.split("/").pop()!;
    const scripts = scriptsByDir.get(dir)!;
    const declaredScripts = new Set<string>();

    for (const node of nodes) {
      // `script:` names a file in this workflow's own scripts/, never in the other folder's.
      if (node.script) {
        declaredScripts.add(node.script);
        expect(`${file}: script ${node.script} exists in ${folder}/scripts`, scripts.has(node.script));
      }
      // Every name this node depends on, and every node whose output it reads, is declared here.
      for (const name of [...node.dependsOn, ...node.reads]) {
        expect(`${file}: ${node.id} names a declared node`, ids.has(name), name);
      }

      // A `with:` entry is the node protocol's INPUTS_<KEY>, wired as $INPUTS.<key>.
      for (const { key, value } of node.withKeys) {
        expect(`node-entry reads INPUTS_${key.toUpperCase()}`, inputsRead.has(`INPUTS_${key.toUpperCase()}`));
        expectEqual(`${file}: ${node.id} wires ${key} from its own input`, value, `$INPUTS.${key}`);
      }

      // An include names a workflow folder, and its fan-out feeds an input that workflow requires.
      if (node.include) {
        const included = join(dir, "..", node.include, `${node.include}.yaml`);
        expect(`${file}: include ${node.include} is a workflow folder`, existsSync(included));
        // all_success is load-bearing, not a default: an issue's own outcome is exit 0 (merged and failed
        // are both results), so an instance only fails when a node THREW - a runner that cannot start, or
        // a pack bug. Under all_done that is an archon_failed marker and the run still reports success,
        // which is how a misconfigured runner once drained a whole backlog.
        expectEqual(`${file}: ${node.id} fails the node when an instance fails`, node.fanOutJoin, "all_success");
        if (existsSync(included)) {
          const child = readFileSync(included, "utf8");
          // And the instance must BE terminal. archon reads "stopped without a terminal state" for an
          // instance whose last node was skipped, which fails this node whatever the join. A node behind
          // a `when:` can be skipped, so a workflow containing one needs a `returns:` naming a node that
          // always runs - and a workflow with no `when:` needs none, which is why this pack declares no
          // `returns:`. Pinned here so a `when:` added later cannot quietly reintroduce the failure.
          expect(
            `${node.include} needs no returns: because no node sits behind a when:`,
            scanNodes(child).every((n) => !n.hasWhen),
            `${node.include}`,
          );
        }
        if (existsSync(included) && node.fanOutAs) {
          const required = requiredInputs(readFileSync(included, "utf8"));
          expect(
            `${file}: fan_out as ${node.fanOutAs} feeds a required input of ${node.include}`,
            required.includes(node.fanOutAs),
            required.join(" "),
          );
        }
      }
    }

    // A node is a script this workflow can run, and a script it can run is a node: the two directions
    // must agree inside one folder, so a dead entry and a library masquerading as a node both fail here,
    // and a body left in the other folder cannot stand in for either.
    for (const [name, fact] of scripts) {
      if (!fact.entry) continue;
      expect(
        `entry script ${name} in ${folder}/scripts is declared as a node`,
        declaredScripts.has(name),
        [...declaredScripts].sort().join(" "),
      );
    }
    for (const name of declaredScripts) {
      expect(
        `declared script ${name} in ${folder}/scripts has an entry`,
        scripts.get(name)?.entry === true,
        [...scripts.keys()].sort().join(" "),
      );
    }

    // The node's timeout is the runner's side of the role's wall clock: a node names the roles it runs,
    // the role table says how long each may run, and the node's own budget has to cover all of them
    // (ticket 08 runs two turns in one node, so the sum, not the maximum).
    for (const node of nodes) {
      if (!node.script) continue;
      const roles = [...(scripts.get(node.script)?.source ?? "").matchAll(/role:\s*"([a-z]+)"/g)].map((m) => m[1]!);
      for (const role of roles) {
        expect(`${file}: ${node.id} names a declared role`, role in ROLES, role);
      }
      if (roles.length === 0) continue;
      const needed = roles.reduce((ms, role) => ms + ROLES[role as keyof typeof ROLES].wallMs, 0);
      expect(
        `${file}: ${node.id} outlasts the wall clocks of ${roles.join("+")} (${needed}ms)`,
        node.timeout !== undefined && node.timeout > needed,
        `${node.timeout}ms`,
      );
    }
  }

  // The config path the workflows hand the nodes is the one the pack defaults to.
  for (const { file, text } of yamls) {
    const declared = /config:\s*\n\s*default:\s*(\S+)/.exec(text)?.[1];
    expectEqual(`${file} defaults config to DEFAULT_CONFIG_REL`, declared, DEFAULT_CONFIG_REL);
  }

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
