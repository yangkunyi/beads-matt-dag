/**
 * The operator graph as a view of the store.
 *
 * Nodes and edges here are a projection of beads issues and dependencies. Coordinates are computed
 * for the canvas and are not a store field. A connect gesture does not write (issue 07 will).
 */

import type { Overview, OverviewDomain, OverviewEdge, OverviewIssue } from "./model";

export type ViewNodeData = {
	handle: string;
	title: string;
	domain: OverviewDomain;
	status: string;
	live: boolean;
};

/** A React Flow node is this record plus whatever the canvas adds in memory. */
export type ViewNode = {
	id: string;
	position: { x: number; y: number };
	data: ViewNodeData;
};

export type ViewEdge = {
	id: string;
	source: string;
	target: string;
	relation: string;
};

export type GraphProjection = {
	nodes: ViewNode[];
	edges: ViewEdge[];
};

const NODE_W = 200;
const NODE_H = 52;
const GAP_X = 80;
const GAP_Y = 18;

function unique(values: string[]): string[] {
	return [...new Set(values)].sort();
}

/** Checkbox values for the three filters, derived from the store snapshot. */
export function filterChoices(issues: ReadonlyArray<OverviewIssue>): {
	types: string[];
	statuses: string[];
	labels: { value: string; label: string }[];
} {
	const types = unique(issues.map((issue) => issue.type));
	const statuses = unique(issues.map((issue) => issue.status));
	const labelValues = unique(issues.flatMap((issue) => issue.labels));
	const hasUnlabeled = issues.some((issue) => issue.labels.length === 0);
	const labels = [
		...(hasUnlabeled ? [{ value: "", label: "(none)" }] : []),
		...labelValues.map((label) => ({ value: label, label })),
	];
	return { types, statuses, labels };
}

/**
 * Layered positions from `blocks` edges only. Relates-to / discovered-from do not pull a node into
 * a later column. The numbers live in the view; they are never written back.
 */
export function layoutPositions(
	issues: ReadonlyArray<{ id: string }>,
	edges: ReadonlyArray<Pick<OverviewEdge, "from" | "to" | "type">>,
): Map<string, { x: number; y: number }> {
	const ids = issues.map((issue) => issue.id);
	const idSet = new Set(ids);
	const incoming = new Map<string, string[]>();
	for (const id of ids) incoming.set(id, []);
	for (const edge of edges) {
		if (edge.type !== "blocks") continue;
		if (!idSet.has(edge.from) || !idSet.has(edge.to)) continue;
		const deps = incoming.get(edge.to);
		if (deps) deps.push(edge.from);
	}
	const layer = new Map<string, number>();
	let changed = true;
	let guard = 0;
	while (changed && guard++ < ids.length + 2) {
		changed = false;
		for (const id of ids) {
			const deps = incoming.get(id) ?? [];
			if (deps.some((dep) => layer.get(dep) === undefined)) continue;
			let next = 0;
			for (const dep of deps) {
				const depLayer = layer.get(dep);
				if (depLayer !== undefined && depLayer + 1 > next) next = depLayer + 1;
			}
			if (layer.get(id) !== next) {
				layer.set(id, next);
				changed = true;
			}
		}
	}
	for (const id of ids) {
		if (layer.get(id) === undefined) layer.set(id, 0);
	}
	const columns = new Map<number, string[]>();
	for (const id of ids) {
		const L = layer.get(id) ?? 0;
		const column = columns.get(L);
		if (column) column.push(id);
		else columns.set(L, [id]);
	}
	const positions = new Map<string, { x: number; y: number }>();
	for (const [L, column] of columns) {
		for (let row = 0; row < column.length; row++) {
			const id = column[row];
			if (id === undefined) continue;
			positions.set(id, { x: 24 + L * (NODE_W + GAP_X), y: 24 + row * (NODE_H + GAP_Y) });
		}
	}
	return positions;
}

/**
 * Project the store snapshot into canvas nodes and edges. Coordinates come from layout, not from
 * the issue records. Passing a filtered overview drops hidden issues and dangling edges.
 */
export function projectGraph(overview: Overview): GraphProjection {
	const attempted = new Set(overview.live?.attempted ?? []);
	const positions = layoutPositions(overview.issues, overview.edges);
	const nodes: ViewNode[] = overview.issues.map((issue) => {
		const title = issue.title.length > 28 ? `${issue.title.slice(0, 27)}\u2026` : issue.title;
		return {
			id: issue.id,
			position: positions.get(issue.id) ?? { x: 24, y: 24 },
			data: {
				handle: issue.handle ?? issue.id,
				title,
				domain: issue.domain,
				status: issue.status,
				live: attempted.has(issue.id),
			},
		};
	});
	const edges: ViewEdge[] = overview.edges.map((edge) => ({
		id: `${edge.from}\t${edge.to}\t${edge.type}`,
		source: edge.from,
		target: edge.to,
		relation: edge.type,
	}));
	return { nodes, edges };
}

/**
 * A canvas connect is a view gesture. This issue does not write an edge; the store stays as it is.
 * Issue 07 is the write.
 */
export function writeForConnect(_source: string, _target: string): null {
	return null;
}
