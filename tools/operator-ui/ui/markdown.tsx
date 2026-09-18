/**
 * Markdown bodies: an operator's comment is markdown and reads as prose rather than as preformatted
 * text. Git documents stay unoptimized on the detail pane; they do not go through this.
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
