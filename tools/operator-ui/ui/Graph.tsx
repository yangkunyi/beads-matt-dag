/**
 * React Flow as a view of the store graph. Positions live in this component. onConnect does not
 * write an edge — writeForConnect returns null in this issue. Shift-click adds to the selection
 * so start can take more than one id.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
	Background,
	Controls,
	Handle,
	MarkerType,
	Position,
	ReactFlow,
	applyNodeChanges,
	type Connection,
	type Edge,
	type Node,
	type NodeChange,
	type NodeProps,
} from "@xyflow/react";
import { projectGraph, writeForConnect, type ViewNodeData } from "../graph-view.ts";
import { cn } from "./cn.ts";
import type { Overview } from "../model.ts";

type IssueNode = Node<ViewNodeData, "issue">;

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

function toFlow(overview: Overview, selected: string[]): { nodes: IssueNode[]; edges: Edge[] } {
	const projected = projectGraph(overview);
	const selectedSet = new Set(selected);
	return {
		nodes: projected.nodes.map((node) => ({
			id: node.id,
			type: "issue" as const,
			position: node.position,
			data: node.data,
			selected: selectedSet.has(node.id),
		})),
		edges: projected.edges.map((edge) => ({
			id: edge.id,
			source: edge.source,
			target: edge.target,
			style: edge.relation === "blocks" ? undefined : { strokeDasharray: "6 4" },
			markerEnd: { type: MarkerType.ArrowClosed },
		})),
	};
}

function GraphCanvas(props: {
	overview: Overview;
	selected: string[];
	onSelect: (ids: string[]) => void;
}) {
	const { overview, selected, onSelect } = props;
	const dragged = useRef<Record<string, { x: number; y: number }>>({});
	const projected = useMemo(() => toFlow(overview, selected), [overview, selected]);
	const [nodes, setNodes] = useState<IssueNode[]>(projected.nodes);
	const [edges, setEdges] = useState<Edge[]>(projected.edges);

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
		setNodes((current) => {
			const next = applyNodeChanges(changes, current);
			for (const change of changes) {
				if (change.type === "position" && change.position !== undefined) {
					dragged.current[change.id] = change.position;
				}
			}
			return next;
		});
	}, []);

	const onConnect = useCallback((connection: Connection) => {
		if (connection.source === null || connection.target === null) return;
		writeForConnect(connection.source, connection.target);
	}, []);

	const onNodeClick = useCallback(
		(event: MouseEvent, node: IssueNode) => {
			if (event.shiftKey) {
				onSelect(selected.includes(node.id) ? selected.filter((id) => id !== node.id) : [...selected, node.id]);
				return;
			}
			onSelect([node.id]);
		},
		[onSelect, selected],
	);

	const onPaneClick = useCallback(() => {
		onSelect([]);
	}, [onSelect]);

	return (
		<ReactFlow
			nodes={nodes}
			edges={edges}
			onNodesChange={onNodesChange}
			onConnect={onConnect}
			onNodeClick={onNodeClick}
			onPaneClick={onPaneClick}
			nodeTypes={nodeTypes}
			fitView
			deleteKeyCode={null}
			multiSelectionKeyCode="Shift"
			selectionOnDrag={false}
			nodesConnectable
		>
			<Background />
			<Controls />
		</ReactFlow>
	);
}

export function Graph(props: {
	overview: Overview;
	selected: string[];
	onSelect: (ids: string[]) => void;
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
