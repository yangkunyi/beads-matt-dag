/**
 * The two verbs' command line, in one place: reading flags, the usage mistake, and the exit codes.
 *
 * Nothing here knows about DVC or about registrations. A usage mistake exits 2 and prints the verb's own
 * usage; a refusal exits 1 with one line naming what was missing — the split `tools/inquiry/` already
 * uses, so a caller can tell "you asked wrong" from "it could not be done".
 */

/** Thrown while reading the flags; the verb turns it into exit 2 and its usage text. */
export class UsageError extends Error {}

/**
 * The value of a flag, the last one if it was given twice. `names` carries every spelling of it. A flag
 * whose value is missing — or is the next flag — is a usage mistake, never an empty string.
 */
export function flag(argv: string[], names: string[]): string | undefined {
	let found: string | undefined;
	for (let i = 0; i < argv.length; i++) {
		if (!names.includes(argv[i] ?? "")) continue;
		const value = argv[i + 1];
		if (value === undefined || value.startsWith("-")) throw new UsageError(`${names[0]} needs a value`);
		found = value;
		i++;
	}
	return found;
}

/** Every value of a repeatable flag, in the order it was given. */
export function flags(argv: string[], names: string[]): string[] {
	const found: string[] = [];
	for (let i = 0; i < argv.length; i++) {
		if (!names.includes(argv[i] ?? "")) continue;
		const value = argv[i + 1];
		if (value === undefined || value.startsWith("-")) throw new UsageError(`${names[0]} needs a value`);
		found.push(value);
		i++;
	}
	return found;
}

/** `--help`, answered by every verb with its own usage text. */
export function askedForHelp(argv: string[]): boolean {
	return argv.includes("--help") || argv.includes("-h");
}

/** A refusal: exit 1, one line, naming the verb. The caller's message says what was missing. */
export function refuse(verb: string, error: unknown): never {
	console.error(`${verb}: ${error instanceof Error ? error.message : String(error)}`);
	process.exit(1);
}
