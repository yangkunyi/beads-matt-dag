/**
 * Beads graph on the attention page. Positions live here. Issues sit in three domain lanes.
 * Connect proposes into the tagged write door; it does not land an edge on React state.
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
import { postOperatorAction } from "../../operator-ui/client.ts";
import { LANE_LABEL, projectGraph, proposeConnect, type ViewNodeData } from "../../operator-ui/graph-view.ts";
import type { Overview, OverviewDomain } from "../../operator-ui/model.ts";
import { cn } from "./cn.ts";
import { Button, Label } from "./kit.tsx";
import "@xyflow/react/dist/style.css";

type IssueNode = Node<ViewNodeData, "issue">;
type LaneNode = Node<{ domain: OverviewDomain }, "lane">;
type CanvasNode = IssueNode | LaneNode;
type RelationEdge = Edge<{ relation: string }>;

const DOMAIN_BORDER: Record<OverviewDomain, string> = {
	inquiry: "border-inquiry",
	development: "border-development",
	experiment: "border-experiment",
};

const LANE_FILL: Record<OverviewDomain, string> = {
	inquiry: "bg-inquiry/10",
	development: "bg-development/10",
	experiment: "bg-experiment/10",
};

function IssueNodeView({ data, selected }: NodeProps<IssueNode>) {
	return (
		<div
			className={cn(
				"relative h-[52px] w-[200px] rounded-lg border-2 bg-card px-3 py-2 text-xs",
				DOMAIN_BORDER[data.domain],
				data.status === "in_progress" && "bg-warning",
				data.status === "closed" && "bg-muted",
				selected && "border-4",
				data.live && "border-live border-[3px]",
			)}
		>
			<Handle type="target" position={Position.Left} />
			<div className="font-semibold">{data.handle}</div>
			<div className="truncate text-muted-foreground">{data.title}</div>
			{data.live ? <span className="absolute top-1.5 right-2.5 text-[10px] font-bold text-live">live</span> : null}
			<Handle type="source" position={Position.Right} />
		</div>
	);
}

function LaneNodeView({ data }: NodeProps<LaneNode>) {
	return (
		<div className={cn("relative pointer-events-none h-full w-full rounded-[10px] border border-dashed border-border", LANE_FILL[data.domain])}>
			<span className="absolute top-2 left-3 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
				{LANE_LABEL[data.domain]}
			</span>
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
			style: edge.relation === "blocks" ? undefined : { strokeDasharray: "6 4" },
			markerEnd: { type: MarkerType.ArrowClosed },
		})),
	};
}

function GraphCanvas(props: {
	overview: Overview;
	selectedId: string | undefined;
	onSelect: (id: string | undefined) => void;
	writeEndpoint: string | null;
	onWritten: () => void;
}) {
	const { overview, selectedId, onSelect, writeEndpoint, onWritten } = props;
	const dragged = useRef<Record<string, { x: number; y: number }>>({});
	const fitted = useRef(false);
	const [showAll, setShowAll] = useState(false);
	/** Memoised on the id: a fresh `[]`/`[id]` every render re-set React Flow's store forever. */
	const selected = useMemo(() => (selectedId === undefined ? [] : [selectedId]), [selectedId]);
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

	// `select` is dropped: the page owns selection, and applying it here fights the projection.
	const onNodesChange = useCallback((changes: NodeChange<CanvasNode>[]) => {
		const kept = changes.filter((change) => change.type !== "remove" && change.type !== "select");
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
	}, []);

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
			const proposal = proposeConnect(connection.source, connection.target, sourceIssue.domain, targetIssue.domain);
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
			if (kept.length > 0) setEdges((current) => applyEdgeChanges(kept, current));
			for (const change of changes) {
				if (change.type !== "remove") continue;
				const edge = edges.find((item) => item.id === change.id);
				const relation = edge?.data?.relation;
				if (edge === undefined || relation === undefined) continue;
				if (edge.source === selectedId || edge.target === selectedId) continue;
				writeEdge("remove-edge", edge.source, edge.target, relation);
			}
		},
		[edges, selectedId, writeEdge],
	);

	// Selection is written up only by clicks. Also subscribing to `onSelectionChange` made the page and
	// React Flow's store own the same fact, and the two echoed each other into React #185.
	const onNodeClick = useCallback(
		(_event: unknown, node: CanvasNode) => {
			if (node.type !== "issue") return;
			onSelect(node.id);
		},
		[onSelect],
	);

	const onPaneClick = useCallback(() => {
		onSelect(undefined);
	}, [onSelect]);

	const onInit = useCallback((instance: { fitView: () => void }) => {
		if (fitted.current) return;
		fitted.current = true;
		instance.fitView();
	}, []);

	const writable = writeEndpoint !== null;

	return (
		<div className="relative h-full">
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				onNodeClick={onNodeClick}
				onPaneClick={onPaneClick}
				onInit={onInit}
				nodeTypes={nodeTypes}
				deleteKeyCode={null}
				multiSelectionKeyCode={null}
				selectionKeyCode={null}
				panOnDrag
				nodesConnectable={writable}
			>
				<Background />
				<Controls />
				<Panel position="top-right" className="m-2 rounded-md border border-border bg-card px-2.5 py-1.5">
					<Label className="inline-flex items-center gap-2 text-xs">
						<input
							id="graph-show-all"
							type="checkbox"
							checked={showAll}
							onChange={() => setShowAll((on) => !on)}
						/>
						Show all
					</Label>
				</Panel>
			</ReactFlow>
			{pick === null ? null : (
				<div className="absolute top-4 right-4 z-10 w-72 rounded-md border border-border bg-card p-3 shadow-sm">
					<p className="text-sm text-muted-foreground">Cross-domain connect cannot be blocks. Pick a crossing kind.</p>
					<div className="mt-2 flex flex-wrap gap-2">
						<Button type="button" onClick={() => writeEdge("add-edge", pick.from, pick.to, "relates-to")}>
							<Link2 aria-hidden="true" size={14} />
							relates-to
						</Button>
						<Button type="button" onClick={() => writeEdge("add-edge", pick.from, pick.to, "discovered-from")}>
							<Lightbulb aria-hidden="true" size={14} />
							discovered-from
						</Button>
						<Button type="button" variant="outline" onClick={() => setPick(null)}>
							Cancel
						</Button>
					</div>
				</div>
			)}
			{status ? (
				<p id="graph-status" className="absolute top-3 left-3 z-10 max-w-[calc(100%-24px)] rounded-md border border-warning-border bg-warning px-2.5 py-2 text-sm">
					{status}
				</p>
			) : null}
		</div>
	);
}

export function Graph(props: {
	overview: Overview;
	selectedId: string | undefined;
	onSelect: (id: string | undefined) => void;
	writeEndpoint: string | null;
	onWritten: () => void;
}) {
	const [ready, setReady] = useState(false);
	useEffect(() => {
		setReady(true);
	}, []);
	return <div id="graph-wrap" data-graph="react-flow">{ready ? <GraphCanvas {...props} /> : null}</div>;
}
