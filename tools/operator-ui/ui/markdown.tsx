/**
 * Markdown bodies: an operator's comment and a document the issue names are both markdown, and both
 * read as prose rather than as preformatted text.
 *
 * Raw HTML in a body stays text. No raw-HTML plugin, no dangerouslySetInnerHTML: a body cannot
 * inject markup into the operator's page.
 */

import Markdown from "react-markdown";

export function MarkdownBody({ text }: { text: string }) {
	return (
		<div className="md">
			<Markdown>{text}</Markdown>
		</div>
	);
}
