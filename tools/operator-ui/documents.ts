/**
 * The documents one issue owns, derived from its handle and slug — never discovered by walking.
 *
 * Note and record paths are the same names the executors already write. The brief is the bead's
 * description, not a file. An issue
 * whose metadata cannot name a file contributes no documents rather than failing the overview: a view
 * still shows the store's issue.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { OverviewDocument, StoreIssue } from "./model";

const HANDLE = /^([A-Za-z0-9_][A-Za-z0-9._-]*)\/([A-Za-z0-9_][A-Za-z0-9._-]*)$/;
const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export type IssueNames = {
	handle: string;
	feature: string;
	number: string;
	slug: string;
};

export function issueNames(issue: { id: string; handle: string | undefined; slug: string | undefined }): IssueNames | undefined {
	if (issue.handle === undefined || issue.slug === undefined) return undefined;
	const parts = HANDLE.exec(issue.handle);
	if (!parts || !SLUG.test(issue.slug)) return undefined;
	return { handle: issue.handle, feature: parts[1]!, number: parts[2]!, slug: issue.slug };
}

export function noteRel(names: IssueNames): string {
	return join(".scratch", names.feature, "notes", `${names.slug}.md`);
}

export function recordRel(names: IssueNames): string {
	return join(".scratch", names.feature, "results", `${names.number}-${names.slug}.md`);
}

export type FileProbe = {
	exists: (rel: string) => boolean;
	read: (rel: string) => string;
};

function probeTarget(target: string): FileProbe {
	return {
		exists: (rel) => existsSync(join(target, rel)),
		read: (rel) => readFileSync(join(target, rel), "utf8"),
	};
}

function document(kind: OverviewDocument["kind"], rel: string, probe: FileProbe): OverviewDocument {
	if (!probe.exists(rel)) return { kind, rel, exists: false, text: null };
	return { kind, rel, exists: true, text: probe.read(rel) };
}

/** The documents the issue's names can locate. `target` is the Target root when no probe is injected. */
export function documentsFor(issue: StoreIssue, targetOrProbe: string | FileProbe): OverviewDocument[] {
	const names = issueNames(issue);
	if (names === undefined) return [];
	const probe = typeof targetOrProbe === "string" ? probeTarget(targetOrProbe) : targetOrProbe;
	const docs: OverviewDocument[] = [];
	if (issue.type === "decision") docs.push(document("note", noteRel(names), probe));
	if (issue.type === "experiment") docs.push(document("record", recordRel(names), probe));
	return docs;
}
