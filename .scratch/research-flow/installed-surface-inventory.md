# INSTALLED surface inventory (this machine)

Axis question: for every capability this repo implements by hand, does something already installed ship it?

Screens (refuse if violated; say what it would buy): bun runtime; Target must not install a binary; no service/database/queue (`docs/adr/0009-neighbours-we-do-not-adopt.md:29`); beads owns graph+frontier (`docs/adr/0001`); surface is a view (`docs/adr/0007`); one executor per domain (`docs/adr/0007`).

Method: ran binaries; read installed package source + `~/.pi/agent/skills/archon-cli/**`. Never the live beads store. Throwaway `bd init` `/tmp/bd-surface-3194169`. Isolation experiment `/tmp/archon-iso-exp-3176973` (registers a row in `~/.archon/archon.db`; cleaned to `status=destroyed`). Drain not run. No commit.

Versions (ran):
- `which bd` → `/data3/yky/.local/bin/bd` → `/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@beads/bd/bin/bd.js`
- `bd --version` → `bd version 1.2.2 (6c124203e)`
- `which archon` → `/data3/yky/.local/bin/archon` (ELF 64-bit, not a node shim)
- `archon --version` → `Archon CLI v0.10.1` Platform linux-x64 Build binary Database sqlite Git `9820785c`
- `which bun` → `/data3/yky/.bun/bin/bun` ; `bun --version` → `1.4.2`
- pi: `/data3/yky/.local/bin/pi` ; `pi --version` → `0.85.1` ; package `@earendil-works/pi-coding-agent@0.85.1` at `$PI_PACKAGE_DIR` / `npm root -g` `.../node_modules/@earendil-works/pi-coding-agent`

---

## 1. bd 1.2.2 — full top-level surface

`bd --help` and `bd help` are the same 110 commands. Global flags on every command: `--actor --db -C/--directory --dolt-auto-commit --global -h --ignore-schema-skew --json --profile -q/--quiet --readonly --sandbox -v/--verbose -V/--version`.

Top-level (complete, from `bd --help`):
assign children close comment comments create create-form delete edit gate label link list merge-slot note priority promote q query reopen search set-state show state tag todo update | count diff find-duplicates history lint stale status statuses types | dep duplicate duplicates epic graph supersede swarm | backup branch export federation import restore vc | bootstrap config context dolt forget hooks human info init kv memories onboard prime quickstart recall remember setup where | batch compact doctor flatten gc migrate ping preflight prune purge recompute-blocked rename-prefix rules sql upgrade worktree | admin jira linear repo | ado audit blocked completion cook defer formula github gitlab help init-safety mail metrics mol notion orphans ready rename ship undefer version

Nested (ran `bd <cmd> --help` then every `Available Commands` child `--help`; 5021 lines):
- admin: cleanup compact reset
- ado: projects pull push status sync
- audit: label record
- backup: init remove restore status sync
- comments: add list
- completion: bash fish powershell zsh
- config: apply drift get list set set-many show unset validate
- dep: add cycles list relate remove tree unrelate
- dolt: clean-databases commit killall pull push remote set show start status stop test
- epic: close-eligible status
- federation: add-peer list-peers remove-peer status sync
- formula: convert list show
- gate: add-waiter check create discover list resolve show
- github: pull push repos status sync
- gitlab: projects pull push status sync
- graph: check
- hooks: install list run uninstall
- human: dismiss list respond stats
- jira: pull push status sync
- kv: clear get list set
- label: add list list-all propagate remove
- linear: pull push status sync teams
- merge-slot: acquire check create release
- metrics: example off on
- migrate: hooks issues schema sync
- mol: bond burn current distill last-activity pour progress ready seed show squash stale wisp
- notion: connect init pull push status sync
- repo: add list remove sync
- rules: audit compact
- state: list
- swarm: create list status validate
- todo: add done list
- upgrade: ack review status
- vc: commit merge status
- worktree: create info list remove

### Named commands (flags; Global Flags omitted)

**set-state** `bd set-state <issue-id> <dimension>=<value>` `--reason`. Writes event bead + replaces `<dimension>:<value>` label. Ran: `bd set-state bd-surface-3194169-7ny reading=none --reason probe --json` → `{"changed":true,"dimension":"reading","new_value":"none","old_value":null,...}` ; `bd show` labels `['reading:none']`.

**state** `bd state <issue-id> <dimension>` ; child `list`. Ran: `bd state … reading` → `none`.

**query** expression language `field=value` AND/OR/NOT, fields status/priority/type/assignee/owner/label/title/description/notes/created/updated/started/closed/id/spec/pinned/ephemeral/template/parent/mol_type. Flags `--all --limit --long --offset --parse-only --reverse --sort`. Ran: `bd query "status=open AND priority<=2" --json` → issues array (gate + blocked-work).

**graph** `[issue-id]` `--all --box --compact --dot --html` ; child `check`. Default: terminal DAG layers. Ran `--all`: LAYER 0 gate → LAYER 1 blocked-work. `--json`: `{Root, Issues, ...}` **not** `{x,y}` coordinates.

**lint** `[issue-id...]` `-s/--status -t/--type`.

**promote** `<wisp-id>` `-r/--reason`.

**duplicate** `<id> --of <canonical>`.

**supersede** `<id> --with <new>`.

**history** `<id>` `--limit`.

**diff** `<from-ref> <to-ref>`.

**stale** `-d/--days -n/--limit -s/--status`.

**backup** init/remove/restore/status/sync. Dolt-native, not JSONL.

**federation** add-peer/list-peers/remove-peer/status/sync. Requires Dolt.

**todo** add/done/list (task wrappers).

**note** `<id> [text]` `--file --stdin`.

**label** add/list/list-all/propagate/remove.

**link** `<id1> <id2>` `-t/--type` default blocks. Shorthand `bd dep add`.

**epic** close-eligible/status.

**children** `<parent-id>` `--pretty`. Alias `bd list --parent --status all`.

**q** `[title]` `-l -p -t`. Prints only id.

**search** `[query]` many filters (assignee/dates/label/status/type/…).

**count** `--by-status --by-priority --by-type --by-assignee --by-label` + filters.

**status** (alias stats) `--all --assigned --no-activity`.

**types** `--json`. Ran: core_types task/bug/feature/chore/epic/decision/spike/story/milestone. No `experiment` until `types.custom`.

**statuses** `--json`. Ran: open(active) in_progress(wip) blocked(wip) deferred(frozen) closed(done) pinned(frozen) hooked(wip).

**worktree** create/info/list/remove.
- create `<name> [--branch=]` — **"Creates a git worktree at ./<name> (or specified path)"**. Ran: `bd worktree create feature-auth` → `Created worktree: /tmp/bd-surface-3194169/feature-auth` ; `test -d ./feature-auth` YES.
- list: name/path/branch/beads state.
- remove `<name>` `--force`.
- info: current worktree.

**gate** add-waiter/check/create/discover/list/resolve/show.
Types from `--help`: human, timer, gh:run, gh:pr, bead. **Not** a triage label.
Ran: `bd gate create --type=human --blocks $ID --reason="Need design review" --json` → `issue_type=gate await_type=human`. Then `bd ready --json` → `[]`.

**merge-slot** acquire/check/create/release.
Help: **"metadata.holder: who currently holds the slot"** ; status open vs in_progress ; waiters queue. `--holder` default BEADS_ACTOR. **No pid flag.**
Ran: create → `{"id":"bd-surface-3194169-merge-slot","status":"open"}` ; acquire `--holder crash-name` → `{"acquired":true,"holder":"crash-name"}` ; `bd list` metadata `{'holder':'crash-name'}` labels `['gt:slot']` status in_progress ; second acquire `--holder other` exit 1 `acquired:false holder:crash-name`.

**swarm** create/list/status/validate. Epic DAG molecules.

**ready** `--claim --gated --mol --label --exclude-type --json --limit 0`. Pack uses this (`store.ts:199` `READY_ARGS = ["ready","--json","--limit","0"]`).

**delete** `--cascade --dry-run -f/--force --from-file`. Default **fails if dependents not in deletion set**. `--force` orphans. `--cascade` deletes dependents. (ADR-0008 wants refuse-not-cascade; surface does not call this yet — `actions.ts:32` ACCEPTED_INTENTS has no `delete`.)

**--readonly**: ran `bd --readonly create "should fail"` → `Error: operation 'create' is not allowed in read-only mode` exit 1. Same switch as `BD_READONLY` (`worker-env.ts:17`).

**--sandbox**: ran `bd --sandbox create "sandbox-ok" --json` → created (exit 0). Help: "disables Dolt auto-push". Throwaway `bd config get dolt.auto-push` → `(not set in config.yaml)`.

---

## 2. archon 0.10.1 — flat --help (verified)

`archon --help`, `archon workflow --help`, `archon isolation --help`, `archon complete --help`, `archon workflow test|get|wait|resume --help`, `archon serve --help`, `archon doctor --help` **all reprint the same command list**. Flags are only on the root help. Learned the rest from skills + binary strings + SQLite.

Commands (from `archon --help`):
chat, setup, workflow list/run/status/runs/get/wait/resume/cancel/abandon/respond/search/install/test, isolation list, isolation cleanup [days], isolation cleanup --merged, complete \<branch\> [...], serve, skill install, doctor [--full], auth github, ai key/login/list/logout/tier/alias/default, telemetry, validate workflows/commands, version, help.

Options (root, the only flag list):
`--cwd --branch/-b --from/--from-branch --base --workflow-source --no-worktree --folder --input --model --config --resume --adopt --supersedes --dry-run --stubs --stubs-init --default-stubs --exec-code --pause-at-gates --spawn --quiet --verbose --json --events --detach --all --status --open --limit --timeout --conversation-id --port --download-only --force`

Skills (`~/.pi/agent/skills/archon-cli/`):
- `running-workflows.md`: `--branch` default isolation; `--from` base; `--no-worktree` live checkout; `--folder` non-git; `wait` over poll; `complete <branch>` removes worktree+branches; `isolation cleanup` 7d / `--merged`.
- `manage-runs.md`: `get --json` outcome + `leave_behind.artifactFiles`; `get --verbose --json` nodes; `outcome_field` persisted as normalized `outcome` only (`succeeded`/`failed`), authored field name not top-level. `approve`/`reject`/`respond` + `--json` records without continuing. Cancel kills; abandon is state-only.
- `authoring-workflows.md` + `node-reference.md:19-22,232-265`: `outcome_field`, `interactive` (required if any `approval:` — fresh launch cannot `--detach`), `worktree.enabled`, `mutates_checkout`, node types command/prompt/bash/script/loop/loop_group/approval/cancel/wait/workflow/include. `workflow:` child + `isolation: worktree`. `include:` + `fan_out: {items, as, max_parallel, join}`. `workflow test` dry-run fixtures, exec-code in scratch worktree of HEAD, never creates a run.

Pack YAML pins isolation off:
- `beads-dag-drain.yaml:7-8` `worktree: enabled: false`
- `beads-dag-experiment.yaml:9-10` same
- `beads-dag-inquiry.yaml:10-11` same

### Isolation registry — ran, not asserted

Source of truth: **SQLite** `~/.archon/archon.db` table `remote_agent_isolation_environments` (0 rows before experiment). Schema (pragma): id, codebase_id, workflow_type, workflow_id, provider (default `'worktree'`), working_path, branch_name, created_by_platform, created_by_user_id, metadata, status (`'active'` default), created_at, updated_at.

Binary (`strings` on `/data3/yky/.local/bin/archon`): `createIsolationStore`, `listAllActiveWithCodebase`, `findActiveByBranchName`, `INSERT INTO remote_agent_isolation_environments`, uses `bun:sqlite` `Database`. **Not** `git worktree list` as the registry (git list is a side effect).

`remote_agent_codebases` (41 rows) has `default_cwd`. beads-matt-dag **is** registered: `name=yangkunyi/beads-matt-dag default_cwd=/data3/yky/beads-matt-dag`.

`archon isolation list` from beads-matt-dag (0 active envs):
```
No codebases registered.
Use /clone or --branch to create worktrees.
```
That message is **false** when a codebase row exists but no **active** isolation row. `--json` **does not emit JSON** (same prose).

`archon complete beads-dag-30-first-real-experiment` from this repo:
```
  Not found: beads-dag-30-first-real-experiment (no active isolation environment)

Complete: 0 completed, 0 failed, 1 not found
```
Pack worktree exists (`git worktree list`: `.../worktrees/beads-dag-30-first-real-experiment` on `beads/beads-dag/30-first-real-experiment`). Archon does not know it. ADR-0009 row holds.

### Isolation experiment (throwaway, quoted)

Repo `/tmp/archon-iso-exp-3176973`, bash-only workflow `iso-bash` (`worktree.enabled: true`), node `bash: echo ping-ok`.

Without remote, `--branch` **refuses** (verbatim):
```
Error: Cannot determine git remote for /tmp/archon-iso-exp-3176973: no git remote is configured. Add one with `git remote add origin URL`, or use `--no-worktree` to run in the live checkout.
```
After `git remote add origin /tmp/archon-iso-origin-3176973.git`:

`archon workflow run iso-bash --branch test/one "ping"`:
```
Dispatching workflow: **iso-bash**
🚀 **Starting workflow**: `iso-bash`
[ping] Started
[ping] Completed (11ms)
ping-ok
Workflow completed successfully.
```

Creates and **registers**:
- git worktree: `/data3/yky/.archon/workspaces/_local/archon-iso-exp-3176973/worktrees/test/one` branch `test/one` (not `./test/one` in the repo)
- sqlite row: `workflow_type=task workflow_id=test/one provider=worktree branch_name=test/one status=active created_by_platform=cli working_path=.../worktrees/test/one`
- run `a6bb48e5-4ea9-48fc-9c40-8bf4835528b4` `working_path` = that worktree; `outcome` null (no `outcome_field` on the yaml)

`archon isolation list` (verbatim):
```
/tmp/archon-iso-exp-3176973:
  test/one
    Path: /data3/yky/.archon/workspaces/_local/archon-iso-exp-3176973/worktrees/test/one
    Type: task | Platform: cli | Last activity: 0d ago

Total: 1 worktree environment(s)
```

`archon complete test/one` (verbatim):
```
  Warning: gh CLI not available — skipping open PR check
  Completed: test/one

Complete: 1 completed, 0 failed, 0 not found
```
Then: worktree gone, branch `test/one` gone, sqlite `status=destroyed`. Second complete:
```
  Not found: test/one (no active isolation environment)

Complete: 0 completed, 0 failed, 1 not found
```

`archon workflow get a6bb48e5-4ea9-48fc-9c40-8bf4835528b4 --json`: keys id/status/outcome/working_path/output_root/leave_behind/metadata/… ; `outcome=None` ; metadata `model_bindings, workflow_source, node_counts` ; leave_behind.artifactFiles is workflow-source copy, **not** pack `attempted-ids.json` / `run-lock.json`.

`archon workflow resume <that id>`: `Error: Cannot resume run with status 'completed'. Only failed or paused runs can be resumed.`

`archon workflow wait <id> --json --timeout 2`: `{"ok":true,"action":"wait","result":"attention","attention":{"kind":"terminal","status":"completed",...}}`

`archon workflow status --json` from beads-matt-dag: `{"runs":[]}`

`archon isolation cleanup` / `--merged` after complete: `No stale environments found.` / `No codebases with active environments found.`

**Violates no-database if adopted as our worktree registry** (`~/.archon/archon.db` is a service DB). Buys: Archon-owned worktree under `~/.archon/workspaces/_local/<repo>/worktrees/<branch>`, `complete`/`cleanup`, `--from`/`--adopt` lane reuse. Cannot name `worktrees/<feature>-<NN>-<slug>` from handle (`naming.ts:84`).

---

## 3. bun 1.4.2 — this version

`bun --print 'Object.getOwnPropertyNames(Bun).sort()'` includes: `$` `Glob` `SQL` `YAML` `build` `serve` `spawn` `spawnSync` `sql` `file` `sleep` … Types: `/data3/yky/.bun/install/cache/bun-types@1.4.2@@@1/bun.d.ts`.

| API | Installed shape (ran / types) | Pack use |
|---|---|---|
| `Bun.YAML` | `typeof object` keys `parse,stringify`. `bun.d.ts:1479` `YAML.parse(input): unknown` | **ADOPTED** `scripts/config.ts:242` `Bun.YAML.parse` then shape-refuse |
| `Bun.build` | `typeof function` `bun.d.ts:4615` | **ADOPTED** `tools/operator-ui/ui/build.ts:25` client bundle |
| `Bun.serve` | `typeof function` | unused. Operator UI is `node:http` `serve.ts:236,292` |
| `Bun.SQL` / sqlite | `typeof function` keys `SQLError,PostgresError,SQLiteError,MySQLError` | unused (would be a DB; screen) |
| `Bun.spawn` / `spawnSync` | `typeof function` | unused. Pack `git.ts:12` `node:child_process.spawnSync`; same overlay/store |
| `Bun.Glob` | `typeof function` class `bun.d.ts:8884` `scan()` | unused |
| `bun test` | `bun test --help` timeout/coverage/parallel/shard/… | unused. Gate is `beads-dag-drain/tests/run-all.ts` |
| `Bun.$` Shell | `typeof function` keys `Shell,ShellPromise,ShellError,braces,escape` | unused |

`Bun.serve` would replace `node:http` without violating screens (still bun, no extra binary). Buys routes/static/`Content-Encoding`. `Bun.SQL` as graph store **violates ADR-0001** (beads owns graph). `bun test` would buy parallel isolate; pack repros are one-process-per-file already.

---

## 4. pi SDK the pack already drives

Disk: `/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent` v0.85.1. Ladder: `pi-session.ts:246-274` `PI_SDK_PATH` whole ladder if set; else `@earendil-works/pi-coding-agent` then derived dirs. This session `PI_SDK_PATH` unset; `PI_PACKAGE_DIR` points at that tree.

Pack adapter uses (`pi-session.ts:120-158,320-337`): `createAgentSession({cwd, model, thinkingLevel, modelRuntime, sessionManager, resourceLoader, customTools})` ; `SessionManager.open(sessionFile, dir, cwd)` ; `DefaultResourceLoader` ; `ModelRuntime.create` ; `resolveCliModel` ; one custom tool = `defineTool(createBashToolDefinition(cwd, {spawnHook}))` so `BD_READONLY` reaches bash children (`pi-session.ts:109`).

CLI `pi --help` (installed, not what the pack calls, but same package):

Sessions / resumption:
- `--continue/-c` previous session
- `--resume/-r` pick
- `--session <path|id>` `--session-id <id>` `--fork` `--session-dir` `--no-session` `--name`
- SDK comment example `continueSession: true` (`sdk.d.ts:88-90`) — **not on `CreateAgentSessionOptions` interface** (`sdk.d.ts:10-56`). Pack resumes by reopening the jsonl path `artifacts/sessions/<sessionKey>/<role>.jsonl` (`pi-session.ts:33,282`).

Tool allow/deny:
- CLI `--no-tools --no-builtin-tools --tools/-t --exclude-tools/-xt`
- SDK `noTools?: "all"|"builtin"`, `tools?: string[]`, `excludeTools?: string[]`, `customTools` (`sdk.d.ts:33-47`)
- `AgentSessionConfig.allowedToolNames / excludedToolNames` (`agent-session.d.ts:122-125`)
- Pack: does **not** pass `tools`/`excludeTools`; mounts bash with spawn hook only.

Budgets: `Settings.thinkingBudgets?: ThinkingBudgetsSettings` minimal/low/medium/high (`settings-manager.d.ts:40-44,106`). Compaction `reserveTokens`/`keepRecentTokens`. Pack: wall clocks in `roles.ts` (`AGENT_WALL_MS` 2h, `REVIEW_WALL_MS` 30m, `READ_WALL_MS` 1h, `EXPERIMENT_WALL_MS` 4h) + `session.abort()` (`pi-session.ts:340-345`). Does not set thinkingBudgets.

Structured output: not in `CreateAgentSessionOptions`. Archon `output_format` is Archon's, not Pi's SDK field the pack reads. Pack answer = last assistant text in jsonl (`pi-session.ts:67-80,284`).

Approvals: CLI `--approve/-a` `--no-approve/-na` = **project-local file trust**, not Archon gates. `defaultProjectTrust: "ask"|"always"|"never"`. Pack unused.

Subagents: **no `subagent` in SDK `.d.ts`**. (This process has `PI_SUBAGENT_CHILD=1` from the **pi coding-agent host**, not the pack.)

Skills: CLI `--skill --no-skills`; `loadSkills` / `formatSkillsForPrompt` exported; `Settings.skills?: string[]`. Pack uses `DefaultResourceLoader.reload()` (skills discovery on) then only bash custom tool.

MCP: **no MCP client API** in package `.d.ts` (one comment in `tool-result-images.d.ts`).

Retries: `RetrySettings {enabled, maxRetries, baseDelayMs, provider: {timeoutMs, maxRetries, maxRetryDelayMs}}` (`settings-manager.d.ts:13-23,81`). Pack unused.

Timeouts: `httpIdleTimeoutMs`, `websocketConnectTimeoutMs`, `ProviderRetrySettings.timeoutMs`. Pack: `armSessionAbort(..., opts.wallMs)`.

Usage: `getLastAssistantUsage`, `generateSummaryWithUsage`, `ContextUsage` exported. Pack unused.

`pi --mode json|rpc|text`, `--print`, `--thinking`, `--provider/--model`. Pack thinking via `resolveCliModel({cliThinking})`.

---

## 5. Map: ours → installed → verdict

One row per hand-rolled capability. Cost = what REPLACE would cost, or what we already pay.

| ours | installed command/API + output | verdict | cost |
|---|---|---|---|
| store I/O `scripts/store.ts:95-523` `bd ready/list/batch/update/close/comment/comments/set-state/state/recompute-blocked/dolt push` | those exact `bd` verbs (ran `--help` + throwaway) | **PARTIAL** — wrap, don't replace | losing `--limit 0` / `batch` claim would split transactions |
| frontier policy `pick.ts:38-80` gate label `ready-for-agent`, `NON_WORK_TYPES`, attempted, allow-list | `bd ready` is only `open`+unblocked (`bd ready --help`). `bd query` can filter labels but not "this run's attempted" (file, ADR-0005) | **REFUSE** `bd query` as frontier | second round trip; store cannot hold attempted/allow-list |
| domain cross-edge refuse `domains.ts` | no `bd` verb. `bd dep add` accepts any type | **REFUSE** | would buy nothing; store will take a crossing `blocks` |
| pid Main lock `lock.ts:37-105,102-105` pid first line, steal if dead | `bd merge-slot`: holder is **name** (`metadata.holder=crash-name`, ran). No pid | **REFUSE** | crashed holder wedges; ADR-0009. Buys named queue/waiters |
| run lock `run-lock.ts` `beads-dag-run.lock` ppid + run-id | same merge-slot / any store field | **REFUSE** | store-backed mutex has no pid (run-lock.ts:29-33) |
| names from handle `naming.ts:77-86` `worktrees/<feature>-<NN>-<slug>` `beads/<feature>/<NN>-<slug>` | `bd worktree create` → `./<name>` (ran `./feature-auth`). Archon `--branch test/one` → `~/.archon/workspaces/_local/<repo>/worktrees/test/one` keyed by **branch string** | **REFUSE** both | loses handle/slug contract tests assert |
| worktree lifecycle `worktree.ts:42-59` `git worktree add -b` / resume + prune ; `main-writes.ts:211-223` prune + `remove --force` only after merge-on-Main | `bd worktree create/remove`; `archon --branch` + `complete` | **REFUSE** | bd path is `./name`; archon path is Archon workspace + **requires git remote** (ran). merge-before-stamp (`main-writes.ts:211-218`) not in either |
| bring Main in / standing merge / checkpoint `worktree.ts:72-75,104,122-131` | no bd/archon verb. Archon `archon-resolve-conflicts` is a **model** workflow | **REFUSE** | conflict turn is same execution (ADR-0003/0009) |
| merge `--no-ff` then stamp `settle.ts` + `main-writes.ts:178-201` | `bd close` closes without git. `archon complete` deletes worktree, does not merge to Main | **REFUSE** | adopting close-without-merge releases dependents (ADR-0004) |
| overlay `tools/operator-ui/overlay.ts:184-210` `archon workflow status --json` + pack files | ran status → `{"runs":[]}`. `workflow get` has no attempted/run-lock | **PARTIAL** status already used; **REFUSE** get as overlay | get would buy outcome/leave_behind still missing pack facts |
| operator graph `graph-view.ts:9,110` d3-dag coords + React Flow `ui/Graph.tsx` | `bd graph --all` layers (ran) but JSON has no x,y. `bd graph --html` is D3 page, not our view | **REFUSE** | would buy a second graph (ADR-0007) |
| operator reads `tools/operator-ui/store.ts:4-6` `bd list --all --json --limit 0` + `bd show --include-comments` | those commands | **PARTIAL** wrap | `bd query` extra QL; still a second trip vs in-memory snapshot |
| operator writes `actions.ts:7-13,32` comment/create/dep/triage | `bd comment`, `bd create`, `bd dep add/relate/unrelate/remove`, `bd label` | **PARTIAL** | `bd set-state` for triage would **rename** labels to `dimension:value` (ADR-0009). `bd human respond` unused on purpose |
| operator start `start.ts:24-27` `archon workflow run beads-dag-{drain,inquiry,experiment}` | `archon workflow run` | **PARTIAL** — already the launcher | `--branch` would isolate the **drain itself** (pack sets enabled:false so drain stays on Target) |
| config YAML `config.ts:242` | `Bun.YAML.parse` | **REPLACE already done** | keep shape refusals |
| client bundle `ui/build.ts:25` | `Bun.build` | **REPLACE already done** | |
| HTTP server `serve.ts:236` `node:http` | `Bun.serve` (installed) | **PARTIAL** | bun-native routes/static; not required. `archon serve` (port 3090, downloads web UI) is **Archon's** UI — **REFUSE** (wrong surface; service) |
| worker readonly `worker-env.ts:17,25` `BD_READONLY=1` | `bd --readonly` same switch (ran) | nothing to adopt | `--sandbox` does not readonly (ran create ok) |
| backup `backup.ts` → `bd dolt push` | `bd backup sync` is a **different** Dolt backup dest | **PARTIAL** | backup subcommand would buy off-machine dest; pack uses configured dolt remote |
| pi runner `pi-session.ts` | SDK 0.85.1 `createAgentSession` etc. | **PARTIAL** — already driving it | unused: tools allow/deny, retry settings, thinkingBudgets, --continue flag, MCP (absent), subagents (absent) |
| dsh runner `dsh-agent.ts` 187 / `dsh-runtime.ts` 222 | not this axis | — | |
| inquiry tools `tools/inquiry/*` | no installed corpus CLI | **REFUSE** inventing one | |
| experiments `tools/experiments/*` | DVC is Target-optional, not installed-surface | other axis | |
| Archon fan_out/include `beads-dag-drain.yaml:36-52` | installed Archon feature, **used** | **ADOPTED** | |
| Archon `workflow:` children / `isolation: worktree` | available (`node-reference.md:232-241`) | **REFUSE** for per-issue | would nest Archon worktrees per issue; pack already fans `include: beads-dag-execute` |
| Archon `workflow resume` | ran: cannot resume `completed`. ADR-0009 choice: drain re-runnable | **REFUSE** | would buy skip-completed-nodes on **failed/paused** only; unit is small, Main is truth |
| Archon `workflow wait` | ran: returns terminal JSON | unused (drain is the process) | would buy parent-agent parking |
| Archon `--adopt/--from/--no-worktree` | flags exist; `--branch` needs remote (ran) | **REFUSE** for issue worktrees | `--from` buys cut-from-base for **Archon** branch, not `beads/…` |
| `bd gate` | ran: parks issue until human/timer/gh/bead | **REFUSE** | same word as triage gate, different concept (ADR-0009) |
| `bd kv` / `bd sql` | installed | **REFUSE** as graph | second store (ADR-0001) |
| `bd federation` | installed | **REFUSE** | extra Dolt topology; we have one Target store |
| `bun test` / `Bun.spawn` / `Glob` / `Bun.$` / `Bun.SQL` | installed, unused | spawn/Glob/Shell **PARTIAL** (mechanical); SQL **REFUSE** (DB) | |

---

## 6. ADR-0009 re-verify (ran the thing)

| row | executed? | result vs ADR |
|---|---|---|
| `bd merge-slot` holder is name, no pid | **yes** acquire `--holder crash-name`; metadata.holder only | **holds** |
| `bd gate` parks until world catches up | **yes** human gate → `bd ready` `[]` | **holds**. Types human/timer/gh:run/gh:pr/bead |
| `bd worktree` creates at `./<name>` | **yes** `./feature-auth` | **holds**. Cannot derive handle/slug path |
| `bd query` second round trip | **yes** query works; returns issue list not shared snapshot | **holds** as policy (not a failed command) |
| `bd graph` layering without React Flow coords | **yes** ASCII layers; `--json` Root/Issues, no x,y | **holds** |
| `bd set-state` for five triage labels | **yes** `reading=none` → label `reading:none` | **holds**: dimensionising **renames**. Adopted for `reading:` only (store.ts:359) |
| `bd --readonly` / `--sandbox` | **yes** readonly blocks create; sandbox allows create; dolt.auto-push unset | **holds** |
| `archon isolation cleanup` / `complete` unavailable to pack worktrees | **yes** complete pack worktree → `no active isolation environment`. Isolation table 0 active. `worktree.enabled: false` on three executors | **holds**. Extra: list's "No codebases registered" is **wrong** when codebase exists (beads-matt-dag row present) |
| `archon workflow get` for overlay | **yes** get lacks attempted/run-lock; status `{"runs":[]}` | **holds** |
| `archon workflow resume` choice | **yes** completed → cannot resume | **holds** as recorded choice |
| tldraw licence | **not executed** (`which tldraw` empty). Licence text not re-read | **assertion this axis** |
| worktrunk required binary | **not executed** (`which worktrunk`; `command -v wt` empty). `worktree.ts` is 131 lines (`wc -l`) matching "131-line module" | binary-install screen still refuses; **worktrunk behavior unrun** |
| Liveblocks / Yjs | **not executed** (other axis) | **assertion this axis** |

The three rows that were **belief until run** in the ADR prose are the ones that *look* like drop-in wheels: **merge-slot, worktree, isolation complete**. All three **fail when executed**, as the ADR says. The three that remain **assertion** (never a command this axis): **tldraw, worktrunk, Liveblocks/Yjs**.

---

## 7. Screens vs tempting installs

- **Archon isolation registry / complete / serve / archon.db**: database+service. Buy Archon lifecycle. Fail no-db and handle-naming.
- **`bd merge-slot` as Main lock**: no pid. Fail crash-recovery the pack already exercised (`lock.ts` header).
- **`bd worktree` / worktrunk**: worktrunk = Target binary (screen). bd worktree = `./<name>`.
- **`Bun.SQL` / `bd sql` / `bd kv` as canvas store**: second graph (ADR-0001).
- **`archon serve`**: not our view; downloads web UI.
- **`Bun.serve` / `Bun.build` / `Bun.YAML`**: bun runtime, no extra binary. YAML+build already adopted; serve is the one mechanical leftover.

---

## 8. Open risks

- Isolation experiment **wrote** `~/.archon/archon.db` (codebase `archon-iso-exp-3176973` + destroyed env). Throwaway git dirs remain under `/tmp`.
- `archon isolation list --json` is not JSON — overlay must not parse it.
- `--branch` requires a git remote even for a local bash workflow.
- Isolation key is the **branch name** (`workflow_id=test/one`), not run id.
- Pack `experiment` type is not in `bd types` core list; still `types.custom`.
- Operator delete (ADR-0008) is not in `actions.ts` intents; `bd delete` exists with `--cascade/--force` which ADR refuses.
