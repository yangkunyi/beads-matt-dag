/**
 * The operator page: a windowed issue list, the React Flow graph, the live overlay, detail whose
 * default reading is the human face (store facts, neighbours as issues, the comment thread) with
 * documents reachable and unoptimized, and the write panels — comment, create, triage, start, grill —
 * plus a command palette. All of it is a view of the store snapshot embedded in the page.
 *
 * Writes go through the tagged door: comments, create (type is the domain; needs-triage; no gate),
 * start (that domain's existing run with the selected ids as the allow-list), grill (the grill run
 * with the one selected id as its seed), intra-domain `blocks`,
 * crossing `relates-to` / `discovered-from`, one of the five triage labels replacing the rest of
 * the family, and answering a grill round. A write re-reads the store rather than reloading the page.
 * The page writes no questions of its own: the round it shows is the one a run left in the store.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getGroupedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { Command } from "cmdk";
import {
	BookOpen,
	CircleAlert,
	CircleCheck,
	CircleDashed,
	CircleDot,
	Code,
	Command as CommandIcon,
	FlaskConical,
	MessageSquare,
	Play,
	Plus,
	Tag,
	Trash2,
	type LucideIcon,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { postOperatorAction } from "../client.ts";
import { TRIAGE_LABELS, type TriageLabel } from "../triage-labels.ts";
import { planDeleteAll } from "../delete.ts";
import { filterChoices } from "../graph-view.ts";
import {
	featureOf,
	filterOverview,
	issueDetail,
	neighboursOf,
	type IssueNeighbour,
	type Overview,
	type OverviewDocument,
	type OverviewDomain,
	type OverviewIssue,
} from "../model.ts";
import { planGrill, planStart } from "../start.ts";
import { Bubble } from "./bubble.tsx";
import { cn } from "./cn.ts";
import { Graph } from "./Graph.tsx";
import { Button, Dialog, Input, Label, Select, Textarea } from "./kit.tsx";
import { MarkdownBody } from "./markdown.tsx";
import { Message, MessageContent, type MessageFrom } from "./message.tsx";

export type PageOverview = Overview & {
	commentEndpoint: string | null;
	/** Where a write re-reads the snapshot. Null on a static page, which has nothing to re-read. */
	overviewEndpoint: string | null;
	/** The door's actor. Null on a snapshot, which has no door. */
	actor: string | null;
};

/** The operator is the door's actor; anyone else on the comment is not. Named authors on a snapshot are the operator. */
export function commentFrom(author: string, actor: string | null | undefined): MessageFrom {
	const name = author.trim();
	if (name === "") return "assistant";
	if (actor !== undefined && actor !== null && actor !== "") return name === actor ? "user" : "assistant";
	return "user";
}

function initialFilter(issues: OverviewIssue[]) {
	const choices = filterChoices(issues);
	return {
		types: choices.types,
		statuses: choices.statuses,
		labels: choices.labels.map((entry) => entry.value),
		features: choices.features.map((entry) => entry.value),
	};
}

/**
 * A filter's next choice set: the values it has seen, and the values selected, after the store offers
 * `offered` again.
 *
 * Only a value the store has **never** offered is added. That single rule is what makes unchecking
 * stick, and it is why the two sets cannot be one: a value missing from `selected` looks the same
 * whether the operator turned it off or the store has never had it, so `seen` is the only thing that
 * tells them apart. Returns undefined when there is nothing new, so a caller does not set state for a
 * re-read that changed no choice.
 */
export function withNewlyOffered(
	seen: ReadonlySet<string>,
	selected: ReadonlySet<string>,
	offered: ReadonlyArray<string>,
): { seen: Set<string>; selected: Set<string> } | undefined {
	const newlyOffered = offered.filter((value) => !seen.has(value));
	if (newlyOffered.length === 0) return undefined;
	const nextSeen = new Set(seen);
	const nextSelected = new Set(selected);
	for (const value of newlyOffered) {
		nextSeen.add(value);
		nextSelected.add(value);
	}
	return { seen: nextSeen, selected: nextSelected };
}

/**
 * One filter's choice set.
 *
 * A value the store offers for the first time is selected, so an issue the operator has just created is
 * not hidden by a filter set that predates it. A value the operator unchecks leaves the selection but
 * stays in `seen`, so a re-read — or the live poll, every five seconds while a run is moving — does not
 * put it back.
 */
function useFilter(offered: ReadonlyArray<string>): [Set<string>, (value: string) => void] {
	const [state, setState] = useState(() => ({ seen: new Set(offered), selected: new Set(offered) }));
	const next = withNewlyOffered(state.seen, state.selected, offered);
	if (next !== undefined) {
		// Adjusting state during render, before anything commits: React discards this render and runs
		// again, and the second pass finds nothing new, so this cannot loop.
		setState(next);
	}
	const toggle = useCallback((value: string) => {
		setState((current) => {
			const selected = new Set(current.selected);
			if (selected.has(value)) selected.delete(value);
			else selected.add(value);
			return { seen: current.seen, selected };
		});
	}, []);
	return [state.selected, toggle];
}

/**
 * After a write: re-read the store instead of reloading the page. The canvas keeps the coordinates
 * the operator dragged, so a write reads as a write rather than a reset.
 */
function useWritten(): () => void {
	const client = useQueryClient();
	return useCallback(() => {
		void client.invalidateQueries({ queryKey: ["overview"] });
	}, [client]);
}

/**
 * One place a write reports: a toast for the act, the door's own words when it refuses, and the
 * inline line kept so a refusal is still readable once the toast has gone.
 */
function useWrite(act: string): { status: string; run: (write: Promise<unknown>) => Promise<boolean> } {
	const [status, setStatus] = useState("");
	const onWritten = useWritten();
	const run = useCallback(
		async (write: Promise<unknown>): Promise<boolean> => {
			setStatus("");
			try {
				await write;
				toast.success(act);
				onWritten();
				return true;
			} catch (error: unknown) {
				const reason = error instanceof Error ? error.message : String(error);
				setStatus(reason);
				toast.error(reason);
				return false;
			}
		},
		[act, onWritten],
	);
	return { status, run };
}

const STATUS_ICON: Record<string, LucideIcon> = {
	open: CircleDashed,
	in_progress: CircleDot,
	closed: CircleCheck,
};

const DOMAIN_ICON: Record<OverviewDomain, LucideIcon> = {
	inquiry: BookOpen,
	experiment: FlaskConical,
	development: Code,
};

/** An icon never carries the meaning alone: the status word sits beside it, or an aria-label. */
function StatusIcon({ status }: { status: string }) {
	const Icon = STATUS_ICON[status] ?? CircleDashed;
	return <Icon aria-label={`status ${status}`} size={14} className={cn("shrink-0", `status-${status}`)} />;
}

/** Issues a `blocks` edge holds back, from a blocker that is not closed. Not a status. */
function blockedIds(overview: Overview): Set<string> {
	const closed = new Set(
		overview.issues.filter((issue) => issue.status === "closed").map((issue) => issue.id),
	);
	const blocked = new Set<string>();
	for (const edge of overview.edges) {
		if (edge.type === "blocks" && !closed.has(edge.from)) blocked.add(edge.to);
	}
	return blocked;
}

const ROW_H = 30;
/** Rows to render when there is no viewport to measure: the server, and the client's first paint. */
const ROWS_WITHOUT_VIEWPORT = 40;

const issueColumns = createColumnHelper<OverviewIssue>();
const ISSUE_COLUMNS = [
	issueColumns.accessor((row) => featureOf(row.handle), { id: "feature", header: "feature" }),
	issueColumns.accessor((row) => row.handle || row.id, { id: "handle", header: "handle" }),
	issueColumns.accessor("title", { header: "title" }),
	issueColumns.accessor("status", { header: "status" }),
	issueColumns.accessor("domain", { header: "domain" }),
];

function compareFeature(a: OverviewIssue, b: OverviewIssue): number {
	const fa = featureOf(a.handle);
	const fb = featureOf(b.handle);
	if (fa === fb) return 0;
	if (fa === "") return 1;
	if (fb === "") return -1;
	return fa.localeCompare(fb);
}

/**
 * The read surface: what is in the store, not its shape. Columns from react-table, grouped by
 * feature, windowed with react-virtual, so a few hundred issues do not become a few hundred rows.
 * It selects; it never writes. The canvas is for dependency.
 */
function IssueList(props: {
	issues: OverviewIssue[];
	blocked: Set<string>;
	selected: string[];
	onSelect: (ids: string[]) => void;
}) {
	const data = useMemo(() => [...props.issues].sort(compareFeature), [props.issues]);
	const table = useReactTable({
		data,
		columns: ISSUE_COLUMNS,
		state: { grouping: ["feature"] },
		groupedColumnMode: "remove",
		getCoreRowModel: getCoreRowModel(),
		getGroupedRowModel: getGroupedRowModel(),
		getRowId: (row) => row.id,
	});
	// Group headers plus their issues, always open: scanning the list is the working view.
	const tableRows = table.getRowModel().rows.flatMap((row) => (row.getIsGrouped() ? [row, ...row.subRows] : [row]));
	const viewport = useRef<HTMLDivElement>(null);
	const virtualizer = useVirtualizer({
		count: tableRows.length,
		getScrollElement: () => viewport.current,
		estimateSize: () => ROW_H,
		overscan: 10,
	});
	const measured = virtualizer.getVirtualItems();
	// With nothing measured yet — on the server, and on the client's first paint — show the head of
	// the list, so the served page carries the issues instead of an empty box.
	const rows =
		measured.length > 0
			? measured
			: tableRows
					.slice(0, ROWS_WITHOUT_VIEWPORT)
					.map((_, index) => ({ index, key: index, start: index * ROW_H, size: ROW_H }));
	const selectedSet = new Set(props.selected);
	return (
		<section id="issue-list" className="card" aria-label="Issues">
			<div className="issue-list-head flex gap-2 px-2 text-xs">
				{table.getHeaderGroups().map((group) =>
					group.headers.map((header) => (
						<span key={header.id} className="muted">
							{flexRender(header.column.columnDef.header, header.getContext())}
						</span>
					)),
				)}
			</div>
			<div ref={viewport} className="max-h-96 overflow-auto">
				<div style={{ height: virtualizer.getTotalSize() || tableRows.length * ROW_H, position: "relative" }}>
					{rows.map((row) => {
						const tableRow = tableRows[row.index];
						if (tableRow === undefined) return null;
						if (tableRow.getIsGrouped()) {
							const feature = String(tableRow.groupingValue ?? "");
							const label = feature === "" ? "none" : feature;
							return (
								<div
									key={tableRow.id}
									className="feature-group absolute inset-x-0 flex items-center px-2"
									data-feature={label}
									style={{ top: row.start, height: row.size }}
								>
									{label}
								</div>
							);
						}
						const issue = tableRow.original;
						const DomainIcon = DOMAIN_ICON[issue.domain];
						const isSelected = selectedSet.has(issue.id);
						return (
							<button
								key={tableRow.id}
								type="button"
								data-issue={issue.id}
								aria-pressed={isSelected}
								onClick={() => props.onSelect([issue.id])}
								className={cn(
									"issue-row absolute inset-x-0 flex items-center gap-2 px-2 text-left",
									isSelected && "selected",
								)}
								style={{ top: row.start, height: row.size }}
							>
								{props.blocked.has(issue.id) ? (
									<CircleAlert aria-label="blocked" size={14} className="shrink-0 text-warning" />
								) : (
									<StatusIcon status={issue.status} />
								)}
								<span className="handle shrink-0">{issue.handle || issue.id}</span>
								<span className="title truncate">{issue.title}</span>
								<DomainIcon aria-label={issue.domain} size={14} className="ml-auto shrink-0" />
								<span className="muted shrink-0">{issue.status}</span>
							</button>
						);
					})}
				</div>
			</div>
			<p className="muted">
				{props.issues.length} shown · the list never writes: no claim, no close, no label
			</p>
		</section>
	);
}

function Filters(props: {
	issues: OverviewIssue[];
	types: Set<string>;
	statuses: Set<string>;
	labels: Set<string>;
	features: Set<string>;
	onTypes: (value: string) => void;
	onStatuses: (value: string) => void;
	onLabels: (value: string) => void;
	onFeatures: (value: string) => void;
}) {
	const choices = filterChoices(props.issues);
	return (
		<section id="filters" aria-label="Filters">
			<fieldset>
				<legend>Feature</legend>
				{choices.features.length === 0 ? (
					<p className="muted">none</p>
				) : (
					choices.features.map((entry) => (
						<Label key={entry.value || "(none)"}>
							<input
								type="checkbox"
								checked={props.features.has(entry.value)}
								onChange={() => props.onFeatures(entry.value)}
							/>{" "}
							{entry.label}
						</Label>
					))
				)}
			</fieldset>
			<fieldset>
				<legend>Type</legend>
				{choices.types.length === 0 ? (
					<p className="muted">none</p>
				) : (
					choices.types.map((type) => (
						<Label key={type}>
							<input
								type="checkbox"
								checked={props.types.has(type)}
								onChange={() => props.onTypes(type)}
							/>{" "}
							{type}
						</Label>
					))
				)}
			</fieldset>
			<fieldset>
				<legend>Status</legend>
				{choices.statuses.length === 0 ? (
					<p className="muted">none</p>
				) : (
					choices.statuses.map((status) => (
						<Label key={status}>
							<input
								type="checkbox"
								checked={props.statuses.has(status)}
								onChange={() => props.onStatuses(status)}
							/>{" "}
							{status}
						</Label>
					))
				)}
			</fieldset>
			<fieldset>
				<legend>Label</legend>
				{choices.labels.length === 0 ? (
					<p className="muted">none</p>
				) : (
					choices.labels.map((entry) => (
						<Label key={entry.value || "(none)"}>
							<input
								type="checkbox"
								checked={props.labels.has(entry.value)}
								onChange={() => props.onLabels(entry.value)}
							/>{" "}
							{entry.label}
						</Label>
					))
				)}
			</fieldset>
		</section>
	);
}

function LiveBanner({ overview }: { overview: Overview }) {
	const live = overview.live;
	if (live === null) return null;
	const n = live.attempted.length;
	return (
		<section id="live" className="card" aria-label="Live run">
			<p id="live-meta">
				<strong>Live {live.kind}</strong> · {live.id} · {live.status} · {n} attempted
				{live.log?.currentStep ? ` · step ${live.log.currentStep}` : ""}
			</p>
			<details id="live-report-wrap">
				<summary id="live-report-summary">
					{live.report ? `Last report · ${live.report.rel}` : "Last report · none yet"}
				</summary>
				<pre id="live-report">{live.report?.text ?? ""}</pre>
			</details>
		</section>
	);
}

/**
 * The two launches. Start takes the whole selection to that domain's existing run; Grill takes the
 * one selected seed to the grill run, which writes the next round onto that issue and stops. Each
 * has its own write path, so a refusal is readable beside the button that made it, and neither
 * writes the store. A run holding the Target disables both: one run at a time is the Target's rule.
 */
function StartBar(props: {
	endpoint: string;
	overview: Overview;
	selected: string[];
}) {
	const start = useWrite("started the run");
	const grill = useWrite("started the grill");
	const startPlan = planStart(props.selected, props.overview.issues, props.overview.live !== null);
	const grillPlan = planGrill(props.selected, props.overview.issues, props.overview.live !== null);
	const seed = grillPlan.ok ? issueDetail(props.overview, grillPlan.seed) : undefined;
	return (
		<section id="start" className="card" aria-label="Start selection">
			<p id="start-summary">
				{startPlan.ok ? `${props.selected.length} ${startPlan.kind}` : startPlan.reason}
			</p>
			<Button
				id="start-button"
				disabled={!startPlan.ok}
				onClick={() => void start.run(postOperatorAction(props.endpoint, { intent: "start", ids: props.selected }))}
			>
				<Play aria-hidden="true" size={14} />
				{startPlan.ok ? `Start ${startPlan.kind}` : "Start selection"}
			</Button>
			<Button
				id="grill-button"
				disabled={!grillPlan.ok}
				onClick={() => void grill.run(postOperatorAction(props.endpoint, { intent: "grill", ids: props.selected }))}
			>
				<MessageSquare aria-hidden="true" size={14} />
				{grillPlan.ok ? `Grill ${seed?.handle || grillPlan.seed}` : "Grill selection"}
			</Button>
			<p className="muted" id="start-status">
				{start.status}
			</p>
			<p className="muted" id="grill-status">
				{grill.status || (grillPlan.ok ? "" : grillPlan.reason)}
			</p>
		</section>
	);
}

function documentKindLabel(kind: OverviewDocument["kind"]): string {
	return kind === "body" ? "machine body" : kind;
}

function NeighbourGroup(props: {
	heading: string;
	items: IssueNeighbour[];
	onSelect?: (ids: string[]) => void;
}) {
	if (props.items.length === 0) return null;
	return (
		<>
			<h3>{props.heading}</h3>
			<ul className="neighbours">
				{props.items.map((item) => (
					<li key={`${item.role}:${item.relation}:${item.id}`}>
						<button
							type="button"
							className="neighbour"
							data-neighbour={item.id}
							onClick={() => props.onSelect?.([item.id])}
						>
							<span className="handle">{item.handle || item.id}</span>
							<span className="title">{item.title}</span>
							{item.role === "crossing" ? <span className="muted">{item.relation}</span> : null}
						</button>
					</li>
				))}
			</ul>
		</>
	);
}

function answersFrom(round: OverviewIssue["round"]): Record<number, string> {
	const out: Record<number, string> = {};
	if (round === null) return out;
	for (const question of round.questions) {
		if (question.answer !== undefined && question.answer !== "") out[question.n] = question.answer;
	}
	return out;
}

/**
 * The form's identity: the issue *and* the round. Keying by the issue alone made a new round on the same
 * issue look like the same form, so React kept the previous round's `selected` and every round numbering
 * its questions from `Q1` pre-checked the new round's radios — one click re-submitted round N's answers as
 * round N+1's. A round the producer did not number has no identity to key on; the marker is how the format
 * numbers a round.
 */
export function roundFormKey(issue: { id: string; round: OverviewIssue["round"] }): string {
	return `${issue.id}:${issue.round?.n ?? "?"}`;
}

/**
 * The current grill round as choices. Null round renders nothing. Keyed by `roundFormKey`, so a new round on
 * the issue remounts it with the new round's answers rather than keeping the previous round's picks.
 */
export function RoundForm(props: { endpoint: string | null; issue: OverviewIssue }) {
	const { status, run } = useWrite("saved the round");
	const round = props.issue.round;
	const [selected, setSelected] = useState<Record<number, string>>(() => answersFrom(round));
	if (round === null) return null;
	const complete = round.questions.every((question) => (selected[question.n] ?? "") !== "");
	function onSubmit(event: FormEvent) {
		event.preventDefault();
		if (round === null || props.endpoint === null || !complete) return;
		const answers = round.questions.map((question) => ({
			n: question.n,
			choice: selected[question.n] ?? "",
		}));
		void run(postOperatorAction(props.endpoint, { intent: "answer-round", id: props.issue.id, answers }));
	}
	return (
		<>
			<h3>Grill round</h3>
			<form id="grill-round" onSubmit={onSubmit}>
				{round.questions.map((question) => (
					<fieldset key={question.n} data-question={String(question.n)}>
						<legend>
							Q{question.n} {question.title}
						</legend>
						{question.body !== "" ? <p>{question.body}</p> : null}
						{question.choices.map((choice) => {
							const recommended = choice === question.recommended;
							return (
								<Label key={choice}>
									<input
										type="radio"
										name={`q${question.n}`}
										value={choice}
										checked={selected[question.n] === choice}
										onChange={() => setSelected((current) => ({ ...current, [question.n]: choice }))}
									/>{" "}
									{choice}
									{recommended ? (
										<span className="muted" data-recommended="true">
											{" "}
											recommended
										</span>
									) : null}
								</Label>
							);
						})}
					</fieldset>
				))}
				{props.endpoint ? (
					<Button type="submit" disabled={!complete}>
						Submit round
					</Button>
				) : null}
				<p className="muted">One submit for the whole round. Answers are store data, not React-only.</p>
				<p className="muted" id="grill-round-status">
					{status}
				</p>
			</form>
		</>
	);
}

/** The selected issue's human face: store facts, neighbours as issues, the comment thread. Documents stay secondary. */
export function IssueDetail(props: {
	overview: PageOverview;
	selected: string[];
	onSelect?: (ids: string[]) => void;
	onDeleted?: () => void;
	asked?: boolean;
	onAsked?: () => void;
}) {
	const focused = props.selected.length === 0 ? undefined : props.selected[props.selected.length - 1];
	const issue = focused === undefined ? undefined : issueDetail(props.overview, focused);
	if (issue === undefined) {
		return (
			<aside id="detail" className="card">
				<p className="empty">Click an issue.</p>
			</aside>
		);
	}
	const live = props.overview.live;
	const attempted = live !== null && live.attempted.includes(issue.id);
	const DomainIcon = DOMAIN_ICON[issue.domain];
	const neighbours = neighboursOf(props.overview, issue.id);
	const blockedBy = neighbours.filter((neighbour) => neighbour.role === "blocked-by");
	const blocks = neighbours.filter((neighbour) => neighbour.role === "blocks");
	const crossing = neighbours.filter((neighbour) => neighbour.role === "crossing");
	return (
		<aside id="detail" className="card">
			<div id="issue-face">
				<h2>
					<DomainIcon aria-hidden="true" size={14} className="inline align-[-2px]" /> {issue.handle || issue.id}
				</h2>
				<p className="title">{issue.title}</p>
				<dl>
					<dt>status</dt>
					<dd>{issue.status}</dd>
					<dt>type</dt>
					<dd>
						{issue.type} ({issue.domain})
					</dd>
					<dt>labels</dt>
					<dd>{issue.labels.length > 0 ? issue.labels.join(", ") : "(none)"}</dd>
					{attempted && live ? (
						<>
							<dt>live run</dt>
							<dd>
								{live.kind} · {live.id} · attempted
							</dd>
						</>
					) : null}
				</dl>
				{neighbours.length === 0 ? (
					<>
						<h3>Neighbours</h3>
						<p className="muted">No neighbours.</p>
					</>
				) : (
					<>
						<NeighbourGroup heading="Blocked by" items={blockedBy} onSelect={props.onSelect} />
						<NeighbourGroup heading="Blocks" items={blocks} onSelect={props.onSelect} />
						<NeighbourGroup heading="Crossing" items={crossing} onSelect={props.onSelect} />
					</>
				)}
				{issue.round === null ? null : (
					<RoundForm key={roundFormKey(issue)} endpoint={props.overview.commentEndpoint} issue={issue} />
				)}
				<h3>Comments</h3>
				{issue.comments.length === 0 ? (
					<p className="muted">No comments.</p>
				) : (
					issue.comments.map((comment) => {
						const from = commentFrom(comment.author, props.overview.actor);
						return (
							<Message key={comment.id} from={from}>
								<header className="muted text-xs">
									{comment.author} · {comment.createdAt}
								</header>
								<MessageContent>
									<Bubble from={from}>
										<MarkdownBody text={comment.text} />
									</Bubble>
								</MessageContent>
							</Message>
						);
					})
				)}
			</div>
			<section id="issue-documents">
				<h3>Documents</h3>
				{issue.documents.length === 0 ? (
					<p className="muted">No documents (the issue has no handle/slug to name them).</p>
				) : (
					issue.documents.map((doc) => (
						<details className="doc" data-doc-kind={doc.kind} key={doc.rel}>
							<summary>
								{documentKindLabel(doc.kind)} · {doc.rel}
								{doc.exists ? "" : " · missing"}
							</summary>
							{doc.exists && doc.text !== null ? <pre>{doc.text}</pre> : null}
						</details>
					))
				)}
			</section>
			{props.overview.commentEndpoint ? (
				<TriageForm
					endpoint={props.overview.commentEndpoint}
					id={issue.id}
					current={currentTriage(issue.labels)}
				/>
			) : null}
			{props.overview.commentEndpoint ? <ReplyForm endpoint={props.overview.commentEndpoint} id={issue.id} /> : null}
			{props.overview.commentEndpoint ? (
				<DeleteForm
					endpoint={props.overview.commentEndpoint}
					ids={props.selected}
					issues={props.overview.issues}
					onDeleted={props.onDeleted}
					asked={props.asked}
					onAsked={props.onAsked}
				/>
			) : null}
		</aside>
	);
}

function currentTriage(labels: string[]): TriageLabel | undefined {
	return TRIAGE_LABELS.find((label) => labels.includes(label));
}

function TriageForm(props: { endpoint: string; id: string; current: TriageLabel | undefined }) {
	const { status, run } = useWrite("moved the triage label");
	return (
		<>
			<h3>Triage</h3>
			<form id="triage-form" onSubmit={(event) => event.preventDefault()}>
				<div className="triage-actions">
					{TRIAGE_LABELS.map((label) => (
						<Button
							key={label}
							name="triage"
							value={label}
							aria-pressed={props.current === label}
							onClick={() => void run(postOperatorAction(props.endpoint, { intent: "triage", id: props.id, label }))}
						>
							<Tag aria-hidden="true" size={12} />
							{label}
						</Button>
					))}
				</div>
				<p className="muted">One of five; applying one takes the others off. wontfix is a label, not a close.</p>
				<p className="muted" id="triage-status">
					{status}
				</p>
			</form>
		</>
	);
}

function ReplyForm(props: { endpoint: string; id: string }) {
	const [text, setText] = useState("");
	const { status, run } = useWrite("saved the comment");
	function onSubmit(event: FormEvent) {
		event.preventDefault();
		void run(postOperatorAction(props.endpoint, { intent: "comment", id: props.id, text })).then((ok) => {
			if (ok) setText("");
		});
	}
	return (
		<>
			<h3>Reply</h3>
			<form id="reply-form" onSubmit={onSubmit}>
				<Label className="sr-only" htmlFor="reply-text">
					Reply
				</Label>
				<Textarea
					id="reply-text"
					name="text"
					rows={4}
					required
					value={text}
					onChange={(event) => setText(event.target.value)}
				/>
				<Button type="submit">
					<MessageSquare aria-hidden="true" size={14} />
					Comment
				</Button>
				<p className="muted">Markdown. Saved as a store comment; close, reading:, and other domain labels stay with the session.</p>
				<p className="muted" id="reply-status">
					{status}
				</p>
			</form>
		</>
	);
}

function DeleteForm(props: {
	endpoint: string;
	ids: string[];
	issues: OverviewIssue[];
	onDeleted?: () => void;
	asked?: boolean;
	onAsked?: () => void;
}) {
	const [open, setOpen] = useState(false);
	const many = props.ids.length > 1;
	const { status, run } = useWrite(many ? "deleted the issues" : "deleted the issue");
	const plan = planDeleteAll(props.ids, props.issues);
	const refusal = plan.ok ? "" : plan.reason;
	useEffect(() => {
		if (!props.asked) return;
		if (refusal === "") setOpen(true);
		else toast.error(refusal);
		props.onAsked?.();
	}, [props.asked, refusal, props.onAsked]);
	return (
		<>
			<h3>Delete</h3>
			<p className="muted">
				Removes {many ? "the selected issues" : "the issue"} from the store. Not a close. Abandoned work stays
				wontfix.
			</p>
			<Button
				id="delete-open"
				disabled={!plan.ok}
				onClick={() => setOpen(true)}
			>
				<Trash2 aria-hidden="true" size={14} />
				{many ? `Delete ${props.ids.length}` : "Delete"}
			</Button>
			{plan.ok ? null : <p className="muted">{plan.reason}</p>}
			<p className="muted" id="delete-status">
				{status}
			</p>
			<Dialog
				id="delete"
				open={open}
				onClose={() => setOpen(false)}
				title={many ? `Delete ${props.ids.length} issues?` : "Delete this issue?"}
				description={
					many
						? "This removes them from the store. It cannot be undone. It is not closed."
						: "This removes it from the store. It cannot be undone. It is not closed."
				}
			>
				<form
					id="delete-form"
					onSubmit={(event) => {
						event.preventDefault();
						void run(
							(async () => {
								for (const id of props.ids) {
									await postOperatorAction(props.endpoint, { intent: "delete", id, confirm: true });
								}
							})(),
						).then((ok) => {
							if (!ok) return;
							setOpen(false);
							props.onDeleted?.();
						});
					}}
				>
					<Button type="submit">Confirm delete</Button>
				</form>
			</Dialog>
		</>
	);
}

const CREATE_TYPES = [
	{ value: "task", label: "task (development)" },
	{ value: "bug", label: "bug (development)" },
	{ value: "feature", label: "feature (development)" },
	{ value: "epic", label: "epic (development)" },
	{ value: "chore", label: "chore (development)" },
	{ value: "decision", label: "decision (inquiry)" },
	{ value: "experiment", label: "experiment" },
] as const;

function CreateForm({
	endpoint,
	open,
	onClose,
}: {
	endpoint: string;
	open: boolean;
	onClose: () => void;
}) {
	const [type, setType] = useState("");
	const [feature, setFeature] = useState("");
	const [title, setTitle] = useState("");
	const [prose, setProse] = useState("");
	const { status, run } = useWrite("created the issue");
	function onSubmit(event: FormEvent) {
		event.preventDefault();
		// Close and clear only when the store took it. Leaving the form up after a refusal is the point
		// of the inline status; leaving it up after a success invites a second identical issue, because
		// the fields still hold the first one. This used to be a page reload's job.
		void run(postOperatorAction(endpoint, { intent: "create", type, feature, title, prose })).then((created) => {
			if (!created) return;
			setType("");
			setFeature("");
			setTitle("");
			setProse("");
			onClose();
		});
	}
	return (
		<Dialog
			id="create"
			open={open}
			onClose={onClose}
			title="Create issue"
			description="Type is the domain. New issues land as needs-triage; the gate is not applied. The body is handle and prose, no status."
		>
			<form id="create-form" onSubmit={onSubmit}>
				<Label htmlFor="create-type">
					Type
					<Select id="create-type" name="type" required value={type} onChange={(event) => setType(event.target.value)}>
						<option value="">Select a type</option>
						{CREATE_TYPES.map((entry) => (
							<option key={entry.value} value={entry.value}>
								{entry.label}
							</option>
						))}
					</Select>
				</Label>
				<Label htmlFor="create-feature">
					Feature
					<Input
						id="create-feature"
						name="feature"
						required
						value={feature}
						onChange={(event) => setFeature(event.target.value)}
					/>
				</Label>
				<Label htmlFor="create-title">
					Title
					<Input
						id="create-title"
						name="title"
						required
						value={title}
						onChange={(event) => setTitle(event.target.value)}
					/>
				</Label>
				<Label className="prose" htmlFor="create-prose">
					Prose
					<Textarea
						id="create-prose"
						name="prose"
						rows={3}
						value={prose}
						onChange={(event) => setProse(event.target.value)}
					/>
				</Label>
				<Button type="submit">
					<Plus aria-hidden="true" size={14} />
					Create
				</Button>
				<p className="muted" id="create-status">
					{status}
				</p>
			</form>
		</Dialog>
	);
}

/**
 * ⌘K over the same store and the same door. It is a way in, not a new way to write: every act here
 * posts to the intents the panels post to.
 */
function Palette(props: {
	open: boolean;
	onClose: () => void;
	overview: PageOverview;
	selected: string[];
	onSelect: (ids: string[]) => void;
	onCreate: () => void;
	onAskDelete: () => void;
}) {
	const endpoint = props.overview.commentEndpoint ?? "";
	const focused = props.selected.length === 0 ? undefined : props.selected[props.selected.length - 1];
	const issue = focused === undefined ? undefined : issueDetail(props.overview, focused);
	const { run } = useWrite("acted");
	const startPlan = planStart(props.selected, props.overview.issues, props.overview.live !== null);
	const grillPlan = planGrill(props.selected, props.overview.issues, props.overview.live !== null);
	const group = "p-1";
	const item =
		"flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm outline-none data-[selected=true]:bg-accent";
	return (
		<Dialog id="palette" open={props.open} onClose={props.onClose} title="Commands" description="Jump, create, triage, start, grill.">
			{/* The items are the store's issues again: mounted when the palette opens, not baked into every page. */}
			{props.open ? (
				<Command label="Commands" loop>
				<Command.Input placeholder="Jump to an issue by handle or title…" className="input" />
				<Command.List className="mt-2 max-h-80 overflow-auto">
					<Command.Empty className="muted p-2">Nothing matches.</Command.Empty>
					<Command.Group heading="Issues" className={group}>
						{props.overview.issues.map((entry) => (
							<Command.Item
								key={entry.id}
								value={`${entry.handle ?? ""} ${entry.title} ${entry.id}`}
								className={item}
								onSelect={() => {
									props.onSelect([entry.id]);
									props.onClose();
								}}
							>
								<StatusIcon status={entry.status} />
								<span className="handle">{entry.handle || entry.id}</span>
								<span className="truncate">{entry.title}</span>
							</Command.Item>
						))}
					</Command.Group>
					<Command.Group heading="Act" className={group}>
						<Command.Item
							className={item}
							onSelect={() => {
								props.onClose();
								props.onCreate();
							}}
						>
							<Plus aria-hidden="true" size={14} /> Create an issue
						</Command.Item>
						{startPlan.ok ? (
							<Command.Item
								className={item}
								onSelect={() => {
									void run(postOperatorAction(endpoint, { intent: "start", ids: props.selected }));
									props.onClose();
								}}
							>
								<Play aria-hidden="true" size={14} /> Start {startPlan.kind}
							</Command.Item>
						) : null}
						{grillPlan.ok ? (
							<Command.Item
								className={item}
								onSelect={() => {
									void run(postOperatorAction(endpoint, { intent: "grill", ids: props.selected }));
									props.onClose();
								}}
							>
								<MessageSquare aria-hidden="true" size={14} /> Grill {grillPlan.seed}
							</Command.Item>
						) : null}
						{planDeleteAll(props.selected, props.overview.issues).ok ? (
							<Command.Item
								className={item}
								value={`delete ${issue?.handle ?? ""} ${props.selected.join(" ")}`}
								onSelect={() => {
									props.onClose();
									props.onAskDelete();
								}}
							>
								<Trash2 aria-hidden="true" size={14} />{" "}
								{props.selected.length > 1
									? `Delete ${props.selected.length} issues`
									: `Delete ${issue?.handle || issue?.id}`}
							</Command.Item>
						) : null}
						{issue === undefined
							? null
							: TRIAGE_LABELS.map((label) => (
									<Command.Item
										key={label}
										value={`triage ${label} ${issue.handle ?? ""}`}
										className={item}
										onSelect={() => {
											void run(postOperatorAction(endpoint, { intent: "triage", id: issue.id, label }));
											props.onClose();
										}}
									>
										<Tag aria-hidden="true" size={14} /> Triage {issue.handle || issue.id} as {label}
									</Command.Item>
								))}
					</Command.Group>
				</Command.List>
			</Command>
			) : null}
		</Dialog>
	);
}

export function App({ overview }: { overview: PageOverview }) {
	// One client per render: the server renders this again for every request, and a shared cache
	// would hand a fresh page the previous request's snapshot.
	const [client] = useState(
		() =>
			new QueryClient({
				defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
			}),
	);
	return (
		<QueryClientProvider client={client}>
			<Surface snapshot={overview} />
		</QueryClientProvider>
	);
}

function Surface({ snapshot }: { snapshot: PageOverview }) {
	const refresh = snapshot.overviewEndpoint;
	const query = useQuery({
		queryKey: ["overview"],
		initialData: snapshot,
		enabled: refresh !== null,
		queryFn: async (): Promise<PageOverview> => {
			const res = await fetch(refresh ?? "");
			if (!res.ok) throw new Error(`overview ${res.status}`);
			return (await res.json()) as PageOverview;
		},
		// A run that is moving is worth watching; a still page is not worth polling.
		refetchInterval: (q) => (q.state.data?.live ? 5000 : false),
	});
	const overview = query.data;
	const onWritten = useWritten();
	const [selected, setSelected] = useState<string[]>([]);
	const [types, toggleType] = useFilter(initialFilter(overview.issues).types);
	const [statuses, toggleStatus] = useFilter(initialFilter(overview.issues).statuses);
	const [labels, toggleLabel] = useFilter(initialFilter(overview.issues).labels);
	const [features, toggleFeature] = useFilter(initialFilter(overview.issues).features);
	const [creating, setCreating] = useState(false);
	const [palette, setPalette] = useState(false);
	const [askDelete, setAskDelete] = useState(false);
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				setPalette((open) => !open);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);
	const shown = useMemo(
		() => filterOverview(overview, { types, statuses, labels, features }),
		[overview, types, statuses, labels, features],
	);
	const blocked = useMemo(() => blockedIds(overview), [overview]);
	return (
		<div className="page">
			<header className="page-header">
				<h1>Target beads graph</h1>
				<p>
					Read from the beads store via <code>bd</code>, not the jsonl export. A view, not a second graph.
					Covers inquiry, experiment, and drain issues. Live overlay is the run lock, Archon status, the
					run's artefacts, and attempted — not a pack publish API.{" "}
					<span id="count">
						{shown.issues.length} of {overview.issues.length} issues
					</span>
				</p>
				{overview.commentEndpoint ? (
					<div className="page-actions">
						<Button onClick={() => setPalette(true)}>
							<CommandIcon aria-hidden="true" size={14} />
							Commands <span className="muted">⌘K</span>
						</Button>
						<Button onClick={() => setCreating(true)}>
							<Plus aria-hidden="true" size={14} />
							New issue
						</Button>
					</div>
				) : null}
			</header>
			<LiveBanner overview={overview} />
			{overview.commentEndpoint ? (
				<StartBar endpoint={overview.commentEndpoint} overview={overview} selected={selected} />
			) : null}
			<Filters
				issues={overview.issues}
				types={types}
				statuses={statuses}
				labels={labels}
				features={features}
				onTypes={toggleType}
				onStatuses={toggleStatus}
				onLabels={toggleLabel}
				onFeatures={toggleFeature}
			/>
			<div id="layout">
				<IssueList issues={shown.issues} blocked={blocked} selected={selected} onSelect={setSelected} />
				<Graph
					overview={shown}
					selected={selected}
					onSelect={setSelected}
					onAskDelete={overview.commentEndpoint ? () => setAskDelete(true) : undefined}
					writeEndpoint={overview.commentEndpoint}
					onWritten={onWritten}
				/>
				<IssueDetail
					overview={overview}
					selected={selected}
					onSelect={setSelected}
					onDeleted={() => setSelected([])}
					asked={askDelete}
					onAsked={() => setAskDelete(false)}
				/>
			</div>
			{overview.commentEndpoint ? (
				<CreateForm endpoint={overview.commentEndpoint} open={creating} onClose={() => setCreating(false)} />
			) : null}
			{overview.commentEndpoint ? (
				<Palette
					open={palette}
					onClose={() => setPalette(false)}
					overview={overview}
					selected={selected}
					onSelect={setSelected}
					onCreate={() => setCreating(true)}
					onAskDelete={() => setAskDelete(true)}
				/>
			) : null}
			<Toaster richColors closeButton position="bottom-right" />
		</div>
	);
}
