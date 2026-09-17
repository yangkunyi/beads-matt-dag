#!/usr/bin/env bun
/**
 * The client build: `main.tsx` and the Tailwind sheet it imports, in one `Bun.build`.
 *
 * A separate program because `bun build` on the command line takes no plugins, and the page needs
 * the compiled result synchronously — `renderPage` spawns this and inlines what it emits.
 *
 *   bun tools/operator-ui/ui/build.ts <outdir>
 *
 * Emits `main.js` and `main.css`. Exits non-zero with the build log on failure, so the caller's
 * error carries why rather than a missing file.
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "bun-plugin-tailwind";

const outdir = process.argv[2];
if (outdir === undefined) {
	console.error("usage: bun tools/operator-ui/ui/build.ts <outdir>");
	process.exit(2);
}

const here = dirname(fileURLToPath(import.meta.url));
const result = await Bun.build({
	entrypoints: [join(here, "main.tsx")],
	outdir,
	target: "browser",
	minify: true,
	plugins: [tailwindcss],
});

if (!result.success) {
	for (const log of result.logs) console.error(String(log));
	process.exit(1);
}
