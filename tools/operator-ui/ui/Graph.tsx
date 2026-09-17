/**
 * React Flow as a view of the store graph. Positions live in this component. onConnect proposes
 * into the write door — same-domain `blocks`, cross-domain a pick of `relates-to` or
 * `discovered-from` — and never lands an edge on React state. A successful write reloads from
 * the store; a refusal leaves the view unchanged.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
	Background,
	Controls,
	Handle,
	MarkerType,
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
import { postEdge } from "../client-edge.ts";
import { projectGraph, proposeConnect, type ViewNodeData } from "../graph-view.ts";
import { cn } from "./cn.ts";
import { Button } from "./kit.tsx";
import type { Overview } from "../model.ts";

type IssueNode = Node<ViewNodeData, "issue">;
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

const nodeTypes = { issue: IssueNodeView };

function toFlow(overview: Overview, selected: string | null): { nodes: IssueNode[]; edges: RelationEdge[] } {
	const projected = projectGraph(overview);
	return {
		nodes: projected.nodes.map((node) => ({
			id: node.id,
			type: "issue" as const,
			position: node.position,
			data: node.data,
			selected: node.id === selected,
		})),
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
	selected: string | null;
	onSelect: (id: string) => void;
	writeEndpoint: string | null;
}) {
	const { overview, selected, onSelect, writeEndpoint } = props;
	const dragged = useRef<Record<string, { x: number; y: number }>>({});
	const projected = useMemo(() => toFlow(overview, selected), [overview, selected]);
	const [nodes, setNodes] = useState<IssueNode[]>(projected.nodes);
	const [edges, setEdges] = useState<RelationEdge[]>(projected.edges);
	const [pick, setPick] = useState<{ from: string; to: string } | null>(null);
	const [status, setStatus] = useState("");

	useEffect(() => {
		setNodes(
			projected.nodes.map((node) => ({
				...node,
				position: dragged.current[node.id] ?? node.position,
			})),
		);
		setEdges(projected.edges);
	}, [projected]);

	const onNodesChange = useCallback((changes: NodeChange<IssueNode>[]) => {
		const kept = changes.filter((change) => change.type !== "remove");
		if (kept.length === 0) return;
		setNodes((current) => {
			const next = applyNodeChanges(kept, current);
			for (const change of kept) {
				if (change.type === "position" && change.position !== undefined) {
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
			void postEdge(writeEndpoint, intent, from, to, type)
				.then(() => {
					location.reload();
				})
				.catch((error: unknown) => {
					setPick(null);
					setStatus(error instanceof Error ? error.message : String(error));
				});
		},
		[writeEndpoint],
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
			for (const change of changes) {
				if (change.type !== "remove") continue;
				const edge = edges.find((item) => item.id === change.id);
				const relation = edge?.data?.relation;
				if (edge === undefined || relation === undefined) continue;
				writeEdge("remove-edge", edge.source, edge.target, relation);
			}
		},
		[edges, writeEdge],
	);

	const onNodeClick = useCallback(
		(_event: MouseEvent, node: IssueNode) => {
			onSelect(node.id);
		},
		[onSelect],
	);

	const writable = writeEndpoint !== null;

	return (
		<>
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				onNodeClick={onNodeClick}
				nodeTypes={nodeTypes}
				fitView
				deleteKeyCode={writable ? ["Backspace", "Delete"] : null}
				nodesConnectable={writable}
			>
				<Background />
				<Controls />
			</ReactFlow>
			{pick ? (
				<div className="connect-pick" role="dialog" aria-label="Choose crossing kind">
					<p>Cross-domain connect cannot be blocks. Pick a crossing kind.</p>
					<Button type="button" onClick={() => writeEdge("add-edge", pick.from, pick.to, "relates-to")}>
						relates-to
					</Button>
					<Button type="button" onClick={() => writeEdge("add-edge", pick.from, pick.to, "discovered-from")}>
						discovered-from
					</Button>
					<Button type="button" onClick={() => setPick(null)}>
						Cancel
					</Button>
				</div>
			) : null}
			{status ? (
				<p className="graph-status" id="graph-status">
					{status}
				</p>
			) : null}
		</>
	);
}

export function Graph(props: {
	overview: Overview;
	selected: string | null;
	onSelect: (id: string) => void;
	writeEndpoint: string | null;
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
