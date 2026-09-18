/**
 * The operator graph as a view of the store.
 *
 * Nodes and edges here are a projection of beads issues and dependencies. Coordinates are computed
 * for the canvas and are not a store field. A connect gesture proposes an edge into the write door;
 * it is not itself a store write.
 */

import { dagre } from "d3-dag";
import { featureOf, type Overview, type OverviewDomain, type OverviewEdge, type OverviewIssue } from "./model";

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
const MARGIN = 24;

function unique(values: string[]): string[] {
	return [...new Set(values)].sort();
}

/** Checkbox values for the type / status / label / feature filters, derived from the store snapshot. */
export function filterChoices(issues: ReadonlyArray<OverviewIssue>): {
	types: string[];
	statuses: string[];
	labels: { value: string; label: string }[];
	features: { value: string; label: string }[];
} {
	const types = unique(issues.map((issue) => issue.type));
	const statuses = unique(issues.map((issue) => issue.status));
	const labelValues = unique(issues.flatMap((issue) => issue.labels));
	const hasUnlabeled = issues.some((issue) => issue.labels.length === 0);
	const labels = [
		...(hasUnlabeled ? [{ value: "", label: "(none)" }] : []),
		...labelValues.map((label) => ({ value: label, label })),
	];
	const featureValues = unique(issues.map((issue) => featureOf(issue.handle)).filter((feature) => feature !== ""));
	const hasNoFeature = issues.some((issue) => featureOf(issue.handle) === "");
	const features = [
		...(hasNoFeature ? [{ value: "", label: "(none)" }] : []),
		...featureValues.map((feature) => ({ value: feature, label: feature })),
	];
	return { types, statuses, labels, features };
}

/**
 * The `blocks` edges a layout can use: those among the shown issues, minus the ones that close a cycle.
 *
 * d3-dag refuses a cyclic graph outright, and the old hand-rolled layering survived one: it pinned the
 * cycle's own nodes at layer 0 and laid out the rest, while falling back to a single column drops the
 * whole graph because one pair of issues points at each other. A depth-first walk that sets aside the
 * edges back to a node still on the stack keeps every other column intact. The set-aside edge still
 * renders — it just does not decide a layer.
 */
function acyclicBlocks(ids: ReadonlyArray<string>, blocks: ReadonlyArray<{ from: string; to: string }>): { from: string; to: string }[] {
	const out = new Map<string, { from: string; to: string }[]>();
	for (const id of ids) out.set(id, []);
	for (const block of blocks) out.get(block.from)?.push(block);
	const OPEN = 1;
	const DONE = 2;
	const state = new Map<string, number>();
	const kept: { from: string; to: string }[] = [];
	for (const root of ids) {
		if (state.has(root)) continue;
		// An explicit stack rather than recursion: a Target's graph is small, and this is exactly the kind
		// of walk that would fail on the graph that finally mattered.
		const frames = [{ id: root, next: 0 }];
		state.set(root, OPEN);
		while (frames.length > 0) {
			const frame = frames[frames.length - 1]!;
			const edges = out.get(frame.id) ?? [];
			if (frame.next >= edges.length) {
				state.set(frame.id, DONE);
				frames.pop();
				continue;
			}
			const edge = edges[frame.next++]!;
			const seen = state.get(edge.to);
			if (seen === OPEN) continue;
			kept.push(edge);
			if (seen === DONE) continue;
			state.set(edge.to, OPEN);
			frames.push({ id: edge.to, next: 0 });
		}
	}
	return kept;
}

/**
 * Layered positions from `blocks` edges only, via d3-dag's dagre-compatible sugiyama layout, which
 * minimises edge crossings. Relates-to / discovered-from do not pull a node into a later column.
 * The numbers live in the view; they are never written back.
 *
 * d3-dag refuses a node it was given no size for, so a snapshot it will not take falls back to a plain
 * column rather than taking the page down: this is a view, and one that declines to draw is worse than
 * one drawn crudely. A cycle is not one of those cases — it is handled above, so one bad edge does not
 * cost the whole graph its shape.
 */
export function layoutPositions(
	issues: ReadonlyArray<{ id: string }>,
	edges: ReadonlyArray<Pick<OverviewEdge, "from" | "to" | "type">>,
): Map<string, { x: number; y: number }> {
	const ids = issues.map((issue) => issue.id);
	const idSet = new Set(ids);
	try {
		const grf = new dagre.graphlib.Graph();
		grf.setGraph({ rankdir: "LR", nodesep: GAP_Y, ranksep: GAP_X });
		grf.setDefaultEdgeLabel(() => ({}));
		for (const id of ids) grf.setNode(id, { width: NODE_W, height: NODE_H });
		const blocks = edges.filter(
			(edge) => edge.type === "blocks" && idSet.has(edge.from) && idSet.has(edge.to),
		);
		for (const edge of acyclicBlocks(ids, blocks)) grf.setEdge(edge.from, edge.to);
		dagre.layout(grf);
		const positions = new Map<string, { x: number; y: number }>();
		for (const id of ids) {
			const node = grf.node(id) as { x: number; y: number } | undefined;
			if (node === undefined) continue;
			// dagre reports centres; a React Flow node is positioned by its top-left corner.
			positions.set(id, { x: MARGIN + node.x - NODE_W / 2, y: MARGIN + node.y - NODE_H / 2 });
		}
		return positions;
	} catch {
		return columnPositions(ids);
	}
}

/** The fallback for a snapshot d3-dag would not accept: one column, store order. */
function columnPositions(ids: ReadonlyArray<string>): Map<string, { x: number; y: number }> {
	const positions = new Map<string, { x: number; y: number }>();
	ids.forEach((id, row) => {
		positions.set(id, { x: MARGIN, y: MARGIN + row * (NODE_H + GAP_Y) });
	});
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

export type CrossingKind = "relates-to" | "discovered-from";

/** Same-domain connect proposes `blocks`. Cross-domain connect does not default. */
export type ConnectProposal =
	| { from: string; to: string; type: "blocks" }
	| { from: string; to: string; pick: readonly CrossingKind[] };

/**
 * A canvas connect is a proposal, never a store write. Same domain → `blocks`. Across domains the
 * operator must pick `relates-to` or `discovered-from`.
 */
export function proposeConnect(
	source: string,
	target: string,
	sourceDomain: OverviewDomain,
	targetDomain: OverviewDomain,
): ConnectProposal {
	if (sourceDomain === targetDomain) {
		return { from: source, to: target, type: "blocks" };
	}
	return { from: source, to: target, pick: ["relates-to", "discovered-from"] };
}
