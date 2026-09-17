# operator-ui/14 — markdown for comments and documents

**What to build:** a comment body and a document are markdown, and they render as markdown instead
of as preformatted text. Operator replies are written in markdown, so reading them back as an
unstyled block is the wrong half of the loop.

Raw HTML inside a body is not executed: no `rehype-raw`, no `dangerouslySetInnerHTML`.

- [x] a comment body renders as markdown
- [x] a document renders as markdown
- [x] raw HTML in a body is not executed
- [x] the rendered body keeps the author and the timestamp
- [x] `tsc -p tsconfig.tools.json` clean and `overview-test.ts` ok
