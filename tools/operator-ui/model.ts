/**
 * The overview's read model: issues, edges, comments and documents as one page of the Target.
 *
 * The store is the source of the graph; this module does not talk to `bd` and does not read the jsonl
 * export. Assembly is a pure join of what the store reader and the document locator already answered.
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

export type Overview = {
	issues: OverviewIssue[];
	edges: OverviewEdge[];
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
};

export function domainOf(type: string): OverviewDomain {
	if (type === "decision") return "inquiry";
	if (type === "experiment") return "experiment";
	return "development";
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
 * store's own dependencies, pointing from the depended-on issue to the dependent.
 */
export function assembleOverview(
	issues: StoreIssue[],
	commentsById: ReadonlyMap<string, StoreComment[]>,
	documentsFor: (issue: StoreIssue) => OverviewDocument[],
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
	return { issues: assembled, edges };
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
	return true;
}

/** Drop issues that miss the filter, and any edge that no longer has both ends. */
export function filterOverview(overview: Overview, filter: OverviewFilter): Overview {
	const issues = overview.issues.filter((issue) => matchesFilter(issue, filter));
	const ids = new Set(issues.map((issue) => issue.id));
	const edges = overview.edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to));
	return { issues, edges };
}

/** The detail a click shows: status, comments and documents of one issue, or undefined if unknown. */
export function issueDetail(overview: Overview, id: string): OverviewIssue | undefined {
	return overview.issues.find((issue) => issue.id === id);
}
