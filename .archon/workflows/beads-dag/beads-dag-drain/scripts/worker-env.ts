/**
 * The environment a worker runs under.
 *
 * A worker may not move the frontier while it works, and the mechanism is the store's own read-only
 * mode rather than a sentence in a persona. In read-only mode the store refuses every write operation -
 * status changes, comments, notes, edges, even a claim - while reads keep working, and it refuses them
 * for a whole process tree: a shell a session opens, a child it spawns and a command it runs through a
 * tool are all under it. There is no partial mode and no config default, so the drain sets it in the
 * environment it hands the runner, which is the only place it can be set reliably (a worker cannot set
 * it for itself, and a prompt cannot enforce it).
 *
 * Sets the mode and nothing else: what else a worker's environment should carry - a Target's own
 * toolchain, for instance - is a question about a Target, not about this rule.
 */

/** The store's read-only switch, by the name the store itself reads. */
export const READONLY_ENV = "BD_READONLY";

/**
 * The read-only mode, added to whatever base the runner brought. It is a transform rather than a
 * resolved environment so a runner keeps whatever else its own spawn context needs, and so every
 * runner applies the same rule to the same call.
 */
export function workerEnv(base: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return { ...base, [READONLY_ENV]: "1" };
}
