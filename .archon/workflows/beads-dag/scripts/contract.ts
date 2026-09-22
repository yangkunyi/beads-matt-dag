/**
 * Presence of a domain contract head on a frozen body.
 *
 * The body is the brief. A YAML document at the top carries the domain's required keys and no state.
 * Pick and execute do not parse this; attention reports present|missing so a missing head is visible
 * before a drain burns a slot. A body with no head is still drainable.
 */
export type ContractKind = "development" | "inquiry" | "experiment";

/** Required YAML keys per domain. Presence is derived from this list; skills and the tracker pin it. */
export const CONTRACT_KEYS: Record<ContractKind, readonly string[]> = {
  development: ["goal", "acceptance"],
  inquiry: ["question"],
  experiment: ["metric", "reference", "pin"],
};

/** The YAML document at the top of a body, or undefined when the body has no front matter. */
export function yamlHead(body: string): string | undefined {
  const start = body.startsWith("---\r\n") ? 5 : body.startsWith("---\n") ? 4 : -1;
  if (start < 0) return undefined;
  const rest = body.slice(start);
  const close = /\r?\n---(?:\r?\n|$)/.exec(rest);
  if (close === null || close.index === undefined) return undefined;
  return rest.slice(0, close.index);
}

function hasKey(head: string, key: string): boolean {
  return new RegExp(`^${key}\\s*:`, "m").test(head);
}

/** Whether the body begins with that domain's required keys. No parsing of values. */
export function contractPresence(body: string, kind: ContractKind): "present" | "missing" {
  const head = yamlHead(body);
  if (head === undefined) return "missing";
  return CONTRACT_KEYS[kind].every((key) => hasKey(head, key)) ? "present" : "missing";
}
