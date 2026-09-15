# The skill set

This folder is the **source** of the seven skills that know about an issue tracker. Each machine
carries one installed **copy** of every member under `~/.agents/skills/` — the shared Agent Skills
root every agent reads, directly or through a link of its own. The members — described here for a
reader; the install reads the set off `skills/*/`, so this list is never its input:

- `setup-matt-pocock-skills` — the setup skill, with the store-backed contract
  (`issue-tracker-beads.md`) beside the tracker templates it already carried
- `drain` — the operator surface: run a drain, read its report, brake an issue, clear an incident
- `to-tickets`, `implement`, `to-spec`, `triage`, `ask-matt` — edited to read
  `docs/agents/issue-tracker.md` instead of assuming a file shape

The rest of the family is not in the set: those skills carry no tracker surface, so they are
referenced, never copied. One instruction in two places is the duplication this source exists to
prevent — and the set is exactly these seven, one copy per machine.

The one document with a second home is the contract the setup skill carries: this repository is a
store-backed Target, so it runs under that same contract as `docs/agents/issue-tracker.md`, and the two
are one document — edit one, copy it over the other. `tracker-contract-repro.ts` in the pack's suite
compares them byte for byte, because nothing else noticed when the Target's copy gained the draft-answer
rule and the shipped one did not (`beads-dag/24`, found by `beads-dag/29`).

## Install

```
bun tools/flow.ts install
```

Run from this repo's root. It copies every member of this folder into `~/.agents/skills/`, whole
(`SKILL.md`, `agents/`, and every reference file), points `~/.archon/workflows/beads-dag` at this
checkout's pack, and then checks itself. The member list is read off `skills/*/` — this folder is the
set — so there is no list here to fall out of date, and nothing here to re-read before an install.

`~/.agents/skills/` is the destination — the shared Agent Skills root. pi reads it natively (the
agent's own `docs/skills.md` lists it beside `~/.pi/agent/skills/`, which no longer exists on this
machine), `~/.grok/skills` is a symlink to it, and the other agents' directories carry links into it
too. cc-switch owns that root here — its storage location is `unified` and it rides WebDAV as a
snapshot — so this copy is live locally and leaves the machine at the next upload. One copy per
machine is the rule, which is why the copy goes to the shared root and not into a project.

## The check that proves the install

```
bun tools/flow.ts check
```

Byte comparison, file by file, of every member against its installed copy — every file, not just the
`SKILL.md` — plus the pack link. When the install holds it prints two lines and exits zero:

```
pack   /home/yky/.archon/workflows/beads-dag -> /data3/yky/beads-matt-dag/.archon/workflows/beads-dag
check  7 members: 7 identical, 0 differ, 0 missing — pack link ok
```

When it does not, it names the member and the file and exits non-zero: `differs: SKILL.md`,
`missing in dest: …`, `only in dest: …`, or `no installed copy` for a member that never landed. The
pack half fails three ways — no link, a link pointing somewhere else, or a **real directory** where
the link goes, which shadows the installed pack because Archon loads a repo's own
`.archon/workflows` ahead of its home path (measured 2026-09-15). `install` again is the fix, and it
refuses to touch that real directory rather than replacing it.

## A stale install

A stale install is an installed copy older than this source — someone edited here and did not
re-install. It is invisible by looking: `cp -a` preserves timestamps, so the installed files wear
the source's own mtimes and can read as fresh. The check is how it is noticed: the member stops
counting towards `7 identical`, and the file that differs or went missing is named.

Two facts that keep the installation honest:

- **The copy is one-way.** The installed copy is an output: edit it and the next install replaces
  the edit. Change the file here, then run `bun tools/flow.ts install` — re-installing is that one
  command, and running it twice changes nothing.
- **A running pi process does not reload skills.** The copy is live in the next pi process, not in
  the one that watched it land.

## Why the names are unchanged

pi keeps the first skill found on a name collision, and it searches the shared root before a
project's `.pi/skills/` or `.agents/skills/` (`pi`'s own `docs/skills.md`: "Name collisions (same
name from different locations) warn and keep the first skill found."). Two bad outcomes, both
avoided by the rule:

- A second copy under the **same name** is silently dead: with the set installed globally, a
  project that carries its own `to-tickets` never runs — the one pi found first wins, and it is not
  the project's.
- A second copy under a **new name** shadows nothing and is shadowed by nothing: the machine then
  carries two skills for one job, and which one runs depends on the agent's pick — while every
  cross-reference (`/to-tickets`, `/triage`) and muscle memory still points at the old name.

So the set keeps the upstream names and installs exactly one copy of each. A `beads-` prefix buys
nothing a sentence cannot; the store-backed prose lives inside the files, and the names are the
interface. The rule and its reasoning are `docs/specs/2026-09-11-beads-issue-tracker-consensus.md`
§10.7.

## The install script: the rule, and why it changed

**Recorded decision, revisited 2026-09-15: there is an install script after all** — `tools/flow.ts`,
whose two verbs are the install and the check above. The rule it replaces reasoned that a script would
carry its own copy of the member list and the destination, a second source of truth for what the set
is. The script answers that argument rather than ignoring it: it derives the members (`skills/*/`
holding a `SKILL.md`) and the check re-derives the same list, so no second place spells the set for
them — the prose list at the top of this file is a description, never the install's input — and there
is no hand copy left beside the script to drift from.

What changed the decision was measurement, not taste. `cp -a` gives the installed file the source's
mtime, so a stale install reads as fresh, and the hand copy is only as current as the last person who
remembered to run it: on 2026-09-15 this machine's copy was a day behind the source, missing two
rules a session was already relying on. The same day produced the second failure — a Target cloned
from this repo inherited a tracked copy of the pack, and Archon loads a repo's own `.archon/workflows`
ahead of the installed one, so the drain there would have run day-old code with nothing saying so.
Both are one disease: a copy whose staleness nobody is told about. A script that compares bytes is the
cheapest thing that tells them.

Two limits it keeps on purpose: it never deletes anything it did not install (a real directory where
the pack link goes is refused, not replaced), and it knows only the two machine-level copies — a
Target's `docs/agents/` and `tools/inquiry/` are still copied per repo by hand, and unchecked.
