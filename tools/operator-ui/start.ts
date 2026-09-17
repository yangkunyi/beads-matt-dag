/**
 * Start a selection: the domain's existing run, with those ids as this run's allow-list.
 *
 * Empty and mixed-domain selections do not start. A held Target does not start. The surface does
 * not claim, merge, or stamp `closed`; pick applies the list, and issues left out keep their triage.
 */

import { domainOf, type LiveRunKind, type OverviewDomain } from "./model";
import type { ArchonRunner } from "./overlay";

export type RunLaunch = {
	kind: LiveRunKind;
	workflow: string;
	allowList: string[];
};

export type RunLauncher = (launch: RunLaunch) => void;

export type StartPlan =
	| { ok: true; kind: LiveRunKind; workflow: string; allowList: string[] }
	| { ok: false; reason: string };

/** The pack workflow that kind already runs. Inverse of `kindOfWorkflow`. */
export function workflowForKind(kind: LiveRunKind): string {
	if (kind === "drain") return "beads-dag-drain";
	if (kind === "inquiry") return "beads-dag-inquiry";
	return "beads-dag-experiment";
}

export function kindOfDomain(domain: OverviewDomain): LiveRunKind {
	return domain === "development" ? "drain" : domain;
}

function parseIds(raw: unknown): string[] {
	if (!Array.isArray(raw)) return [];
	const ids: string[] = [];
	const seen = new Set<string>();
	for (const value of raw) {
		if (typeof value !== "string") continue;
		const id = value.trim();
		if (id === "" || seen.has(id)) continue;
		seen.add(id);
		ids.push(id);
	}
	return ids;
}

/**
 * Whether this selection may start, and which run it would start. The door applies this; the
 * canvas may use it to label the button. A present allow-list is always the selected ids.
 */
export function planStart(
	idsRaw: unknown,
	issues: ReadonlyArray<{ id: string; type: string }>,
	targetHeld: boolean,
): StartPlan {
	const ids = parseIds(idsRaw);
	if (ids.length === 0) return { ok: false, reason: "empty selection" };
	const byId = new Map(issues.map((issue) => [issue.id, domainOf(issue.type)]));
	const domains = new Set<OverviewDomain>();
	for (const id of ids) {
		const domain = byId.get(id);
		if (domain === undefined) return { ok: false, reason: "unknown issue" };
		domains.add(domain);
	}
	if (domains.size !== 1) return { ok: false, reason: "mixed-domain" };
	if (targetHeld) return { ok: false, reason: "Target already held" };
	const domain = [...domains][0];
	if (domain === undefined) return { ok: false, reason: "empty selection" };
	const kind = kindOfDomain(domain);
	return { ok: true, kind, workflow: workflowForKind(kind), allowList: ids };
}

/** `archon workflow run <workflow> --detach --input allow_list=<json>` — the same CLI start, plus the list. */
export function archonLaunchArgs(launch: RunLaunch): string[] {
	return [
		"workflow",
		"run",
		launch.workflow,
		"--detach",
		"--input",
		`allow_list=${JSON.stringify(launch.allowList)}`,
	];
}

export function launchWithArchon(archon: ArchonRunner, launch: RunLaunch): void {
	archon(archonLaunchArgs(launch));
}
