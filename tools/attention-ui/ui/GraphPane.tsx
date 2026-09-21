/**
 * Client-only mount of the attention canvas. SSR leaves an empty #graph so the inbox HTML
 * does not wait on React Flow.
 */
import { lazy, Suspense, useEffect, useState } from "react";
import type { Overview } from "../../operator-ui/model.ts";

const Graph = lazy(() => import("./Graph.tsx").then((mod) => ({ default: mod.Graph })));

export type GraphPaneProps = {
	overview: Overview | undefined;
	error: boolean;
	selectedId: string | undefined;
	onSelect: (id: string | undefined) => void;
	writeEndpoint: string | null;
	onWritten: () => void;
};

export function GraphPane(props: GraphPaneProps) {
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);
	if (!mounted) return <section id="graph" />;
	if (props.overview === undefined) {
		return (
			<section id="graph">
				<p className="p-4 text-sm text-muted-foreground">{props.error ? "Graph failed to load." : "Loading graph…"}</p>
			</section>
		);
	}
	return (
		<section id="graph">
			<Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Loading graph…</p>}>
				<Graph
					overview={props.overview}
					selectedId={props.selectedId}
					onSelect={props.onSelect}
					writeEndpoint={props.writeEndpoint}
					onWritten={props.onWritten}
				/>
			</Suspense>
		</section>
	);
}
