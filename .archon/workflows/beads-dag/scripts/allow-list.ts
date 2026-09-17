/**
 * This run's pool: the ids pick may claim.
 *
 * A present allow-list is the operator's selection for this run, not a label and not a brake. An
 * omitted list (unset, or the empty string the workflow input defaults to) is today's pick. A present
 * list, empty included, is the pool: an issue whose id is not on it is excluded as `outside-allow-list`
 * and not claimed, and whatever triage it had stays. Being on the list does not bypass the run's other
 * rules — those still name themselves.
 */

/** Why a candidate the other rules kept was left out of this run's pool. */
export const OUTSIDE_ALLOW_LIST = "outside-allow-list" as const;
export type AllowListRule = typeof OUTSIDE_ALLOW_LIST;

/**
 * The ids this run may claim. `undefined` is omitted: pick is today's. A present set, empty included,
 * is the pool.
 */
export type AllowList = ReadonlySet<string> | undefined;

/** One issue the allow-list left out, with the rule that left it out. */
export type AllowListExclusion = { id: string; handle: string | undefined; rule: AllowListRule };

/**
 * The workflow input as a pool. Unset or blank is omitted. Anything else must be a JSON array of
 * issue ids — `[]` included, which is a present empty pool and claims nothing. A malformed value fails
 * the node rather than being read as omitted: silently picking today's frontier would hide a bad start.
 */
export function parseAllowList(raw: string | undefined): AllowList {
  const text = raw?.trim();
  if (!text) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`INPUTS_ALLOW_LIST must be a JSON array of issue ids, got ${JSON.stringify(raw)}`);
  }
  if (!Array.isArray(parsed) || parsed.some((id) => typeof id !== "string")) {
    throw new Error(`INPUTS_ALLOW_LIST must be a JSON array of issue ids, got ${JSON.stringify(raw)}`);
  }
  return new Set(parsed as string[]);
}

/**
 * The allow-list rule, applied after the run's other exclusions: an omitted list is a no-op, a present
 * list keeps only the ids on it, and every candidate it drops is named `outside-allow-list`.
 */
export function applyAllowList<T extends { id: string; handle?: string | undefined }>(
  candidates: readonly T[],
  allowList: AllowList,
): { kept: T[]; dropped: AllowListExclusion[] } {
  if (allowList === undefined) return { kept: [...candidates], dropped: [] };
  const kept: T[] = [];
  const dropped: AllowListExclusion[] = [];
  for (const candidate of candidates) {
    if (allowList.has(candidate.id)) kept.push(candidate);
    else dropped.push({ id: candidate.id, handle: candidate.handle, rule: OUTSIDE_ALLOW_LIST });
  }
  return { kept, dropped };
}
