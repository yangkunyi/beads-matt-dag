/**
 * Start a selection: the domain's existing run, with those ids as this run's allow-list. Grill is the
 * other launch the surface offers: one seed issue, handed to the grill run as its `seed` input.
 *
 * Empty and mixed-domain selections do not start, and grill takes exactly one seed, so an empty or a
 * multiple selection does not grill. A held Target does not start either launch. Neither launch
 * claims, merges, or stamps `closed`: the surface writes no store state for one, pick applies the
 * list, and issues left out keep their triage. The grill run claims nothing at all — the seed stays
 * open so the operator can answer on it.
 */

import { domainOf, type LiveRunKind, type OverviewDomain } from "./model";
import type { ArchonRunner } from "./overlay";

/** The executors a selection starts. Grill is not one: it takes a seed, not a list. */
export type StartKind = Exclude<LiveRunKind, "grill">;

/** A start: the domain's existing run, with the selected ids as this run's allow-list. */
export type StartLaunch = { kind: StartKind; workflow: string; allowList: string[] };

/** The grill run: one seed issue id, as the workflow's own `seed` input. */
export type GrillLaunch = { kind: "grill"; workflow: string; seed: string };

export type RunLaunch = StartLaunch | GrillLaunch;

export type RunLauncher = (launch: RunLaunch) => void;

export type StartPlan =
	| { ok: true; kind: StartKind; workflow: string; allowList: string[] }
	| { ok: false; reason: string };

/** A grill launch: the one seed it would take, or the reason this selection is not one. */
export type GrillPlan =
	| { ok: true; kind: "grill"; workflow: string; seed: string }
	| { ok: false; reason: string };

/** The pack workflow that kind already runs. Inverse of `kindOfWorkflow`. */
export function workflowForKind(kind: LiveRunKind): string {
	if (kind === "drain") return "beads-dag-drain";
	if (kind === "inquiry") return "beads-dag-inquiry";
	return "beads-dag-experiment";
}

export function kindOfDomain(domain: OverviewDomain): StartKind {
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

/**
 * Whether this selection may grill, and which seed it would take. One seed and no more: the grill
 * run's `open` takes a single id, and quietly dropping the rest of a selection would be the surface
 * deciding something the operator did not say. A held Target refuses for the same reason a start
 * does — one run at a time is the Target's rule, not the domain's. The seed's type is not checked
 * here: the grill run's own `open` refuses a seed that is not an open decision issue, and the page
 * does not restate a premise the run already owns.
 */
export function planGrill(
	idsRaw: unknown,
	issues: ReadonlyArray<{ id: string }>,
	targetHeld: boolean,
): GrillPlan {
	const ids = parseIds(idsRaw);
	if (ids.length === 0) return { ok: false, reason: "empty selection" };
	if (ids.length > 1) return { ok: false, reason: "grill takes one seed" };
	const seed = ids[0];
	if (seed === undefined) return { ok: false, reason: "empty selection" };
	if (!issues.some((issue) => issue.id === seed)) return { ok: false, reason: "unknown issue" };
	if (targetHeld) return { ok: false, reason: "Target already held" };
	return { ok: true, kind: "grill", workflow: "beads-dag-grill", seed };
}

/** `archon workflow run <workflow> --detach --input …` — the same CLI start, plus the list or the seed. */
export function archonLaunchArgs(launch: RunLaunch): string[] {
	if (launch.kind === "grill") {
		return ["workflow", "run", launch.workflow, "--detach", "--input", `seed=${launch.seed}`];
	}
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
