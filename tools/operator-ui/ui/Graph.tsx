/**
 * React Flow as a view of the store graph. Positions live in this component. Issues sit in three
 * domain lanes; the default frame is the neighbourhood of the selection, and Show all opts into the
 * full graph. onConnect proposes into the write door — same-domain `blocks`, cross-domain a pick of
 * `relates-to` or `discovered-from` — and never lands an edge on React state. A successful write
 * re-reads the store and the canvas keeps the coordinates already dragged; a refusal leaves the view
 * unchanged. Dragging a box selects the issues inside it; Shift adds to the selection. Delete on a
 * node opens confirm delete for the selected set; Delete on an edge still writes `remove-edge`.
 * `fitView` runs once on init, never after a write.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Lightbulb, Link2 } from "lucide-react";
import { toast } from "sonner";
import {
	Background,
	Controls,
	Handle,
	MarkerType,
	Panel,
	Position,
	ReactFlow,
	applyEdgeChanges,
	applyNodeChanges,
	type Connection,
	type Edge,
	type EdgeChange,
	type Node,
	type NodeChange,
	type NodeProps,
} from "@xyflow/react";
import { postOperatorAction } from "../client.ts";
import {
	LANE_LABEL,
	projectGraph,
	proposeConnect,
	type ViewNodeData,
} from "../graph-view.ts";
import { cn } from "./cn.ts";
import { Button, Label, Popover } from "./kit.tsx";
import type { Overview, OverviewDomain } from "../model.ts";

type IssueNode = Node<ViewNodeData, "issue">;
type LaneNode = Node<{ domain: OverviewDomain }, "lane">;
type CanvasNode = IssueNode | LaneNode;
type RelationEdge = Edge<{ relation: string }>;

function IssueNodeView({ data, selected }: NodeProps<IssueNode>) {
	return (
		<div
			className={cn(
				"issue-node",
				`domain-${data.domain}`,
				`status-${data.status}`,
				selected && "selected",
				data.live && "live",
			)}
		>
			<Handle type="target" position={Position.Left} />
			<div className="issue-id">{data.handle}</div>
			<div className="issue-title">{data.title}</div>
			{data.live ? <span className="live-tag">live</span> : null}
			<Handle type="source" position={Position.Right} />
		</div>
	);
}

function LaneNodeView({ data }: NodeProps<LaneNode>) {
	return (
		<div className={cn("lane-band", `lane-${data.domain}`)}>
			<span className="lane-label">{LANE_LABEL[data.domain]}</span>
		</div>
	);
}

const nodeTypes = { issue: IssueNodeView, lane: LaneNodeView };

function toFlow(
	overview: Overview,
	selected: string[],
	showAll: boolean,
): { nodes: CanvasNode[]; edges: RelationEdge[] } {
	const projected = projectGraph(overview, { selected, showAll });
	const selectedSet = new Set(selected);
	const lanes: LaneNode[] = projected.lanes.map((lane) => ({
		id: `lane:${lane.id}`,
		type: "lane" as const,
		position: lane.position,
		data: { domain: lane.id },
		selectable: false,
		draggable: false,
		connectable: false,
		focusable: false,
		deletable: false,
		zIndex: -1,
		width: lane.width,
		height: lane.height,
		style: { width: lane.width, height: lane.height },
	}));
	const issues: IssueNode[] = projected.nodes.map((node) => ({
		id: node.id,
		type: "issue" as const,
		position: node.position,
		data: node.data,
		selected: selectedSet.has(node.id),
	}));
	return {
		nodes: [...lanes, ...issues],
		edges: projected.edges.map((edge) => ({
			id: edge.id,
			source: edge.source,
			target: edge.target,
			data: { relation: edge.relation },
			className: edge.relation === "blocks" ? "edge-blocks" : "edge-handoff",
			style: edge.relation === "blocks" ? undefined : { strokeDasharray: "6 4" },
			markerEnd: { type: MarkerType.ArrowClosed },
		})),
	};
}

function sameIdSet(left: readonly string[], right: readonly string[]): boolean {
	if (left.length !== right.length) return false;
	const rightSet = new Set(right);
	return left.every((id) => rightSet.has(id));
}

function GraphCanvas(props: {
	overview: Overview;
	selected: string[];
	onSelect: (ids: string[]) => void;
	onAskDelete?: () => void;
	writeEndpoint: string | null;
	onWritten: () => void;
}) {
	const { overview, selected, onSelect, onAskDelete, writeEndpoint, onWritten } = props;
	const dragged = useRef<Record<string, { x: number; y: number }>>({});
	const boxSelecting = useRef(false);
	const fitted = useRef(false);
	const [showAll, setShowAll] = useState(false);
	const projected = useMemo(() => toFlow(overview, selected, showAll), [overview, selected, showAll]);
	const [nodes, setNodes] = useState<CanvasNode[]>(projected.nodes);
	const [edges, setEdges] = useState<RelationEdge[]>(projected.edges);
	const [pick, setPick] = useState<{ from: string; to: string } | null>(null);
	const [status, setStatus] = useState("");

	useEffect(() => {
		setNodes(
			projected.nodes.map((node) =>
				node.type === "issue" ? { ...node, position: dragged.current[node.id] ?? node.position } : node,
			),
		);
		setEdges(projected.edges);
	}, [projected]);

	const onNodesChange = useCallback(
		(changes: NodeChange<CanvasNode>[]) => {
			if (changes.some((change) => change.type === "remove")) onAskDelete?.();
			const kept = changes.filter((change) => change.type !== "remove");
			if (kept.length === 0) return;
			setNodes((current) => {
				const next = applyNodeChanges(kept, current);
				for (const change of kept) {
					if (change.type === "position" && change.position !== undefined && !change.id.startsWith("lane:")) {
						dragged.current[change.id] = change.position;
					}
				}
				return next;
			});
		},
		[onAskDelete],
	);

	const writeEdge = useCallback(
		(intent: "add-edge" | "remove-edge", from: string, to: string, type: string) => {
			if (writeEndpoint === null) return;
			setStatus("");
			void postOperatorAction(writeEndpoint, { intent, from, to, type })
				.then(() => {
					onWritten();
				})
				.catch((error: unknown) => {
					const reason = error instanceof Error ? error.message : String(error);
					setStatus(reason);
					toast.error(reason);
				})
				// Either way the choice is spent: the edge landed, or the door refused it and said why. A
				// picker left open after a success let the operator post the same crossing twice.
				.finally(() => setPick(null));
		},
		[writeEndpoint, onWritten],
	);

	const onConnect = useCallback(
		(connection: Connection) => {
			if (connection.source === null || connection.target === null) return;
			const sourceIssue = overview.issues.find((issue) => issue.id === connection.source);
			const targetIssue = overview.issues.find((issue) => issue.id === connection.target);
			if (sourceIssue === undefined || targetIssue === undefined) return;
			const proposal = proposeConnect(
				connection.source,
				connection.target,
				sourceIssue.domain,
				targetIssue.domain,
			);
			if ("pick" in proposal) {
				setPick({ from: proposal.from, to: proposal.to });
				return;
			}
			writeEdge("add-edge", proposal.from, proposal.to, proposal.type);
		},
		[overview, writeEdge],
	);

	const onEdgesChange = useCallback(
		(changes: EdgeChange<RelationEdge>[]) => {
			const kept = changes.filter((change) => change.type !== "remove");
			if (kept.length > 0) {
				setEdges((current) => applyEdgeChanges(kept, current));
			}
			const selectedSet = new Set(selected);
			for (const change of changes) {
				if (change.type !== "remove") continue;
				const edge = edges.find((item) => item.id === change.id);
				const relation = edge?.data?.relation;
				if (edge === undefined || relation === undefined) continue;
				// A node Delete also removes connected edges in React Flow; those are not an edge write.
				if (selectedSet.has(edge.source) || selectedSet.has(edge.target)) continue;
				writeEdge("remove-edge", edge.source, edge.target, relation);
			}
		},
		[edges, selected, writeEdge],
	);

	const onSelectionChange = useCallback(
		({ nodes: next }: { nodes: Array<{ id: string }>; edges: unknown[] }) => {
			const ids = next.map((node) => node.id);
			if (sameIdSet(ids, selected)) return;
			onSelect(ids);
		},
		[onSelect, selected],
	);

	const onSelectionStart = useCallback(() => {
		boxSelecting.current = true;
	}, []);

	const onSelectionEnd = useCallback(() => {
		// React Flow also fires onPaneClick at the end of a box drag; keep the flag through that click.
		requestAnimationFrame(() => {
			boxSelecting.current = false;
		});
	}, []);

	const onPaneClick = useCallback(() => {
		if (boxSelecting.current) return;
		onSelect([]);
	}, [onSelect]);

	const onInit = useCallback((instance: { fitView: () => void }) => {
		if (fitted.current) return;
		fitted.current = true;
		instance.fitView();
	}, []);

	const onBeforeDelete = useCallback(
		async ({ nodes: removing }: { nodes: Array<{ id: string }>; edges: unknown[] }) => {
			if (removing.length === 0) return true;
			onAskDelete?.();
			return false;
		},
		[onAskDelete],
	);

	const writable = writeEndpoint !== null;

	return (
		<div className="relative">
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				onSelectionChange={onSelectionChange}
				onSelectionStart={onSelectionStart}
				onSelectionEnd={onSelectionEnd}
				onPaneClick={onPaneClick}
				onInit={onInit}
				onBeforeDelete={onBeforeDelete}
				nodeTypes={nodeTypes}
				deleteKeyCode={writable ? ["Backspace", "Delete"] : null}
				multiSelectionKeyCode="Shift"
				selectionKeyCode={null}
				selectionOnDrag
				panOnDrag={[1, 2]}
				nodesConnectable={writable}
			>
				<Background />
				<Controls />
				<Panel position="top-right" className="graph-frame-control">
					<Label>
						<input
							id="graph-show-all"
							type="checkbox"
							checked={showAll}
							onChange={() => setShowAll((on) => !on)}
						/>{" "}
						Show all
					</Label>
				</Panel>
			</ReactFlow>
			{pick === null ? null : (
				<Popover label="Choose crossing kind" open className="right-4 top-4">
					<p className="muted">Cross-domain connect cannot be blocks. Pick a crossing kind.</p>
					<div className="connect-pick-actions">
						<Button type="button" onClick={() => writeEdge("add-edge", pick.from, pick.to, "relates-to")}>
							<Link2 aria-hidden="true" size={14} />
							relates-to
						</Button>
						<Button type="button" onClick={() => writeEdge("add-edge", pick.from, pick.to, "discovered-from")}>
							<Lightbulb aria-hidden="true" size={14} />
							discovered-from
						</Button>
						<Button type="button" onClick={() => setPick(null)}>
							Cancel
						</Button>
					</div>
				</Popover>
			)}
			{status ? (
				<p className="graph-status" id="graph-status">
					{status}
				</p>
			) : null}
		</div>
	);
}

export function Graph(props: {
	overview: Overview;
	selected: string[];
	onSelect: (ids: string[]) => void;
	onAskDelete?: () => void;
	writeEndpoint: string | null;
	onWritten: () => void;
}) {
	const [ready, setReady] = useState(false);
	useEffect(() => {
		setReady(true);
	}, []);
	return (
		<div id="graph-wrap" data-graph="react-flow">
			{ready ? <GraphCanvas {...props} /> : null}
		</div>
	);
}
