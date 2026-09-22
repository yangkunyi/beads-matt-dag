#!/usr/bin/env bun
/**
 * Client build for the attention inbox. Spawned by `page.ts` because `bun build` on the command
 * line takes no plugins.
 *
 *   bun tools/attention-ui/ui/build.ts <outdir>
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "bun-plugin-tailwind";

const outdir = process.argv[2];
if (outdir === undefined) {
	console.error("usage: bun tools/attention-ui/ui/build.ts <outdir>");
	process.exit(2);
}

const here = dirname(fileURLToPath(import.meta.url));
const result = await Bun.build({
	entrypoints: [join(here, "main.tsx")],
	outdir,
	target: "browser",
	minify: true,
	define: { "process.env.NODE_ENV": JSON.stringify("production") },
	plugins: [tailwindcss],
});

if (!result.success) {
	for (const log of result.logs) console.error(String(log));
	process.exit(1);
}
