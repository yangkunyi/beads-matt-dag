/**
 * The registration: a run's identity, written down before anything executes.
 *
 * One file per registered name, under `$ARTIFACTS_DIR/experiments/` — the run's own artifacts, never a
 * git document and never a store field, because it says nothing about any issue. It is what `collect`
 * reads to know which runs it is reporting, and where the record gets the commit the run started from:
 * a queued run's name and starting commit cannot be reconstructed after the fact.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type RegisteredRun = {
	/** The name DVC knows the run by: `<name>` for one point, `<name>-1`, `<name>-2`… for a comma grid. */
	name: string;
	/** The parameters DVC resolved for the queued run, per file. */
	params: Record<string, unknown>;
};

export type Registration = {
	verb: "register";
	/** The name the queue was asked for. */
	name: string;
	/** The points the run was queued with, as the caller gave them (DVC's own `-S` strings). */
	points: string[];
	/** The ignored paths the queued run must see (DVC's own `-C`) — what the run was given, for the record. */
	copies: string[];
	/** The commit the run starts from. */
	code: string;
	/** What the queue now holds under this name: one run, or one per point of a sweep. */
	runs: RegisteredRun[];
	registeredAt: string;
	/** Where it was written, for whoever reads the run's artifacts. */
	registration: string;
};

/** A run's registrations all live here, beside the run's other artifacts. */
export function registrationDir(artifactsDir: string): string {
	return join(artifactsDir, "experiments");
}

/** One file per name: a sweep registers several, and none may overwrite another. */
export function registrationPath(artifactsDir: string, name: string): string {
	const safe = name.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[-.]+|[-.]+$/g, "");
	return join(registrationDir(artifactsDir), `${safe || "run"}.json`);
}

/** The registration, written where the run's artifacts can hold it. The caller prints the same object. */
export function writeRegistration(registration: Registration): void {
	mkdirSync(dirname(registration.registration), { recursive: true });
	writeFileSync(registration.registration, `${JSON.stringify(registration, null, 2)}\n`);
}

/** Every registration under an artifacts directory, by file name — the order a sweep was registered in. */
export function registrationsIn(artifactsDir: string): string[] {
	const dir = registrationDir(artifactsDir);
	if (!existsSync(dir)) return [];
	return readdirSync(dir)
		.filter((entry) => entry.endsWith(".json"))
		.sort()
		.map((entry) => join(dir, entry));
}

/**
 * The registrations at these paths. A file that is not one is refused rather than half-read: collect
 * reports runs it can name, and a registration it cannot read would quietly shrink the report.
 */
export function readRegistrations(paths: string[]): Registration[] {
	return paths.map((path) => {
		let parsed: unknown;
		try {
			parsed = JSON.parse(readFileSync(path, "utf8"));
		} catch (error) {
			throw new Error(`${path} is not readable JSON: ${error instanceof Error ? error.message : String(error)}`);
		}
		const registration = parsed as Partial<Registration>;
		if (typeof registration.name !== "string" || !Array.isArray(registration.runs)) {
			throw new Error(`${path} is not a registration: it names no run`);
		}
		for (const run of registration.runs) {
			if (typeof run?.name !== "string") throw new Error(`${path} is not a registration: a run has no name`);
		}
		return { ...(registration as Registration), registration: path };
	});
}
