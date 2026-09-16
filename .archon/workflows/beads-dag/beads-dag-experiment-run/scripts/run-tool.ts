/**
 * The experiment executor's two premises: the Target carries the experiment tool directory, and the
 * machine carries the run tool.
 *
 * Both are checked at `open`, before anything is claimed or repaired, so a machine that cannot run the
 * experiment half says so in one line at the opening node instead of failing three hours into a turn.
 *
 * - **the Target's tool directory** (`tools/experiments/`, the peer of the reading pen) is a Target-side
 *   copy, like `tools/inquiry/`: not a pack node, not installed, no package. The executor drives the
 *   Target's own copy, so a Target without one has no way to register or collect a run at all.
 * - **the run tool** is `dvc`, resolved `DVC_BIN` first and then `PATH` — the same order, and the same
 *   escape hatch, the Target's own `tools/experiments/dvc.ts` uses, so the premise the executor checks is
 *   the premise the thin script runs under and a repro can pin a stub behind either.
 *
 * The pack resolves `dvc` here rather than importing the Target's copy: the pack is copied to a machine's
 * Archon home alone, the tool directory lives in the Target, and a pack that reached into a Target's tree
 * at build time would not be a pack. The resolution is deliberately the same few lines, so a machine that
 * can run one verb can run them all.
 */
import { accessSync, constants, existsSync, statSync } from "node:fs";
import { delimiter, join } from "node:path";

/** Where a Target's copy of the experiment tools lives, relative to the Target. */
export const EXPERIMENT_TOOLS_REL = "tools/experiments";

/** The one entry the run node calls: the verb that reserves a run's identity before anything executes. */
export const REGISTER_TOOL_REL = join(EXPERIMENT_TOOLS_REL, "register.ts");

/** The Target's tool directory, absolute. */
export function experimentToolsDir(target: string): string {
  return join(target, EXPERIMENT_TOOLS_REL);
}

/**
 * Refuse a Target that does not carry the experiment tool directory.
 *
 * The directory is the premise, and the register entry is what the run node actually calls, so both are
 * checked: a directory that is there but empty is a Target that cannot run an experiment either, and the
 * refusal says which path it looked for.
 */
export function requireExperimentTools(target: string): void {
  const dir = experimentToolsDir(target);
  const register = join(target, REGISTER_TOOL_REL);
  if (!existsSync(register)) {
    throw new Error(
      `no experiment tools in the Target: ${dir} does not carry ${REGISTER_TOOL_REL}; the experiment half ` +
        "runs the Target's own copy of tools/experiments/ (copied in like the reading pen, no package), and " +
        "without it there is nothing to register a run's identity with",
    );
  }
}

/** The PATH entries, in order, with the empty ones dropped — an empty entry is a cwd guess, not a dir. */
function pathEntries(): string[] {
  return (process.env.PATH ?? "").split(delimiter).filter((entry) => entry !== "");
}

function isExecutableFile(path: string): boolean {
  try {
    if (!statSync(path).isFile()) return false;
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * The run tool: `DVC_BIN`, then `dvc` on PATH. A machine without one is a refusal, never a silent no-op,
 * and the refusal names every directory that was looked in.
 */
export function resolveRunTool(): string {
  const override = process.env.DVC_BIN?.trim();
  if (override) {
    if (isExecutableFile(override)) return override;
    throw new Error(
      `DVC_BIN is set to ${override}, which is not an executable file; point it at the run tool, or unset ` +
        "it to look for dvc on PATH",
    );
  }
  for (const dir of pathEntries()) {
    const candidate = join(dir, "dvc");
    if (isExecutableFile(candidate)) return candidate;
  }
  throw new Error(
    `no dvc on PATH: looked in ${pathEntries().join(delimiter) || "(PATH is empty)"}; the experiment half ` +
      "runs DVC's queue and nothing else — install DVC, or set DVC_BIN to the run tool",
  );
}
