# 05 — the set installs, and the install is written down

**What to build:** The install rule and its execution. `skills/README.md` states that this repo is the
source, that installing is an explicit copy of one folder per skill into the machine's skills directory
(`~/.pi/agent/skills`, a symlink to the pi-agent-config repo), the one-line copy command, and the check that
proves the install (`diff -rq` between source and installed, expected empty). Then perform it and record the
result. This is the step that makes the set live, so it is its own ticket rather than a footnote.

**Spec:** `docs/specs/2026-09-11-beads-issue-tracker-consensus.md` (§10.7)
**Blocked by:** `01`, `02`, `03`, `04`
**Status:** BLOCKED

- [x] `skills/README.md` names the source, the destination, the copy command, the byte-identical check, and
      why the names are unchanged (pi keeps the first skill found on a name collision, and
      `~/.pi/agent/skills` is searched before project directories, so a second copy under a new name would be
      shadowed or would shadow)
- [x] the copy is performed, one folder per member, and the check is quoted in the Comments with its output
      (empty diff) and the installed file list
- [x] the installed set is exactly the members §10.7 decides: the tracker contract beside the existing
      templates, `drain`, and the edited `to-tickets`, `implement`, `to-spec`, `triage`,
      `setup-matt-pocock-skills` and `ask-matt`
- [x] a re-install is one command, and running it twice changes nothing (show both)
- [x] the file says what a *stale* install looks like (a copy older than the source) and how a reader notices
- [x] nothing under `.archon/` changes

## Comments

Implemented on branch `main`. Two paths written in this repo: `skills/README.md` (new, 94 lines) and this
ticket. The install landed in `/data3/yky/pi-agent-config/skills/` — seven folders copied whole, six
overwriting the upstream copies and `drain` new — and nothing was committed there (`HEAD` is still
`a231f5f`). `/data3/yky/endo_label` and `/data3/yky/workflow` were not touched; nothing under `.archon/`
changed.

### What was written

`skills/README.md`, the install rule and its record:

- **The set** — the seven members, and the sentence that the rest of the family is referenced, never copied.
- **Install** — source (this folder), destination (`~/.pi/agent/skills/`, on this machine a symlink to
  `/data3/yky/pi-agent-config/skills`), each folder copied whole (`SKILL.md`, `agents/`, reference files),
  and the one-line command.
- **The check** — the `diff -rq` loop, empty output expected, and what a failing line looks like.
- **A stale install** — a copy older than the source; invisible by timestamps (`cp -a` preserves the
  source's own mtimes), visible as the check's member line; the copy is one-way, re-installing is the same
  command, and a running pi process does not reload skills.
- **Why the names are unchanged** — pi keeps the first skill found on a collision and searches
  `~/.pi/agent/skills/` before a project's `.pi/skills/`/`.agents/skills/` (quote below), so a same-name
  second copy is silently dead and a renamed copy leaves two live skills for one job.
- **No install script** — recorded decision, with the second-source-of-truth reason.

### The install, and that it overwrote real copies

Before the copy, `drain` had no installed copy and the other six differed from the source; the installed
`SKILL.md` hashes (the `to-spec`/`triage`/`ask-matt` values are the upstream copies ticket `04` recorded as
untouched, so the before-state is the upstream state):

```
$ for m in setup-matt-pocock-skills to-tickets implement to-spec triage ask-matt; do printf '%-26s ' "$m"; sha256sum ~/.pi/agent/skills/$m/SKILL.md | cut -d' ' -f1; done
setup-matt-pocock-skills   310fb1a73c0467e617e17d7c41d4a2278b5405c4a27f36d7cd22bb4599aee6bb
to-tickets                 46bc8343d12ec2701088f6cb6b92fc01cbb359714cec76a141e2546212c4ad64
implement                  d8469b54b5ce3ea83e8a3b973065784d0ba31c0746916166ccc5daba68e48b22
to-spec                    5d26479544b08048d3a8f79d937b39bc613a617f026b3fd083bafc1e99a7b811
triage                     91e2817ecb688c4df4e2444eab472d1d79d2a0a57abf9f6726967664c460ff2e
ask-matt                   3d38910535f5f01e15bc5fd7f6ca8880d628cd248741f08e6780dd7c1828e832
$ ls -d ~/.pi/agent/skills/drain
ls: cannot access '/data3/yky/.pi/agent/skills/drain': No such file or directory
```

The copy (the README's command, run from this repo's root):

```
$ mkdir -p ~/.pi/agent/skills && cp -a skills/{setup-matt-pocock-skills,drain,to-tickets,implement,to-spec,triage,ask-matt} ~/.pi/agent/skills/
(no output, exit 0)
```

After it, the same loop shows new values and this time includes `drain`: the overwrite really happened.

```
$ for m in setup-matt-pocock-skills drain to-tickets implement to-spec triage ask-matt; do printf '%-26s ' "$m"; sha256sum ~/.pi/agent/skills/$m/SKILL.md | cut -d' ' -f1; done
setup-matt-pocock-skills   dd2e1be462b756f43de200d0b7105b6f5e5309fcb5436e8d09dbb7e13b18c148
drain                      82bc003061a92a339c14906d1f01f2cfa61bd215ee302c6f440fe66e535ba670
to-tickets                 22ec4ee7c13d5358aac04bf744259d43a1f88f07864eaa0f3c71dd08f26d4b86
implement                  f83f555ff44b657aeca2c9a330d777aad8da658f78acb68cc56e4c3e4e143f5e
to-spec                    18b095883e34c40f0ba8047a7786159742096ebe99973954c3ad6967ecbd9022
triage                     f12150104133e34c5a16fee45df6d77e537b9529e3e4db3e797287b93d7867e5
ask-matt                   73c27ac34a3c6d0f765a56f5d7d4a225a54d66ca4cb0cef72af1b8ebfe8e0bc1
```

Each after-value equals `sha256sum skills/<member>/SKILL.md` in this repo; the check below being empty says
so byte for byte.

### The check, and the installed file list

The check is the README's one-liner, run verbatim from this repo's root; it reads the member list off
`skills/*/`, so it cannot drift from the source folder:

```
$ for s in skills/*/; do s=${s#skills/}; s=${s%/}; printf '%-26s' "$s"; diff -rq "skills/$s" "$HOME/.pi/agent/skills/$s" && echo "identical"; done
ask-matt                  identical
drain                     identical
implement                 identical
setup-matt-pocock-skills  identical
to-spec                   identical
to-tickets                identical
triage                    identical
```

Every line is `diff` printing nothing (empty) and exiting 0. The installed file list — 22 files, each
member whole, not just the `SKILL.md`:

```
$ find ~/.pi/agent/skills/{setup-matt-pocock-skills,drain,to-tickets,implement,to-spec,triage,ask-matt} -type f | sed "s|$HOME/.pi/agent/skills/||" | sort
ask-matt/agents/openai.yaml
ask-matt/PHASE-BOUNDARIES.md
ask-matt/SKILL.md
drain/SKILL.md
implement/agents/openai.yaml
implement/SKILL.md
setup-matt-pocock-skills/agents/openai.yaml
setup-matt-pocock-skills/domain.md
setup-matt-pocock-skills/issue-tracker-beads.md
setup-matt-pocock-skills/issue-tracker-github.md
setup-matt-pocock-skills/issue-tracker-gitlab.md
setup-matt-pocock-skills/issue-tracker-local.md
setup-matt-pocock-skills/SKILL.md
setup-matt-pocock-skills/triage-labels.md
to-spec/agents/openai.yaml
to-spec/SKILL.md
to-tickets/agents/openai.yaml
to-tickets/SKILL.md
triage/AGENT-BRIEF.md
triage/agents/openai.yaml
triage/OUT-OF-SCOPE.md
triage/SKILL.md
--- count: 22
```

The set is exactly §10.7's: `setup-matt-pocock-skills` carries `issue-tracker-beads.md` beside its four
templates, `drain` is the operator skill, and the five edited skills are in place. The README did not land
at the destination — it is not a member.

### A re-install is one command, run twice with nothing changing

Manifests over all 22 installed files (`sha256sum` of every member file, taken once per state):

```
$ manifest() { for m in setup-matt-pocock-skills drain to-tickets implement to-spec triage ask-matt; do find "$HOME/.pi/agent/skills/$m" -type f; done | sort | xargs sha256sum; }
$ manifest > run1.txt                        # the install state
$ wc -l < run1.txt
22
$ cp -a skills/{setup-matt-pocock-skills,drain,to-tickets,implement,to-spec,triage,ask-matt} ~/.pi/agent/skills/   # re-install run 2
(no output, exit 0)
$ manifest > run2.txt && diff run1.txt run2.txt && echo "run 2 changed nothing — manifest byte-identical"
run 2 changed nothing — manifest byte-identical
$ cp -a skills/{setup-matt-pocock-skills,drain,to-tickets,implement,to-spec,triage,ask-matt} ~/.pi/agent/skills/   # re-install run 3
(no output, exit 0)
$ manifest > run3.txt && diff run2.txt run3.txt && echo "run 3 changed nothing — manifest byte-identical"
run 3 changed nothing — manifest byte-identical
```

### What was written outside this repo, and what was not committed there

`~/.pi/agent/skills` resolves to `/data3/yky/pi-agent-config/skills`, so the install is a change to that
repo's working tree:

```
$ git -C /data3/yky/pi-agent-config status --porcelain -- skills
 M skills/ask-matt/SKILL.md
 M skills/implement/SKILL.md
 M skills/implement/agents/openai.yaml
 M skills/setup-matt-pocock-skills/SKILL.md
 M skills/to-spec/SKILL.md
 M skills/to-tickets/SKILL.md
 M skills/to-tickets/agents/openai.yaml
 M skills/triage/AGENT-BRIEF.md
 M skills/triage/OUT-OF-SCOPE.md
 M skills/triage/SKILL.md
?? skills/drain/
?? skills/setup-matt-pocock-skills/issue-tracker-beads.md
$ git -C /data3/yky/pi-agent-config log --oneline -1
a231f5f skills: unify customized matt on grok+pi; add archon-cli and grok orchestrator
```

No commit was made in that repo (its tree already carried unrelated modifications: `agents/`, `models.json`,
`settings.json`).

### Does this session see `drain`? No — a fresh pi process does

`pi` has no documented command that lists the skills it discovers: `pi --help` has none, `pi list` is "List
installed extensions from settings", and `pi config` opens a TUI. The ticket's fallback therefore holds:
the filesystem check is the evidence, and no listing command was invented.

pi's own docs (`…/pi-coding-agent/docs/skills.md`, pi 0.85.1) put `~/.pi/agent/skills/` among the global
locations, say "directories containing `SKILL.md` are discovered recursively", that a skill with a missing
description is not loaded, and that "Name collisions (same name from different locations) warn and keep the
first skill found." The installed copies were validated the way the loader needs them (frontmatter parsed
with `Bun.YAML.parse`; `name` equals the folder; non-empty description):

```
$ bun /tmp/skills-install-05/validate.ts
setup-matt-pocock-skills   loadable    name=setup-matt-pocock-skills desc=181ch model-invocation=off (/skill:setup-matt-pocock-skills)
drain                      loadable    name=drain desc=133ch model-invocation=off (/skill:drain)
to-tickets                 loadable    name=to-tickets desc=199ch model-invocation=off (/skill:to-tickets)
implement                  loadable    name=implement desc=99ch model-invocation=off (/skill:implement)
to-spec                    loadable    name=to-spec desc=106ch model-invocation=off (/skill:to-spec)
triage                     loadable    name=triage desc=137ch model-invocation=off (/skill:triage)
ask-matt                   loadable    name=ask-matt desc=83ch model-invocation=off (/skill:ask-matt)

all seven would load in a fresh pi process
```

**This session cannot see `drain`.** Its skill list was read at startup, before the copy, and a running pi
process does not reload skills. A **fresh** pi process will find `~/.pi/agent/skills/drain/SKILL.md` and
discover it. One nuance stated rather than blurred: all seven members set `disable-model-invocation: true`,
so they are hidden from the model's system prompt and are invoked as commands (`/skill:drain`, or the
harness's `/drain` form) by the human. `drain` is available to a fresh process; it is not offered to the
model.

### Gates

```
$ timeout 300 ./node_modules/.bin/tsc -p tsconfig.pack.json
(exit 0, no output)
$ timeout 1800 bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts
ok   brief-repro.ts  {"ok":true}
… ok yaml-contract-repro.ts  {"ok":true}
18/18 repros passed
$ git status --porcelain -- .archon ; git diff --stat HEAD -- .archon
(no output both times)
```

The scratch directory `/tmp/skills-install-05` (manifests and the validator) was removed.

### Judgement calls

1. **The check derives its member list (`skills/*/`) instead of repeating the seven.** The source folder is
   the set, so there is one list to maintain; a member added to the source and not installed shows in the
   check as a missing installed path rather than being silently skipped.
2. **`mkdir -p ~/.pi/agent/skills` is part of the copy command.** It keeps the command one line and works on
   a machine where pi has not created the directory yet; on this machine (`skills` is a symlink to a
   directory) it is a no-op.
3. **The README is not installed.** The set is the seven skill folders; copying those leaves the destination
   without a `skills/README.md`.
4. **The README names the destination symlink.** A machine fact, but the one an installer must know here: the
   copy is a second repo's working tree, not a private directory.
