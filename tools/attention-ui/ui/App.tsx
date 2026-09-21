/**
 * Attention inbox: the human face of the same JSON a session boots from. First nonempty bucket is
 * the default focus. A row's `next` is the only primary act. The beads graph sits on the same page.
 */
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Inbox, Play, Plus } from "lucide-react";
import { useCallback, useMemo, useState, type FormEvent } from "react";
import { Toaster, toast } from "sonner";
import { postOperatorAction } from "../../operator-ui/client.ts";
import { TRIAGE_LABELS } from "../../operator-ui/triage-labels.ts";
import {
	BUCKET_ORDER,
	bucketCounts,
	firstNonempty,
	isLaunchNext,
	rowsIn,
	type AttentionNext,
	type AttentionRow,
	type AttentionSnapshot,
	type BucketKey,
} from "../snapshot.ts";
import { featureOf, type Overview, type OverviewComment } from "../../operator-ui/model.ts";
import { GraphPane } from "./GraphPane.tsx";
import {
	Badge,
	Button,
	Dialog,
	Input,
	Label,
	ScrollArea,
	Separator,
	Tabs,
	TabsList,
	TabsTrigger,
	Textarea,
	Tooltip,
	TooltipProvider,
} from "./kit.tsx";

export type PageAttention = {
	snapshot: AttentionSnapshot;
	commentEndpoint: string | null;
	attentionEndpoint: string | null;
	overviewEndpoint: string | null;
	graph: Overview | null;
	actor: string | null;
};

const BUCKET_LABEL: Record<BucketKey, string> = {
	leftovers: "Leftovers",
	stuck: "Stuck",
	drafts: "Drafts",
	"ready.development": "Ready · development",
	"ready.inquiry": "Ready · inquiry",
	"ready.experiments": "Ready · experiments",
	unread_experiments: "Unread experiments",
	braked: "Braked",
};

function nextLabel(next: AttentionNext): string {
	if (next === "wait") return "Wait";
	if (next === "drain") return "Start drain";
	if (next === "inquiry") return "Start inquiry";
	if (next === "experiment") return "Start experiment";
	if (next === "grill") return "Start grill";
	if (next === "triage") return "Triage";
	if (next === "accept-or-edit-or-reject") return "Accept, edit, or reject in a session";
	return "Read or decline in a session";
}

function launchIntent(next: AttentionNext): "start" | "grill" | undefined {
	if (next === "grill") return "grill";
	if (next === "drain" || next === "inquiry" || next === "experiment") return "start";
	return undefined;
}

export function App({ attention }: { attention: PageAttention }) {
	const client = useMemo(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: { retry: false, refetchOnWindowFocus: false, staleTime: Number.POSITIVE_INFINITY },
				},
			}),
		[],
	);
	return (
		<QueryClientProvider client={client}>
			<TooltipProvider>
				<InboxPage attention={attention} />
				<Toaster />
			</TooltipProvider>
		</QueryClientProvider>
	);
}

function InboxPage({ attention }: { attention: PageAttention }) {
	const queryClient = useQueryClient();
	const query = useQuery({
		queryKey: ["attention"],
		queryFn: async () => {
			const endpoint = attention.attentionEndpoint;
			if (endpoint === null) return attention.snapshot;
			const res = await fetch(endpoint);
			if (!res.ok) throw new Error(await res.text());
			return (await res.json()) as AttentionSnapshot;
		},
		initialData: attention.snapshot,
		enabled: attention.attentionEndpoint !== null,
	});
	const snapshot = query.data ?? attention.snapshot;
	const counts = bucketCounts(snapshot);
	const boot = firstNonempty(snapshot);
	const [focus, setFocus] = useState<BucketKey>(boot?.key ?? "leftovers");
	const rows = rowsIn(snapshot, focus);
	const [selectedId, setSelectedId] = useState<string | undefined>(boot?.rows[0]?.id);
	const selected = rows.find((row) => row.id === selectedId);
	const [captureOpen, setCaptureOpen] = useState(false);

	const overviewQuery = useQuery({
		queryKey: ["overview"],
		queryFn: async () => {
			const endpoint = attention.overviewEndpoint;
			if (endpoint === null) {
				if (attention.graph === null) throw new Error("overview endpoint missing");
				return attention.graph;
			}
			const res = await fetch(endpoint);
			if (!res.ok) throw new Error(await res.text());
			return (await res.json()) as Overview;
		},
		initialData: attention.graph ?? undefined,
		enabled: attention.overviewEndpoint !== null,
		refetchInterval: (current) => (current.state.data?.live ? 5000 : false),
	});
	const overviewIssue = overviewQuery.data?.issues.find((issue) => issue.id === selectedId);
	const captureSource =
		selected !== undefined
			? { id: selected.id, handle: selected.handle }
			: overviewIssue === undefined
				? undefined
				: { id: overviewIssue.id, handle: overviewIssue.handle ?? overviewIssue.id };

	// Stable: `onWritten` reaches React Flow through `onConnect`/`onEdgesChange`, and a new identity
	// every render made its store re-set those props forever.
	const refresh = useCallback((): void => {
		void queryClient.invalidateQueries({ queryKey: ["attention"] });
		void queryClient.invalidateQueries({ queryKey: ["overview"] });
	}, [queryClient]);

	return (
		<div className="flex min-h-screen flex-col bg-muted text-foreground" data-app="react" data-kit="shadcn">
			<header className="flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-3">
				<div>
					<h1 className="flex items-center gap-2 text-lg font-semibold">
						<Inbox size={18} aria-hidden="true" />
						Attention
					</h1>
					<p className="text-sm text-muted-foreground">{snapshot.target}</p>
				</div>
				<div className="flex items-center gap-2">
					<RunBanner run={snapshot.run} />
					{attention.commentEndpoint === null ? null : (
						<Button id="capture-open" variant="outline" onClick={() => setCaptureOpen(true)}>
							<Plus size={14} aria-hidden="true" />
							Capture
						</Button>
					)}
				</div>
			</header>
			<div className="grid min-h-0 flex-1 grid-cols-[14rem_16rem_minmax(0,1fr)_18rem]">
				<nav id="buckets" className="border-r border-border bg-card p-2" aria-label="Attention buckets">
					<Tabs
						value={focus}
						onValueChange={(value) => {
							const key = value as BucketKey;
							setFocus(key);
							setSelectedId(rowsIn(snapshot, key)[0]?.id);
						}}
						orientation="vertical"
					>
						<TabsList>
							{BUCKET_ORDER.map((key) => (
								<TabsTrigger key={key} value={key} data-bucket={key} data-count={String(counts[key])}>
									<span>{BUCKET_LABEL[key]}</span>
									<Badge>{counts[key]}</Badge>
								</TabsTrigger>
							))}
						</TabsList>
					</Tabs>
				</nav>
				<main id="focus" data-focus={focus} className="min-h-0 bg-muted/40">
					{rows.length === 0 ? (
						<p id="empty" className="p-8 text-sm text-muted-foreground">
							{boot === undefined ? "No work is waiting." : `${BUCKET_LABEL[focus]} is empty.`}
						</p>
					) : (
						<ScrollArea className="h-full">
							<ul id="attention-list" className="divide-y divide-border bg-card">
								{rows.map((row) => (
									<li key={row.id}>
										<button
											type="button"
											className={`attention-row flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-accent ${selected?.id === row.id ? "bg-accent" : ""}`}
											data-handle={row.handle}
											data-next={row.next}
											data-id={row.id}
											onClick={() => setSelectedId(row.id)}
										>
											<span className="min-w-0">
												<span className="block font-medium">{row.handle}</span>
												<span className="block truncate text-sm text-muted-foreground">{row.title ?? row.type ?? ""}</span>
											</span>
											<Badge data-next={row.next}>{row.next}</Badge>
										</button>
									</li>
								))}
							</ul>
						</ScrollArea>
					)}
				</main>
				{attention.overviewEndpoint === null && attention.graph === null ? (
					<section id="graph" />
				) : (
					<GraphPane
						overview={overviewQuery.data}
						error={overviewQuery.isError}
						selectedId={selectedId}
						onSelect={setSelectedId}
						writeEndpoint={attention.commentEndpoint}
						onWritten={refresh}
					/>
				)}
				<aside className="overflow-y-auto border-l border-border bg-card p-4">
					{selected !== undefined ? (
						<ItemDetail
							row={selected}
							comments={overviewIssue?.comments ?? []}
							held={snapshot.run.held}
							endpoint={attention.commentEndpoint}
							onWrote={refresh}
						/>
					) : overviewIssue !== undefined ? (
						<div id="detail" className="flex flex-col gap-2">
							<p className="font-medium">{overviewIssue.handle ?? overviewIssue.id}</p>
							<p className="text-sm text-muted-foreground">{overviewIssue.title}</p>
							<p className="text-sm text-muted-foreground">Not in this attention bucket. Capture still grows from it.</p>
							<CommentList comments={overviewIssue.comments} />
						</div>
					) : (
						<p className="text-sm text-muted-foreground">Pick a row.</p>
					)}
				</aside>
			</div>
			<CaptureDialog
				open={captureOpen}
				onClose={() => setCaptureOpen(false)}
				endpoint={attention.commentEndpoint}
				source={captureSource}
				onWrote={() => {
					setCaptureOpen(false);
					refresh();
				}}
			/>
		</div>
	);
}

function RunBanner({ run }: { run: AttentionSnapshot["run"] }) {
	if (!run.held) {
		return (
			<p id="run" data-held="false" className="text-sm text-muted-foreground">
				Run free
			</p>
		);
	}
	return (
		<p id="run" data-held="true" className="flex items-center gap-2 rounded-md border border-warning-border bg-warning px-2 py-1 text-sm">
			<AlertCircle size={14} aria-hidden="true" />
			Held{run.kind !== undefined ? ` ${run.kind}` : ""} {run.runId}
		</p>
	);
}

function ItemDetail(props: {
	row: AttentionRow;
	comments: OverviewComment[];
	held: boolean;
	endpoint: string | null;
	onWrote: () => void;
}) {
	const row = props.row;
	const waiting =
		row.waiting_on === undefined || row.waiting_on.length === 0
			? ""
			: row.waiting_on.map((item) => `${item.handle} (${item.why})`).join(", ");
	return (
		<div id="detail" className="flex flex-col gap-3">
			<div>
				<p className="font-medium">{row.handle}</p>
				<p className="text-sm text-muted-foreground">{row.title ?? row.type ?? row.bucket}</p>
			</div>
			<div className="flex flex-wrap gap-1">
				<Badge>{row.next}</Badge>
				{row.contract === "missing" ? <Badge className="border-warning-border bg-warning">contract missing</Badge> : null}
				{row.contract === "present" ? <Badge>contract present</Badge> : null}
				{row.attempts_failed !== undefined && row.attempts_failed > 0 ? (
					<Badge>attempts {row.attempts_failed}</Badge>
				) : null}
				{(row.labels ?? []).map((label) => (
					<Badge key={label}>{label}</Badge>
				))}
			</div>
			{waiting === "" ? null : <p className="text-sm">Waiting on {waiting}</p>}
			<CommentList comments={props.comments} />
			<Separator />
			<PrimaryAct row={row} held={props.held} endpoint={props.endpoint} onWrote={props.onWrote} />
		</div>
	);
}

/** A node's comments are `bd comment` on the bead; this is that same store text, read back. */
function CommentList({ comments }: { comments: OverviewComment[] }) {
	return (
		<div className="flex flex-col gap-2">
			<p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Comments</p>
			{comments.length === 0 ? (
				<p className="text-sm text-muted-foreground">None.</p>
			) : (
				<ul id="comments" className="flex flex-col gap-2">
					{comments.map((comment) => (
						<li key={comment.id} className="rounded-md border border-border bg-muted/40 px-2 py-1.5">
							<p className="text-xs text-muted-foreground">
								{comment.author}
								{comment.createdAt === "" ? "" : ` · ${comment.createdAt}`}
							</p>
							<p className="text-sm break-words whitespace-pre-wrap">{comment.text}</p>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function PrimaryAct(props: {
	row: AttentionRow;
	held: boolean;
	endpoint: string | null;
	onWrote: () => void;
}) {
	const { row, held, endpoint, onWrote } = props;
	const [text, setText] = useState("");
	if (endpoint === null) {
		return <p className="text-sm text-muted-foreground">{nextLabel(row.next)}</p>;
	}
	if (row.next === "wait" || (held && isLaunchNext(row.next))) {
		return (
			<p id="act" data-act="wait" className="text-sm">
				Target already held
			</p>
		);
	}
	const launch = launchIntent(row.next);
	if (launch !== undefined) {
		return (
			<Tooltip label={nextLabel(row.next)}>
				<Button
					id="act"
					data-act={launch}
					onClick={() => {
						void postOperatorAction(endpoint, { intent: launch, ids: [row.id] })
							.then(() => {
								toast.success(nextLabel(row.next));
								onWrote();
							})
							.catch((error: unknown) => toast.error(error instanceof Error ? error.message : String(error)));
					}}
				>
					<Play size={14} aria-hidden="true" />
					{nextLabel(row.next)}
				</Button>
			</Tooltip>
		);
	}
	if (row.next === "triage") {
		return (
			<div id="act" data-act="triage" className="flex flex-wrap gap-1">
				{TRIAGE_LABELS.map((label) => (
					<Button
						key={label}
						variant="outline"
						onClick={() => {
							void postOperatorAction(endpoint, { intent: "triage", id: row.id, label })
								.then(() => {
									toast.success(label);
									onWrote();
								})
								.catch((error: unknown) => toast.error(error instanceof Error ? error.message : String(error)));
						}}
					>
						{label}
					</Button>
				))}
			</div>
		);
	}
	return (
		<form
			id="act"
			data-act="comment"
			className="flex flex-col gap-2"
			onSubmit={(event: FormEvent) => {
				event.preventDefault();
				if (text.trim() === "") return;
				void postOperatorAction(endpoint, { intent: "comment", id: row.id, text: text.trim() })
					.then(() => {
						setText("");
						toast.success("Commented");
						onWrote();
					})
					.catch((error: unknown) => toast.error(error instanceof Error ? error.message : String(error)));
			}}
		>
			<p className="text-sm text-muted-foreground">{nextLabel(row.next)}</p>
			<Textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Comment" />
			<Button type="submit">Comment</Button>
		</form>
	);
}

function CaptureDialog(props: {
	open: boolean;
	onClose: () => void;
	endpoint: string | null;
	source?: { id: string; handle: string };
	onWrote: () => void;
}) {
	if (props.endpoint === null) return null;
	return (
		<Dialog id="create" open={props.open} onClose={props.onClose} title="Capture" description="A decision. Ungated. No YAML head. Publication is /to-tickets.">
			<CaptureFields
				key={props.source?.id ?? "bare"}
				endpoint={props.endpoint}
				source={props.source}
				onWrote={props.onWrote}
			/>
		</Dialog>
	);
}

function CaptureFields(props: {
	endpoint: string;
	source?: { id: string; handle: string };
	onWrote: () => void;
}) {
	const [feature, setFeature] = useState(featureOf(props.source?.handle));
	const [title, setTitle] = useState("");
	const [prose, setProse] = useState("");
	return (
		<form
			id="create-form"
			className="flex flex-col gap-2"
			onSubmit={(event: FormEvent) => {
				event.preventDefault();
				void postOperatorAction(props.endpoint, {
					intent: "create",
					feature,
					title,
					prose,
					...(props.source === undefined ? {} : { from: props.source.id }),
				})
					.then(() => {
						setTitle("");
						setProse("");
						toast.success("Captured");
						props.onWrote();
					})
					.catch((error: unknown) => toast.error(error instanceof Error ? error.message : String(error)));
			}}
		>
			{props.source === undefined ? null : (
				<p id="create-from" className="text-sm text-muted-foreground" data-from={props.source.id}>
					Grow from {props.source.handle}
				</p>
			)}
			<Label htmlFor="create-feature">Feature</Label>
			<Input id="create-feature" value={feature} onChange={(event) => setFeature(event.target.value)} />
			<Label htmlFor="create-title">Title</Label>
			<Input id="create-title" value={title} onChange={(event) => setTitle(event.target.value)} />
			<Label htmlFor="create-prose">Prose</Label>
			<Textarea id="create-prose" value={prose} onChange={(event) => setProse(event.target.value)} />
			<Button type="submit">Capture</Button>
		</form>
	);
}
