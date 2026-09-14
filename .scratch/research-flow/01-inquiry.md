# Inquiry — grilling record

**Date:** 2026-09-14 · **Status:** the decisions below are settled and the tool behind them exists; a first
real question has gone through it (2026-09-14, `lab-zfl.1` in the Target's store — 24 receipts, one note of
50 anchored claims), and what has not happened is an effort taken end to end.
**Name:** this half was called the *front end* while these rounds ran, and was renamed to *inquiry* on
2026-09-14: a front end reads as a UI, and this half has nothing to do with one.

## Decided

- **Scope: the inquiry domain.** §8's "research half" is the *inquiry domain*: literature search and summarisation,
  and capturing and organising ideas. It feeds both the development half and the DL half. §7's "science
  half" is a different thing and is the **verification leg**; `research` stays the name of a wayfinder
  ticket type and of the `/research` skill, never of the half. (1/Q1 → b)
- **Decoupling: one store, by type and label.** Inquiry questions are `decision`-typed beads in the
  Target's own store, carrying `wayfinder:<type>` labels — the mapping already written in
  `skills/setup-matt-pocock-skills/issue-tracker-beads.md`. No second workflow, no second store: the drain
  already excludes the decision type and refuses cross-domain blocking (ADR-0004). (1/Q2 → a)
- **Unit: a question.** An inquiry work item is a question whose resolution is a decision, not a slice of
  work; it is done when the operator accepts the answer. A source note is material, not a work item. (1/Q3 → a)
- **A survey ticket is allowed.** A `research` ticket may be broad ("what does direction X look like"), and
  its answer may be the questions it surfaced — graduated into the map's fog or into new tickets. The flow
  never demands more sharpness than the operator has; that is what the fog section is for. (2/Q1 → b)
- **6:4 is not counted.** No provenance fields, no counters, no quotas: the operator judges in the
  discussion. The mechanism that already expresses this is wayfinder's HITL/AFK split — a HITL ticket
  resolves only through a live exchange, and an agent that answers its own grilling questions has broken
  the rule. (1/Q4)
- **The corpus: receipts and notes in git.** One receipt per source (`sources/<id>.md`, line 1 = the
  fetched URL — the convention `raw/sources/` already ran with), a notes file per ticket, and one
  machine-checkable rule: a quote must re-anchor against the re-fetched source or it does not enter the
  record. No PDFs in git in v1 (URL + sha256 + locator); DVC when a corpus must actually freeze. (2/Q2 → a)
- **An answer's home and author: the repo's existing convention wins.** The answer is a store comment
  (`bd comment`) plus a pointer in the map's Decisions-so-far; a long cited reading is a git file linked
  from the ticket, never pasted in. The wayfinder session writes the record and closes the ticket — it
  keeps write access, unlike a drain's workers; the operator is the decision-maker, not the typist. (2/Q3)
- **Three domains, one store.** The inquiry domain (closed = the question is answered), development (closed =
  in Main), experiments (closed = the result is recorded). Nothing blocks across domains; `relates-to`
  is the only crossing link, and the operator creates the tickets in the other domains. (2/Q4 → a)
- **The graph boundary is written now, the ADR waits.** `docs/CONTEXT.md` carries `inquiry`,
  `verification leg` and `domain`; the tracker doc's *Closure never crosses domains* speaks of domains
  rather than of two of them, and says that adding one is two acts (the type exists, and the drain is
  taught to refuse chains reaching it). ADR-0004 is amended when the experiment domain's closure is
  specified, not before. (3/Q1 → b; written 2026-09-14)
- **The code boundary: the inquiry domain never enters the drain pack.** No inquiry automation in the pack
  today; if one is ever wanted it is a separate pack folder importing `store.ts`, `naming.ts`,
  `domains.ts` and `worker-env.ts` — never a node in `beads-dag-drain`, whose every node is a claim, a
  worktree and a merge. Recorded in the pack README's module table. (3/Q2 → b; written 2026-09-14)
- **The corpus lands on Main.** Receipts and notes are documents, committed like `.scratch/<feature>/issues/`
  — not a throwaway `research/<name>` branch (wayfinder's wording), not store-only. Consequence, and a
  wanted one: a hand-written doc commit appears in the next drain's range section as a commit the run did
  not make. (3/Q3 → a)
- **The AFK leg is read-only.** A `/research` subagent reads the store and writes git, but cannot comment,
  close or create issues: closing is the completion judgement, and it belongs to the side holding the
  global view. `BD_READONLY=1` locks the store, not git. (3/Q4 → a)
- **What gets built: documents plus one thin retrieval script.** Extend the Wayfinding section of the
  tracker doc with the reading convention, and add a script that queries OpenAlex / Semantic Scholar,
  fetches, and lands receipts — the one part where building it again would be worse. No new skill:
  wayfinder and `/research` are generic, and the delta belongs in the tracker doc. (2/Q5 → b)
- **Retrieval: local-first, APIs discover only.** Notes in git are the record. OpenAlex is reachable;
  Semantic Scholar needs a key. (1/Q5)
- **An idea is a tracked object, and its development is the point.** Not a note and not a line in a
  document: what has to survive is *how* the idea changed — what was added, dropped or argued down, on
  whose saying — because judging whether an idea is ripe means reading how it got there. An idea does not
  close: it graduates into an issue, or it is dropped. No provenance field is recorded on it — 6:4 is not
  counted, above. Chosen over "ideas are material, like notes, and are not tracked" (2026-09-14, asked
  while charting the experiments map → b). **Owed before this can be built:** its states, where it lives, what links it to
  the question or experiment it came from and to whatever it became, and who writes it.

## Mock (2026-09-14)

`tools/inquiry/` — the seed of the retrieval tool, with the provider mocked: `retrieval.ts` (the seam —
`search` + `fetchSource` — and the mock set), `corpus.ts` (the receipt, the anchor check, the note),
`run.ts` (the driver). It runs as the AFK leg runs:

    BD_READONLY=1 bun tools/inquiry/run.ts [corpus-dir]

Three rules are code now rather than prose: the **receipt** (`sources/<slug>.md`, line 1 the URL, the id
and a sha256 inside); the **anchored claim** (`notes/<slug>.md`, every claim citing a source, a locator and
a quote — and a quote that does not re-anchor refused rather than written); and the **challenge** (a claim
naming the claim it challenges, so the note shows the pair side by side and decides nothing). The mock set
carries one claim nobody wrote, to show the refusal, and one anchored claim that challenges another, to
show the pair.

Decided with it (round 4): challenges are in the format (Q1); the tool lives at `tools/inquiry/`, a
tracked top-level directory holding nothing of the pack (Q2).

What it raised, still true:

- a URL-shaped id makes a long, lossy file name (`url-https-example-lab.github.io-notes-ablation-budget.md`);
  the id inside the receipt is canonical, so this is cosmetic until a corpus is browsed by name;
- anchoring against the receipt is weaker than re-anchoring against the live source — the same function,
  with a real fetch behind it once a provider exists;
- whitespace normalisation is the whole comparison today (fine for prose, wrong for code or tables).

## Retrieval, as measured

- **OpenAlex answers directly (200) and needs no key.** Abstracts come back as an inverted index and have
to be decoded; on a natural-language query its relevance is mediocre (a probe for agent-loop budgets came
back with "Field Experiments" and a soil-microbiology paper), so a query should be a title, a DOI or
filtered.
- **arxiv answers through the BoostNet proxy on `127.0.0.1:23379`** — the `clash` shell — over `http://` or
`socks5h://`. `arxiv.org/abs/<id>` returns 200 and the abstract comes down readable;
`export.arxiv.org/api` returns 429 even with a User-Agent (so discovery is OpenAlex's job, not the API's).
With that shell closed, arxiv is unreachable — direct, and on every other port probed.
- **`huggingface.co/papers/<id>` answers 200** for a real arxiv id: the OA copy for a work whose arxiv page
is out of reach.
- **Semantic Scholar** answers 429 unauthenticated; it needs a key.

The seam reads `http_proxy` / `https_proxy`, so the proxy belongs in the environment, not hard-coded in the
tool.

## Live path (2026-09-14)

The tool now has real providers beside the mock: OpenAlex for discovery and for anything with a DOI or an
OpenAlex id (its abstract arrives as an inverted index and is decoded), arxiv abstract pages through
`INQUIRY_PROXY` / `https_proxy` / `http_proxy` / `all_proxy`, and a plain-URL reader for anything else.
Verified live:

- OpenAlex search puts the right paper first for a title query, and hands back an abstract for it;
- `arxiv.org/abs/1706.03762` through `socks5h://127.0.0.1:23379` answers 200 in about 0.4s;
- **the same paper's title + abstract from arxiv and from OpenAlex hash identically** (`b59de13b…`): two
  providers over one work cross-check each other's bytes, which is what makes an anchor source-independent;
- a work with no abstract yields a metadata-only receipt and the tool says outright that nothing in it is
  quotable — a title is not a claim;
- a DOI stays the citation key (`doi:10.1038/nature12373`), with the OpenAlex id as an alias.

Caveat worth remembering: OpenAlex relevance on a natural-language query is poor — its hits are candidates
to choose from, not an answer.

The tool carries its own gate now: `./node_modules/.bin/tsc -p tsconfig.tools.json`, named in AGENTS.md
beside the pack's two.

## Still open

- **No effort has been taken through this end to end.** One question now has (2026-09-14: DVC's holdings,
  read from dvc.org through `tools/inquiry/`, 24 receipts and a note of 50 anchored claims, recorded as a
  comment on `lab-zfl.1` and closed). What is still missing is the long path: a map worked to a spec.
- **The idea object is decided in principle and owed in shape.** Its states, home, links and author, as
  recorded above; nothing in the tooling knows about ideas yet.
- **The tool has no home in a Target.** Decided: a Target that wants it copies `tools/inquiry/` in; no
  package, and the tracker doc now says so. Worth revisiting the day the copying hurts.
- **One retrieval source is unwired**: Semantic Scholar, whose citation graph OpenAlex only half serves
  (it wants a free key). The seam takes it without changing a caller.

