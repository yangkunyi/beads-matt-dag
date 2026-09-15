SOURCE-URL: file:///data3/yky/beads-matt-dag/skills/README.md
FETCHED: 2026-09-15T04:05:49.774Z
HTTP: 200
SOURCE-ID: file:/data3/yky/beads-matt-dag/skills/README.md
TITLE: README.md
EXTRACT: verbatim
SHA256: 1161f990995a7321f72fc94ae4299935959d12e20c2f070dd4fc9d0f5642904d

# The skill set

This folder is the **source** of the seven skills that know about an issue tracker. Each machine
carries one installed **copy** of every member under `~/.agents/skills/` — the shared Agent Skills
root every agent reads, directly or through a link of its own. The members, exactly:

- `setup-matt-pocock-skills` — the setup skill, with the store-backed contract
  (`issue-tracker-beads.md`) beside the tracker templates it already carried
- `drain` — the operator surface: run a drain, read its report, brake an issue, clear an incident
- `to-tickets`, `implement`, `to-spec`, `triage`, `ask-matt` — edited to read
  `docs/agents/issue-tracker.md` instead of assuming a file shape

The rest of the family is not in the set: those skills carry no tracker surface, so they are
referenced, never copied. One instruction in two places is the duplication this source exists to
prevent — copy exactly these seven.

## Install

Copy one folder per member, whole: `SKILL.md`, `agents/`, and every reference file. Run both this
and the check from this repo's root.

```
mkdir -p ~/.agents/skills && cp -a skills/{setup-matt-pocock-skills,drain,to-tickets,implement,to-spec,triage,ask-matt} ~/.agents/skills/
```

`~/.agents/skills/` is the destination — the shared Agent Skills root. pi reads it natively (the
agent's own `docs/skills.md` lists it beside `~/.pi/agent/skills/`, which no longer exists on this
machine), `~/.grok/skills` is a symlink to it, and the other agents' directories carry links into it
too. cc-switch owns that root here — its storage location is `unified` and it rides WebDAV as a
snapshot — so this copy is live locally and leaves the machine at the next upload. One copy per
machine is the rule, which is why the copy goes to the shared root and not into a project.

## The check that proves the install

`diff -rq` between every source folder and its installed copy, expected empty. The loop reads the
member list off `skills/*/` — this folder is the set — so the check cannot drift from it:

```
for s in skills/*/; do s=${s#skills/}; s=${s%/}; printf '%-26s' "$s"; diff -rq "skills/$s" "$HOME/.agents/skills/$s" && echo "identical"; done
```

When the install holds, the loop prints one verdict per member and nothing from `diff`:

```
ask-matt                  identical
drain                     identical
implement                 identical
setup-matt-pocock-skills  identical
to-spec                   identical
to-tickets                identical
triage                    identical
```

An empty `diff` means the installed folder is byte-identical to the source — every file, not just
the `SKILL.md`. An install failing the check prints `Files … differ`, or `Only in …` for a file one
side has and the other lost, beside that member's name. Re-run the copy above, then the check.

## A stale install

A stale install is an installed copy older than this source — someone edited here and did not
re-install. It is invisible by looking: `cp -a` preserves timestamps, so the installed files wear
the source's own mtimes and can read as fresh. The check is how it is noticed — the member stops
printing `identical`, and `diff` prints the differing file or the missing one.

Two facts that keep the installation honest:

- **The copy is one-way.** The installed copy is an output: edit it and the next install replaces
  the edit. Change the file here, then run the copy command again — re-installing is that one line,
  and running it twice changes nothing.
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

## No install script

**Recorded decision: there is no install script.** A script would carry its own copy of the member
list and the destination — a second source of truth for what the set is — and this file would
describe the script instead of the install. The copy command and the check above are the whole
install, and both are re-read from here.

