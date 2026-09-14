/**
 * HTML → text, once, for every source that arrives as a page.
 *
 * Deliberately crude: tags become spaces, a few entities are decoded, whitespace collapses. It is not a
 * reader — it is what makes a fetched page quotable and small enough to read. The receipts state which
 * extraction produced their text, because a quote has to be re-found through the same one.
 *
 * What it costs is visible: code and tables lose their line structure, so a quote spanning either is a
 * quote that will not re-anchor. Prose is what this is for.
 */

const ENTITIES: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	"#39": "'",
	nbsp: " ",
	"#x27": "'",
	"#x2F": "/",
};

/** The inner text of the first `<tag class="…marker…">`. Crude on purpose: when a page changes shape the
 *  caller gets an empty string and says so, never a wrong quote. */
export function blockWithClass(html: string, tag: string, marker: string): string {
	const re = new RegExp(`<${tag}[^>]*class="[^"]*${marker}[^"]*"[^>]*>([\\s\\S]*?)</${tag}>`, "i");
	return re.exec(html)?.[1] ?? "";
}

export function htmlToText(html: string): string {
	return html
		.replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, " ")
		.replace(/<!--[\s\S]*?-->/g, " ")
		// A tag becomes a space, which is right between words and wrong around punctuation: an inline link
		// would turn "the run ID." into "the run ID ." and every quote around one would carry the scar.
		.replace(/<[^>]*>/g, " ")
		.replace(/&([a-z0-9#]+);/gi, (whole, entity: string) => ENTITIES[entity.toLowerCase()] ?? whole)
		.replace(/\s+([.,;:!?)])/g, "$1")
		.replace(/\(\s+/g, "(")
		.replace(/\s+/g, " ")
		.trim();
}

/** A page that is nothing but a redirect: a `meta refresh` stub, which curl reports as a 200 and would
 *  hand back as a receipt that says nothing (`docs/x.html` → `docs/x/` is the common shape). Resolved
 *  against the page it came from. Callers only trust this on a page that came down nearly empty. */
export function metaRedirect(html: string, baseUrl: string): string | undefined {
	const meta = /<meta[^>]+http-equiv=["']?refresh["']?[^>]*>/i.exec(html)?.[0];
	const refresh = meta ? /content=["']?[^"'>]*url=([^"'>;]+)/i.exec(meta)?.[1] : undefined;
	const link = /<link[^>]+rel=["']?canonical["']?[^>]*>/i.exec(html)?.[0];
	const canonical = link ? /href=["']([^"']+)["']/i.exec(link)?.[1] : undefined;
	const target = refresh ?? canonical;
	if (!target) return undefined;
	try {
		const resolved = new URL(target.trim(), baseUrl).toString();
		return resolved === baseUrl ? undefined : resolved;
	} catch {
		return undefined;
	}
}

/** The page's own title, when it has one. */
export function pageTitle(html: string, fallback: string): string {
	const raw = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
	const title = raw ? htmlToText(raw) : "";
	return title || fallback;
}
