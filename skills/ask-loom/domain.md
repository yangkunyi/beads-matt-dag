# Domain docs

How loom skills consume this Target's **product** language. Flow vocabulary is sibling
`flow-context.md` and is a different document.

## Before exploring, read these

- **`docs/CONTEXT.md`** — this product's glossary
- **`docs/adr/`** — decisions that touch the area you are about to work in

If they do not exist, proceed. `/grill` creates them when a term or a hard-to-reverse choice actually
settles. Do not suggest creating them up front.

## Use the glossary's vocabulary

When your output names a domain concept (issue title, hypothesis, test name), use the term as defined
in `docs/CONTEXT.md`. Do not drift to synonyms the glossary avoids.

If the concept is not in the glossary yet: either you are inventing language the project does not use
(reconsider) or there is a real gap — note it for `/grill`.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it rather than silently overriding.
