/**
 * The opening node's lock-and-release shell.
 *
 * Drain, inquiry, and experiment `open` keep their own leftover repair and premises, and plug into
 * this for the work they share. The shell takes the Target run lock before anything else (so a
 * second run's refusal writes nothing at all), prints the configuration line, runs the leftover
 * repair and premises the executor passes in, and releases the lock if that work fails. The lock
 * stays held when the work succeeds: the run's last node releases it. A release that cannot happen
 * leaves a file the next run steals by its dead pid.
 *
 * Leftover repair stays out of this shell: drain from git, inquiry and experiment from the store
 * (ADR-0002). No domain switch. Closed stays out (ADR-0006).
 */
import { configLine, type ConfigProvenance, type PackConfig } from "./config.ts";
import { nodeLine, OPENED } from "./node-outcomes.ts";
import { recordRunLock, releaseRunLock, stoleLine, takeRunLock } from "./run-lock.ts";
import { preflightStore, type Store } from "./store.ts";

/** What the shell is handed: the Target, this run's artifacts, and the config the line is built from. */
export type OpenRunEnv = {
  target: string;
  artifactsDir: string;
  config: PackConfig;
  configProvenance: ConfigProvenance;
};

/**
 * Take the Target run lock, print the configuration line, run `work`, and release the lock if that
 * work fails. Returns the opening node's `opened` token when `work` returns.
 *
 * The steal is the one line a killed run's leftover earns. The configuration line goes to stderr,
 * the channel the repair lines use and the runner keeps as `stderr_tail`. It cannot go to stdout: a
 * node's stdout is its token channel, and open's whole stdout has to be the `opened` token Archon
 * reads. It is written before `work`, so even a run the premises refuse says what it was configured
 * with.
 *
 * The run's own record of the lock is written only once `work` is past: a run refused at open wrote
 * nothing, and a run that proceeds can explain the refusal it causes.
 */
export async function openRun(
  env: OpenRunEnv,
  work: (store: Store) => void | Promise<void>,
): Promise<string> {
  const { target, artifactsDir, config, configProvenance } = env;
  const lock = takeRunLock(target, artifactsDir);
  try {
    const stole = stoleLine(lock);
    if (stole !== undefined) console.error(stole);

    const store = preflightStore(target, config);
    console.error(configLine(config, configProvenance, store));
    await work(store);
    recordRunLock(artifactsDir, lock);
    return nodeLine(OPENED);
  } catch (e) {
    // An open that failed before the loop has no work to lose: the lock goes back, and a release
    // that cannot happen leaves a file the next run steals by its dead pid.
    releaseRunLock(target, artifactsDir);
    throw e;
  }
}
