/**
 * The operator page: filters, live overlay, issue detail, comment, start, and the React Flow graph.
 *
 * All of it is a view of the store snapshot embedded in the page. Writes go through the tagged
 * door: a comment is `bd comment`; start launches that domain's existing run with the selected
 * ids as the allow-list.
 */

import { useMemo, useState, type FormEvent } from "react";
import { postComment } from "../client-comment.ts";
import { postStart } from "../client-start.ts";
import { filterChoices } from "../graph-view.ts";
import { filterOverview, issueDetail, type Overview, type OverviewIssue } from "../model.ts";
import { planStart } from "../start.ts";
import { Graph } from "./Graph.tsx";
import { Button, Label, Textarea } from "./kit.tsx";

export type PageOverview = Overview & { commentEndpoint: string | null };

function initialFilter(issues: OverviewIssue[]) {
	const choices = filterChoices(issues);
	return {
		types: new Set(choices.types),
		statuses: new Set(choices.statuses),
		labels: new Set(choices.labels.map((entry) => entry.value)),
	};
}

function toggle(set: Set<string>, value: string): Set<string> {
	const next = new Set(set);
	if (next.has(value)) next.delete(value);
	else next.add(value);
	return next;
}

function Filters(props: {
	issues: OverviewIssue[];
	types: Set<string>;
	statuses: Set<string>;
	labels: Set<string>;
	onTypes: (next: Set<string>) => void;
	onStatuses: (next: Set<string>) => void;
	onLabels: (next: Set<string>) => void;
}) {
	const choices = filterChoices(props.issues);
	return (
		<section id="filters" aria-label="Filters">
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
								onChange={() => props.onTypes(toggle(props.types, type))}
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
								onChange={() => props.onStatuses(toggle(props.statuses, status))}
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
								onChange={() => props.onLabels(toggle(props.labels, entry.value))}
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

function StartBar(props: {
	endpoint: string;
	overview: Overview;
	selected: string[];
}) {
	const [status, setStatus] = useState("");
	const plan = planStart(props.selected, props.overview.issues, props.overview.live !== null);
	const label = plan.ok ? `Start ${plan.kind}` : "Start selection";
	function onClick() {
		setStatus("");
		void postStart(props.endpoint, props.selected)
			.then(() => {
				location.reload();
			})
			.catch((error: unknown) => {
				setStatus(error instanceof Error ? error.message : String(error));
			});
	}
	return (
		<section id="start" className="card" aria-label="Start selection">
			<p id="start-summary">{plan.ok ? `${props.selected.length} ${plan.kind}` : plan.reason}</p>
			<Button id="start-button" disabled={!plan.ok} onClick={onClick}>
				{label}
			</Button>
			<p className="muted" id="start-status">
				{status}
			</p>
		</section>
	);
}

function Detail(props: {
	overview: PageOverview;
	selected: string[];
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
	return (
		<aside id="detail" className="card">
			<h2>{issue.handle || issue.id}</h2>
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
			<h3>Comments</h3>
			{issue.comments.length === 0 ? (
				<p className="muted">No comments.</p>
			) : (
				issue.comments.map((comment) => (
					<article className="comment" key={comment.id}>
						<header>
							{comment.author} · {comment.createdAt}
						</header>
						<pre>{comment.text}</pre>
					</article>
				))
			)}
			<h3>Documents</h3>
			{issue.documents.length === 0 ? (
				<p className="muted">No documents (the issue has no handle/slug to name them).</p>
			) : (
				issue.documents.map((doc) => (
					<article className="doc" key={doc.rel}>
						<header>
							{doc.kind} · {doc.rel}
							{doc.exists ? "" : " · missing"}
						</header>
						{doc.exists && doc.text !== null ? <pre>{doc.text}</pre> : null}
					</article>
				))
			)}
			{props.overview.commentEndpoint ? <ReplyForm endpoint={props.overview.commentEndpoint} id={issue.id} /> : null}
		</aside>
	);
}

function ReplyForm(props: { endpoint: string; id: string }) {
	const [text, setText] = useState("");
	const [status, setStatus] = useState("");
	function onSubmit(event: FormEvent) {
		event.preventDefault();
		setStatus("");
		void postComment(props.endpoint, props.id, text)
			.then(() => {
				location.reload();
			})
			.catch((error: unknown) => {
				setStatus(error instanceof Error ? error.message : String(error));
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
				<Button type="submit">Comment</Button>
				<p className="muted">Saved as a store comment. Close, reading:, and labels stay with the session.</p>
				<p className="muted" id="reply-status">
					{status}
				</p>
			</form>
		</>
	);
}

export function App({ overview }: { overview: PageOverview }) {
	const [selected, setSelected] = useState<string[]>([]);
	const [types, setTypes] = useState(() => initialFilter(overview.issues).types);
	const [statuses, setStatuses] = useState(() => initialFilter(overview.issues).statuses);
	const [labels, setLabels] = useState(() => initialFilter(overview.issues).labels);
	const shown = useMemo(
		() => filterOverview(overview, { types, statuses, labels }),
		[overview, types, statuses, labels],
	);
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
				onTypes={setTypes}
				onStatuses={setStatuses}
				onLabels={setLabels}
			/>
			<div id="layout">
				<Graph overview={shown} selected={selected} onSelect={setSelected} />
				<Detail overview={overview} selected={selected} />
			</div>
		</div>
	);
}
