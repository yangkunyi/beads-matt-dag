/**
 * The overview's read model: issues, edges, comments and documents as one page of the Target.
 *
 * The store is the source of the graph; this module does not talk to `bd` and does not read the jsonl
 * export. Assembly is a pure join of what the store reader, the document locator and the live overlay
 * already answered.
 */

export type OverviewComment = {
	id: string;
	author: string;
	createdAt: string;
	text: string;
};

export type OverviewDocumentKind = "body" | "note" | "record";

export type OverviewDocument = {
	kind: OverviewDocumentKind;
	rel: string;
	exists: boolean;
	text: string | null;
};

/** Inquiry is `decision`, experiment is `experiment`, everything else is development — CONTEXT.md. */
export type OverviewDomain = "inquiry" | "experiment" | "development";

export type OverviewIssue = {
	id: string;
	title: string;
	type: string;
	status: string;
	labels: string[];
	handle: string | undefined;
	slug: string | undefined;
	domain: OverviewDomain;
	comments: OverviewComment[];
	documents: OverviewDocument[];
};

/** `from` is the issue depended on (the blocker for a `blocks` edge); `to` is the dependent. */
export type OverviewEdge = {
	from: string;
	to: string;
	type: string;
};

/** Which pack executor is holding the Target. Named from Archon's workflow, never from a new field. */
export type LiveRunKind = "drain" | "inquiry" | "experiment";

export type LiveReport = {
	rel: string;
	text: string;
};

/**
 * A live drain / inquiry / experiment run, as the overlay reads it: the Target lock, Archon status,
 * the run's artefacts directory, and attempted. Absent when nothing holds the Target.
 */
/** Archon's run JSONL, joined as another fact of the same live run. Absent when the file is missing. */
export type LiveLog = {
	rel: string;
	lastType: string;
	lastStep?: string;
	currentStep?: string;
};

export type LiveRun = {
	kind: LiveRunKind;
	id: string;
	status: string;
	workflow: string;
	pid: number | undefined;
	artifactsDir: string | undefined;
	attempted: string[];
	report: LiveReport | null;
	log: LiveLog | null;
};

export type Overview = {
	issues: OverviewIssue[];
	edges: OverviewEdge[];
	live: LiveRun | null;
};

export type OverviewFilter = {
	/** When set and non-empty, the issue's type must be in the set. */
	types?: ReadonlySet<string>;
	/** When set and non-empty, the issue's status must be in the set. */
	statuses?: ReadonlySet<string>;
	/**
	 * When set and non-empty, the issue must carry at least one of the labels. The empty string stands
	 * for unlabeled issues, so a filter of `{""}` is "unlabeled only".
	 */
	labels?: ReadonlySet<string>;
	/**
	 * When set and non-empty, the issue's feature must be in the set. Feature is the handle prefix
	 * (`operator-ui` in `operator-ui/24`), not a store field. The empty string stands for no handle.
	 */
	features?: ReadonlySet<string>;
};

export function domainOf(type: string): OverviewDomain {
	if (type === "decision") return "inquiry";
	if (type === "experiment") return "experiment";
	return "development";
}

/** Prefix of a handle (`operator-ui` in `operator-ui/24`). No handle means no feature. */
export function featureOf(handle: string | undefined): string {
	if (handle === undefined || handle === "") return "";
	const slash = handle.indexOf("/");
	if (slash <= 0) return "";
	return handle.slice(0, slash);
}

export type StoreDependency = {
	id: string;
	type: string;
};

export type StoreIssue = {
	id: string;
	title: string;
	type: string;
	status: string;
	labels: string[];
	handle: string | undefined;
	slug: string | undefined;
	commentCount: number;
	dependencies: StoreDependency[];
};

export type StoreComment = {
	id: string;
	author: string;
	createdAt: string;
	text: string;
};

/**
 * Join the store's issues and comments with the documents located for each issue. Edges are the
 * store's own dependencies, pointing from the depended-on issue to the dependent. The live overlay
 * is joined here too, so the page is still one snapshot.
 */
export function assembleOverview(
	issues: StoreIssue[],
	commentsById: ReadonlyMap<string, StoreComment[]>,
	documentsFor: (issue: StoreIssue) => OverviewDocument[],
	live: LiveRun | null = null,
): Overview {
	const known = new Set(issues.map((issue) => issue.id));
	const edges: OverviewEdge[] = [];
	const seen = new Set<string>();
	const assembled: OverviewIssue[] = issues.map((issue) => ({
		id: issue.id,
		title: issue.title,
		type: issue.type,
		status: issue.status,
		labels: [...issue.labels],
		handle: issue.handle,
		slug: issue.slug,
		domain: domainOf(issue.type),
		comments: (commentsById.get(issue.id) ?? []).map((comment) => ({ ...comment })),
		documents: documentsFor(issue),
	}));
	for (const issue of issues) {
		for (const dep of issue.dependencies) {
			if (!known.has(dep.id)) continue;
			const key = `${dep.id}\t${issue.id}\t${dep.type}`;
			if (seen.has(key)) continue;
			seen.add(key);
			edges.push({ from: dep.id, to: issue.id, type: dep.type });
		}
	}
	return { issues: assembled, edges, live };
}

export function matchesFilter(issue: OverviewIssue, filter: OverviewFilter): boolean {
	if (filter.types !== undefined && filter.types.size > 0 && !filter.types.has(issue.type)) return false;
	if (filter.statuses !== undefined && filter.statuses.size > 0 && !filter.statuses.has(issue.status)) {
		return false;
	}
	const labels = filter.labels;
	if (labels !== undefined && labels.size > 0) {
		if (issue.labels.length === 0) return labels.has("");
		if (!issue.labels.some((label) => labels.has(label))) return false;
	}
	const features = filter.features;
	if (features !== undefined && features.size > 0 && !features.has(featureOf(issue.handle))) {
		return false;
	}
	return true;
}

/** Drop issues that miss the filter, and any edge that no longer has both ends. */
export function filterOverview(overview: Overview, filter: OverviewFilter): Overview {
	const issues = overview.issues.filter((issue) => matchesFilter(issue, filter));
	const ids = new Set(issues.map((issue) => issue.id));
	const edges = overview.edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to));
	return { issues, edges, live: overview.live };
}

/** The detail a click shows: status, comments and documents of one issue, or undefined if unknown. */
export function issueDetail(overview: Overview, id: string): OverviewIssue | undefined {
	return overview.issues.find((issue) => issue.id === id);
}

/** The three executors the overlay knows. Any other Archon workflow is not this page's live run. */
export function kindOfWorkflow(workflow: string): LiveRunKind | undefined {
	if (workflow === "beads-dag-drain") return "drain";
	if (workflow === "beads-dag-inquiry") return "inquiry";
	if (workflow === "beads-dag-experiment") return "experiment";
	return undefined;
}

/** The report artefact that kind writes: drain `summary.md`, inquiry and experiment `report.md`. */
export function reportRelFor(kind: LiveRunKind): string {
	return kind === "drain" ? "summary.md" : "report.md";
}

export type LiveLock = {
	pid: number;
	run: string;
};

export type LiveArchonRun = {
	id: string;
	workflow: string;
	status: string;
};

export type LiveArtifacts = {
	dir: string;
	/** The run-lock.json record, when the artefacts directory held one. */
	record: LiveLock | undefined;
	attempted: string[];
	reports: LiveReport[];
};

/**
 * The overlay's facts, already read. Assembly is a pure join: a live holder, an Archon row for the
 * same run that is one of the three executors, and whatever the artefacts directory held for it.
 */
export type LiveRunFacts = {
	lock: LiveLock | undefined;
	archon: ReadonlyArray<LiveArchonRun>;
	artifacts: LiveArtifacts | undefined;
	/** Archon's logs/<run-id>.jsonl, already parsed. Absent is no log, not a failed overlay. */
	log?: LiveLog | null;
};

function pickReport(kind: LiveRunKind, reports: ReadonlyArray<LiveReport>): LiveReport | null {
	const wanted = reportRelFor(kind);
	const hit = reports.find((report) => report.rel === wanted);
	return hit === undefined ? null : { rel: hit.rel, text: hit.text };
}

/**
 * Join the lock, Archon status and artefacts into one live run, or null when nothing is in progress.
 * A lock whose run Archon does not list, or whose workflow is not an executor, is not this overlay.
 */
export function assembleLive(facts: LiveRunFacts): LiveRun | null {
	const lock = facts.lock;
	if (lock === undefined) return null;
	const run = facts.archon.find((row) => row.id === lock.run);
	if (run === undefined) return null;
	const kind = kindOfWorkflow(run.workflow);
	if (kind === undefined) return null;
	const artifacts =
		facts.artifacts !== undefined &&
		(facts.artifacts.record === undefined || facts.artifacts.record.run === lock.run)
			? facts.artifacts
			: undefined;
	return {
		kind,
		id: run.id,
		status: run.status,
		workflow: run.workflow,
		pid: lock.pid,
		artifactsDir: artifacts?.dir,
		attempted: artifacts?.attempted ?? [],
		report: pickReport(kind, artifacts?.reports ?? []),
		log: facts.log ?? null,
	};
}
