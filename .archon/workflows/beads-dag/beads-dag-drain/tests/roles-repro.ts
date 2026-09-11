#!/usr/bin/env bun
/**
 * Repro: the role protocol.
 *
 * One table declares everything a role is: the arguments it takes, the session key it writes under, the
 * persona it runs under, the brief its prompt is, and how long it may run. A node names its role and
 * hands it the role's own arguments - it spells no persona, no prompt and no wall clock of its own - and
 * the workflow's timeout for that node covers the wall clock the table declares.
 *
 * The worker's environment is part of the same protocol, not of a caller's memory: the transform a role
 * call carries sets the store's own read-only mode for the whole process tree under it, so a worker
 * cannot move the frontier while it works. worker-readonly-repro.ts proves the store refuses the write.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PackConfig } from "../scripts/config.ts";
import { AGENT_WALL_MS, ROLES, roleAgent, type AgentRole } from "../scripts/roles.ts";
import { implementPersona } from "../scripts/prompt.ts";
import { READONLY_ENV } from "../scripts/worker-env.ts";
import { drain, execute, expect, expectEqual } from "./target.ts";

/** The roles a node body names, read out of its source: the one call that says which role runs. */
function rolesInScript(file: string): string[] {
  return [...readFileSync(file, "utf8").matchAll(/role:\s*"([a-z]+)"/g)].map((m) => m[1]!);
}

/** Every node body this pack has: the workflows' entry scripts, taken from their YAMLs. */
const nodeBodies = ["open", "pick", "review", "summary"].map((name) => drain.script(name)).concat([execute.script("execute")]);

const CONFIG: PackConfig = { model: "some/model", thinkingLevel: "high", concurrency: 2, runner: "pi", store: undefined };

try {
  // One entry per role, and each entry declares the whole role.
  const roles = Object.keys(ROLES) as AgentRole[];
  expect("the role table is not empty", roles.length > 0, roles.join(" "));
  for (const role of roles) {
    const spec = ROLES[role] as Record<string, unknown>;
    expectEqual(`${role} declares its session key, persona, brief and wall clock`, Object.keys(spec).sort(), [
      "persona",
      "prompt",
      "sessionKey",
      "wallMs",
    ]);
    expect(`${role}'s wall clock is a number`, typeof spec.wallMs === "number" && (spec.wallMs as number) > 0, spec.wallMs);
  }

  // Every node body names a declared role, and every declared role is a node body's to run.
  const named = new Set<string>();
  for (const file of nodeBodies) {
    for (const role of rolesInScript(file)) {
      expect(`${file} names a declared role`, role in ROLES, role);
      named.add(role);
    }
  }
  for (const role of roles) {
    expect(`a node runs ${role}`, named.has(role), [...named].join(" "));
  }

  // A node names its role and its arguments; the persona, the brief and the wall clock are the table's.
  const implementation = readFileSync(execute.script("execute"), "utf8");
  expect("the executor names its role", /role:\s*"implement"/.test(implementation), implementation.slice(0, 200));
  for (const fact of ["wallMs", "persona", "prompt"]) {
    expect(`the executor spells no ${fact} of its own`, !new RegExp(`${fact}:`).test(implementation), fact);
  }

  // The role call composes the agent seam's options out of the table and the call's own arguments.
  const call = roleAgent({
    role: "implement",
    args: { handle: "feat/01", bodyPath: "/target/.scratch/feat/issues/01-body.md" },
    cwd: "/worktree",
    artifactsDir: "/artifacts",
    config: CONFIG,
  });
  expectEqual("the session key is the issue the role runs for", call.sessionKey, "feat/01");
  expectEqual("the role is the one the node named", call.role, "implement");
  expectEqual("the persona is the table's", call.persona, implementPersona());
  expectEqual("the brief is the body's path", call.prompt, "/target/.scratch/feat/issues/01-body.md");
  expectEqual("the wall clock is the table's", call.wallMs, AGENT_WALL_MS);
  expectEqual("the model comes from the config", call.model, CONFIG.model);
  expectEqual("the thinking level comes from the config", call.thinkingLevel, CONFIG.thinkingLevel);
  expectEqual("the runner comes from the config", call.runner, CONFIG.runner);
  expectEqual("the turn runs where the node says", call.cwd, "/worktree");
  expectEqual("and leaves its artifacts where the node says", call.artifactsDir, "/artifacts");

  // The environment a worker runs under is the protocol's, and it is the store's own read-only mode.
  const base: NodeJS.ProcessEnv = { PATH: "/usr/bin" };
  expectEqual("the worker's environment keeps what it was handed", call.env(base).PATH, "/usr/bin");
  expectEqual("and adds the store's read-only mode", call.env(base)[READONLY_ENV], "1");
  expectEqual("the base is not modified", Object.keys(base).sort(), ["PATH"]);

  // The role table is data: nothing in it reads a file, an environment or a store.
  const source = readFileSync(join(drain.dir, "scripts", "roles.ts"), "utf8");
  expect("the role table reads no filesystem", !/node:fs|readFileSync|existsSync|readdirSync/.test(source), source.slice(0, 120));
  expect("the role table writes no store command", !/\bbd\b/.test(source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/[^\n]*/g, "$1")), source.slice(0, 120));

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
