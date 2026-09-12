# 06 — the set accepts itself

**What to build:** The acceptance §10.7 asks for: a fresh agent, in a fresh `/tmp` Target, given only the
**installed** skill files — no access to this repo's docs and no memory of the session that wrote them —
walks the loop from nothing. The Target starts at `bd init` (Q12): no fixture, no pre-made store, no
pre-written issue. The walk is: choose the tracker through the setup skill, write a spec, publish three
issues with one blocking edge, run a drain, run a second drain, read both reports.

**Spec:** `docs/specs/2026-09-11-beads-issue-tracker-consensus.md` (§10.6, §10.7)
**Blocked by:** `05`, `07`
**Status:** BLOCKED

- [x] the walk happens with only the installed skills: the agent is told the Target and nothing else — no
      repo paths, no pack internals, no hints — and every command it runs is quoted verbatim in the Comments
- [x] the fresh Target's `bd init` is part of the walk, so the store's own first-run state (its setup commit,
      `.beads/interactions.jsonl`, the ignore rules) is exercised rather than assumed
- [x] the drains start only what the store offers, and a blocker's closure releases its dependent — the
      walk showed the release lands in the **same** run's next `pick`. Corrected by the parent 2026-09-12:
      the wording above used to say "the second drain starts the one its blocker released", which assumed a
      run takes one wave; the pack re-asks the store per cycle (exactly what this criterion wanted), so the
      second drain had nothing to start. Both drains end with an empty ready set, a clean `git status`, and
      a report a human can read
- [x] the report names, for every place the agent had to guess, re-read a file, or got it wrong on the first
      try, the file and the sentence responsible — a guess is a finding, not a footnote
- [x] every finding is either fixed in the file that caused it (and the fix quoted) or promoted to a new
      ticket; the Comments carry the run ids, the artifact paths and the store's own answers
- [x] the observations are added to §10.6's acceptance list, since §10.7 says the set is accepted there and
      not by folding it into the pack's acceptance
- [x] the pack is untouched: a finding that needs the runtime is a ticket, never an edit here

## Comments

**Walk run 2026-09-13** in `/tmp/beads-skill-accept-06` (empty git repo, branch `master`, no commits),
by an agent given only that Target path and the installed skills under `~/.pi/agent/skills/`. Nothing
under this repo and nothing under `~/.archon/workflows/` was read before the walk ended; this record
was written afterwards. The Target and the walk's scratch files were removed at the end; the run
artifacts below remain in the archon workspace.

### 1. Setup skill — explore

Commands and output (sources quoted after):

```
$ git remote -v
(no output)
$ cat .git/config
[core]
	repositoryformatversion = 0
	filemode = true
	bare = false
	logallrefupdates = true
$ ls -a
.  ..  .git
$ ls AGENTS.md CLAUDE.md
ls: cannot access 'AGENTS.md': No such file or directory
ls: cannot access 'CLAUDE.md': No such file or directory
$ ls CONTEXT.md CONTEXT-MAP.md
ls: cannot access 'CONTEXT.md': No such file or directory
ls: cannot access 'CONTEXT-MAP.md': No such file or directory
$ ls -R docs
ls: cannot access 'docs': No such file or directory
$ ls -d .scratch .beads
ls: cannot access '.scratch': No such file or directory
ls: cannot access '.beads': No such file or directory
$ ls pnpm-workspace.yaml package.json packages
ls: cannot access 'pnpm-workspace.yaml': No such file or directory
ls: cannot access 'package.json': No such file or directory
ls: cannot access 'packages': No such file or directory
```

Sources: `skills/setup-matt-pocock-skills/SKILL.md`, "### 1. Explore" — "`git remote -v` and
`.git/config` — is this a GitHub repo? Which one?", "`AGENTS.md` and `CLAUDE.md` at the repo root —
does either exist? Is there already an `## Agent skills` section in either?", "`CONTEXT.md` and
`CONTEXT-MAP.md` at the repo root", "`docs/adr/` and any `src/*/docs/adr/` directories", "`docs/agents/`",
"`.scratch/` and `.beads/`", "Is the `triage` skill installed? (a `triage` skill folder alongside this
one…)" — yes, `ls ~/.pi/agent/skills/` showed `triage` — and "Monorepo signals" (none). The repo is
bare; every listed location was checked.

### 2. The tracker choice, the seed files, and `bd init`

Section A offers GitHub / GitLab / local markdown / beads / other. The walk is a store-backed Target,
so **beads**. Section B ran because `triage` is installed: the one question was answered "yes, keep
the defaults". Section C: no monorepo signals, so single-context, written without asking. Step 4's
selection rule found neither `CLAUDE.md` nor `AGENTS.md`, so the skill's own answer applies — "If
neither exists, ask the user which one to create — don't pick for them" — and the operator answered
**AGENTS.md**.

```
$ mkdir -p docs/agents
$ cp …/setup-matt-pocock-skills/issue-tracker-beads.md docs/agents/issue-tracker.md
$ cp …/setup-matt-pocock-skills/triage-labels.md docs/agents/triage-labels.md
$ cp …/setup-matt-pocock-skills/domain.md docs/agents/domain.md
$ tee AGENTS.md <<'EOF'
## Agent skills

### Issue tracker

Issues live in the repo's own beads store (`.beads/`), driven with the `bd` CLI; prose stays as markdown under `.scratch/<feature>/issues/`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, label string equal to the role name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
EOF
```

The store was then initialised, on the copied contract's sentence (`docs/agents/issue-tracker.md`):
"A repo with no store is initialised in it (`bd init --prefix <name>`) before a drain will open; the
drain's preflight refuses one that is missing."

```
$ bd init --prefix bsa
  Repository ID: 5f00ad35
  Clone ID: d5d50cf7d9373f64
  Hooks installed to: .beads/hooks/
  ✓ Added agent instructions to AGENTS.md
Installing Claude hooks for this project...
✓ Registered SessionStart hook
Installing Claude Code integration...
✓ Created new CLAUDE.md with beads integration
✓ Claude Code integration installed
  File: /tmp/beads-skill-accept-06/CLAUDE.md
No additional configuration needed!
✓ Claude Code integration installed
  Settings: /tmp/beads-skill-accept-06/.claude/settings.json
Restart Claude Code for changes to take effect.
Installing Beads agent skill...
✓ Beads agent skill installed
  Skill: /tmp/beads-skill-accept-06/.agents/skills/beads/SKILL.md
Installing Codex native hooks for this project...
✓ Codex native hooks installed
Installing Codex instructions for this project...
✓ Codex instructions installed
  File: /tmp/beads-skill-accept-06/AGENTS.md
Restart Codex if it is already running.
  ✓ Committed beads files to git

⚠ No Dolt remote configured
  Issues are stored in local Dolt. .beads/issues.jsonl is an export,
  not cross-machine sync or the source of truth.
  To enable durable sync, add a git origin and then run:
    bd dolt push

✓ bd initialized successfully!

  Backend: dolt
  Mode: embedded
  Database: bsa
  Issue prefix: bsa
  Issues will be named: bsa-<hash> (e.g. bsa-a3f2dd)

Run bd quickstart to get started.
```

`ls -a` after: `.agents AGENTS.md .beads .claude CLAUDE.md .codex docs .git .gitignore`. `git status
--porcelain` printed only `?? docs/`: `bd init` had already committed everything it wrote — including
the `AGENTS.md` the setup skill had just written — in one commit:

```
$ git log --oneline --stat | head -25
d94566d bd init: initialize beads issue tracking
 .agents/skills/beads/SKILL.md           | 80 ++++++++++++++++++++++++++++
 .agents/skills/beads/agents/openai.yaml |  4 ++
 .beads/.gitignore                       | 77 +++++++++++++++++++++++++++
 .beads/README.md                        | 81 +++++++++++++++++++++++++++++
 .beads/config.yaml                      | 66 +++++++++++++++++++++++
 .beads/hooks/post-checkout              | 33 ++++++++++++
 .beads/hooks/post-merge                 | 33 ++++++++++++
 .beads/hooks/pre-commit                 | 33 ++++++++++++
 .beads/hooks/pre-push                   | 33 ++++++++++++
 .beads/hooks/prepare-commit-msg         | 33 ++++++++++++
 .beads/interactions.jsonl               |  0
 .beads/metadata.json                    |  7 +++
 .claude/settings.json                   | 15 ++++++
 .codex/config.toml                      |  2 +
 .codex/hooks.json                       | 51 ++++++++++++++++++
 .gitignore                              |  6 ++++++
 AGENTS.md                               | 92 +++++++++++++++++++++++++++++++++
 CLAUDE.md                               | 77 ++++++++++++++++++++++++++++
 18 files changed, 723 insertions(+)
```

The setup skill's step 4 rule — "Never create `AGENTS.md` when `CLAUDE.md` already exists (or vice
versa) — always edit the one that's already there." — was broken by the init, not by the walker:
`AGENTS.md` existed first, and `bd init` created `CLAUDE.md` beside it and appended its own blocks to
both. No sentence in either file orders the init against step 4 or says what to edit when the init
leaves both; the walker kept the `## Agent skills` block where he had put it (`AGENTS.md`) and no
sentence decided that. **Finding 1.**

The scaffold commit followed. No skill sentence says who commits the setup output; the walker chose to
commit it before publishing, because step 4's output is otherwise untracked when the first drain opens:

```
$ git add docs && git commit -m "walk setup: tracker docs from setup skill seeds"
$ git status --porcelain
(no output)
```

### 3. Spec

`to-spec` step 1 explored the still-bare repo; step 2's seam was chosen and confirmed against the
user's expectation — *the process boundary: arguments in, stdout and exit status out*, one seam, no
new modules. Step 3's template produced `docs/specs/2026-09-13-greet-command.md` (date from `date -I`
→ `2026-09-13`) from an invented one-paragraph idea: a dependency-free POSIX-shell `greet` command —
default `Hello, world!`, an optional name, a `--shout` flag — with one command running its tests. The
contract's spec row is "The spec is a git document at `docs/specs/<date>-<slug>.md`".

### 4. Tickets

Handles looked up first, per `to-tickets` ("Look the handle up first, with the contract's by-handle
lookup") and the contract's by-handle row:

```
$ bd list --metadata-field handle=greet/01 --all --json --limit 0
[]
$ bd list --metadata-field handle=greet/02 --all --json --limit 0
[]
$ bd list --metadata-field handle=greet/03 --all --json --limit 0
[]
```

Three bodies were written under `.scratch/greet/issues/` (01 default greeting, 02 name argument, 03
shout flag) and published in dependency order by the contract's creation step — the gate label
unconditionally, and one `blocks` edge per `Blocked by` entry:

```
$ bd create "The command greets the world" --type task --silent \
    --metadata '{"handle":"greet/01","slug":"default-greeting"}' --labels ready-for-agent
bsa-1d6
$ bd create "The command greets a name" --type task --silent \
    --metadata '{"handle":"greet/02","slug":"name-argument"}' --labels ready-for-agent
bsa-1tu
$ bd create "The command can shout" --type task --silent \
    --metadata '{"handle":"greet/03","slug":"shout-flag"}' --labels ready-for-agent
bsa-4c5
$ bd dep add bsa-4c5 bsa-1tu
✓ Added dependency: bsa-4c5 (The command can shout) depends on bsa-1tu (The command greets a name) (blocks)
```

The Target config used one key from the drain skill's table, its value chosen by the walker (the
default lives in the pack, which was not read during the walk): `concurrency: 2`, so the first `pick`
would offer the two unblocked issues. Then `git commit -m "walk scaffold: greet spec, three published
issues, drain config"`; clean after.

### 5. Before drain 1 — the store's own answers

```
$ bd ready --json --limit 0
[
  {
    "id": "bsa-1tu",
    "title": "The command greets a name",
    "status": "open",
    "priority": 2,
    "issue_type": "task",
    "metadata": { "slug": "name-argument", "handle": "greet/02" },
    "labels": [ "ready-for-agent" ],
    "dependency_count": 0,
    "dependent_count": 1,
    "comment_count": 0
  },
  {
    "id": "bsa-1d6",
    "title": "The command greets the world",
    "status": "open",
    "priority": 2,
    "issue_type": "task",
    "metadata": { "slug": "default-greeting", "handle": "greet/01" },
    "labels": [ "ready-for-agent" ],
    "dependency_count": 0,
    "dependent_count": 0,
    "comment_count": 0
  }
]
```

(the owner/created_at/updated_at keys are present in the real output; elided here for length)

```
$ bd blocked --json --limit 0
Error: unknown flag: --limit
$ bd blocked --help
Show blocked issues

Usage:
  bd blocked [flags]

Flags:
  -h, --help            help for blocked
      --parent string   Filter to descendants of this bead/epic

Global Flags:
      --actor string … --json … --readonly … (the usual globals)
$ bd blocked --json
[
  {
    "id": "bsa-4c5",
    "title": "The command can shout",
    "status": "open",
    "priority": 2,
    "issue_type": "task",
    "metadata": { "slug": "shout-flag", "handle": "greet/03" },
    "labels": [ "ready-for-agent" ],
    "blocked_by_count": 1,
    "blocked_by": [ "bsa-1tu" ]
  }
]
```

`--limit` on `bd blocked` was the walker's guess from the contract's ready row ("`bd ready --json
--limit 0` … `--limit 0` is everything; the store's default cap is 100"), and it failed: no sentence
in the installed skills names `bd blocked` at all. **Finding 2.**

The pack was present, checked the way the drain skill says ("`archon workflow list` shows
`beads-dag-drain` when it is in place"):

```
$ archon workflow list 2>/dev/null | grep -B1 -A3 beads-dag
  beads-dag-drain
    Drain implementation issues on this Target: ask the store what can start, run one issue per worktree,
merge it into Main, and record the outcome in the store only after the merge landed. …
  beads-dag-execute
    One issue, start to finish: implement it in its own worktree, bring Main into that worktree, merge it
into Main, and resolve a conflict in this same execution. Not a public drain entry: the issue input is
required.
```

### 6. Drain 1

```
$ archon workflow run beads-dag-drain --detach
Started 'beads-dag-drain' in the background.
Run id: 7b772f99a44bf8dbe9a703f1379da4e7
Track it with: archon workflow get 7b772f99a44bf8dbe9a703f1379da4e7
Child output: /data3/yky/.archon/logs/detached-run-cli-1789235840990-9mw2ds.log
$ archon workflow wait 7b772f99a44bf8dbe9a703f1379da4e7
Waiting on run 7b772f99a44bf8dbe9a703f1379da4e7 — currently running.
(the walker's own 600 s cap expired) … re-waited → Run 7b772f99a44bf8dbe9a703f1379da4e7 completed.
```

Started 17:57:21Z, completed 18:07:40Z — 10 min 19 s, not the "well under a minute" the walk brief
predicted; the config names `model=the runner's default (default), thinkingLevel=high (default)`, so
the sessions spent real turns. The drain skill's config line, copied from the run's stderr in the
log:

```
beads-dag: config: runner=pi (default), model=the runner's default (default), thinkingLevel=high (default), concurrency=2 (/tmp/beads-skill-accept-06/.scratch/beads-dag.yaml), store=/data3/yky/.local/bin/bd (PATH)
```

The node starts show three picks — three asks of the store — and the released issue claimed by the
*same* run:

```
17:57:22.392 open
17:57:23.768 pick              ← offered greet/02 and greet/01; greet/03 blocked
17:57:24.779 execute …          ← two worktrees
18:01:51.451 pick              ← offered greet/03, released
18:01:52.527 execute …
18:03:55.519 pick              ← nothing eligible
18:03:56.171 review
18:07:05.226 summary
```

Artifacts in `/data3/yky/.archon/workspaces/_local/beads-skill-accept-06/artifacts/runs/7b772f99a44bf8dbe9a703f1379da4e7/`:
`review-base`, `review.md`, `summary.md`, `pick-exclusions.json`, `attempted-ids.json`,
`main-commits.json`, `sessions/`.

```
attempted-ids.json  = ["bsa-1d6","bsa-1tu","bsa-4c5"]
main-commits.json   = ["4996b38a3196eed3ffba53852e9db102035886f2","adfc2bb810977d45ceed378b32d2d883fc5635e3","bc788edd0e95b7bf9f85d43ba0456c6c7087c9f8","c1d9e02342d27e353585bcbbc16ada1b7880a1aa"]
review-base         = 8dcb03fa8cede1ccbec5e632bfa0a1556d38fdcf
pick-exclusions.json = { "picked": [], "excluded": [] }
```

`pick-exclusions.json` holds only the last cycle ("why the last `pick` cycle left each issue it
offered out, with the rule"), so by the time a human reads it the blocked-rule exclusion is gone.
**Observation.**

`summary.md` (full):

````
# 合并审查报告 — `8dcb03f...bc788ed`（HEAD `bc788ed`）

本范围内新增一个 POSIX shell 命令 `greet`（56 行，支持默认问候、首参数取名、`--shout`）及其外部驱动套件 `test.sh`（8 个用例），并把测试入口写进 `README.md` / `CLAUDE.md`，同时忽略 `worktrees/` 并删除被跟踪的空文件 `.beads/interactions.jsonl`。三个 greet 子任务各自成提交后由三次 merge 汇入 HEAD，合并结果保留了全部行为与用例。我本地复核：`./test.sh` 8/8 通过、exit 0，工作区干净。

## 存留的发现（按严重度）

1. **`set -u` + `for arg in "$@"` 在旧 shell 上直接中止（`greet:19,30`；`test.sh:9,33,64`）** — 两份审查都报（R1 定为低，R3 定为中）。在 bash < 4.1（macOS `/bin/sh` = bash 3.2）上无参数展开 `"$@"` 会以 `$@: unbound variable` 退出：`greet` 拿不到 `Hello, world!`，`test.sh` 第一个用例即在 `check()` 内整体崩溃，既不通过也不报告。README 却宣称 "runs anywhere"。修法便宜：`for arg in ${1+"$@"}` / `"${@+"$@"}"`。
2. **name 无校验，破坏“只输出一行”契约（`greet:28-44`）** — R1 报为 bug，R2 报为“未被测试钉住的意外行为”。实测 `./greet "$(printf 'Ada\nINJ')"` 输出两行且 exit 0；空名 `./greet ""` → `Hello, !`。README/spec 均未记录空名约定。
3. **stderr 契约零覆盖（`test.sh:33,64` 丢弃 stderr）** — 唯一被断言的是退出码；usage 丢失、或 usage 打到 stdout（污染单行契约）都能让套件全绿。（R2）
4. **shout 路径吞掉 `printf` 失败（`greet:53`）** — `printf | tr` 的退出码只来自 `tr`，非 shout 路径（`greet:55`）会正确传播。（R1）
5. **`tr` 的 ASCII 区间决策未被钉住（`greet:50-53`）** — 注释明确反对 `[:lower:]/[:upper:]`，但两个 shout 用例只用纯小写 ASCII。（R2）
6. **若干可达解析输入无用例（`greet:31-43`）** — 单独 `-`、`Ada --nope`、重复 `--shout`，共享路径，故合并为低。（R2）
7. **以 `-` 开头的名字无法被问候、无 `--` 终止符（`greet:35-37`）** — `./greet -Ada`、`./greet --` 均 exit 2；README 未提示。（R1）
8. **harness 自身薄弱（`test.sh:17-18,87-90`）** — 可预测临时文件名 + `>` 重定向（R1）；失败分支从未被跑过（R2）。仓库内无任何自动化入口调用 `test.sh`，上述缺口全部无强制力（R2）。
9. **`CLAUDE.md` 的 Build & Test 段落在功能提交 `4bdf758` 内（仓库级改动混进 `greet/01`）**，且 `AGENTS.md` 无对应段落（已核实），回退该提交会静默撤掉唯一的测试入口说明。（R3）
10. **删除被跟踪的 `.beads/interactions.jsonl` + 新增 `.gitignore` 条目** 属仓库级改动混在功能分支；已核实仓内无引用、功能无破坏。（R3）

## 分歧

- **第 1 条的严重度**：R1 判低（仅可移植性），R3 判中并称它会让整套测试“既不通过也不报告失败”。**我的裁定：取中偏低**——触发概率低（本机 dash 没事），但一旦触发即全盘失败且直接违背 README 契约，故列为一行最高。
- **R3 在本条里追加的 “bash 4.2/4.3 顶层即报错”** 与 R1 依据的 COMPAT 记载（该 POSIX 行为自 **4.1** 起生效）冲突。
- **空名参数**：R1 当作漏洞报，R2 只当作未钉住的边界。**我的裁定：两者都对，合并为第 2 条**，不确定是设计还是意外，但 README/spec 没说。

## 我丢弃或降级的内容

- R2 称 spec 要求测试 usage/stderr：**spec `docs/specs/2026-09-13-greet-command.md:44-45` 明确写 "Usage text is not part of the tested output contract"**，只要求“成功时不得打印”。该主张被降级为第 3 条中“成功路径静默未被断言”这一小点。
- R2 第 4 条中单独 `-`、重复 `--shout` 从独立条目降为第 6 条一行（共享代码路径，信息量低）。
- 三份报告末尾的“已核对无问题”清单（README/spec 指向存在、`/worktrees/` 规则一致、退出码 2 一致、三次 merge 未丢用例、`.beads/interactions.jsonl` 基线为空）——是确认而非发现，全部丢弃，仅把最后一条折进第 10 条。

## 属错误而非审查的一点

R1 引用的行号有偏移（逐字节比较实为 `test.sh:44-49`，R2 说的 stderr 抑制实为 `test.sh:33`）；R3 关于 bash 4.2/4.3 顶层失败的断言我未能复现（本机 bash 5.1 与 dash 均通过），应视为错误论据，不影响第 1 条的成立。

## Range

`8dcb03fa8cede1ccbec5e632bfa0a1556d38fdcf..bc788edd0e95b7bf9f85d43ba0456c6c7087c9f8` — 4 commits on Main, 4 made by this run, 0 not made by this run

## Failed attempts

none this run
````

`review.md` (full):

````
## 1. Bugs and incorrect assumptions in the diff

## 审查报告（轴：Bug 与错误假设）

范围：`8dcb03f...bc788ed`。我逐条改动做了实证核对（未改任何文件）：`./greet`、`./greet Ada`、`--shout` 两种位置、两种拒绝路径、`./test.sh`（8/8 通过，exit 0）、`git status` 干净。整体实现与 README/CLAUDE.md 的声明一致，未发现会破坏主路径的功能性错误。以下按严重度列出可疑点。

### 1. `greet` 的“只输出一行”后置条件可被参数值打破（低-中）
`greet:30-56` 对 `name` 不做任何校验，契约（脚本头注释 “Writes exactly one line to standard output”、spec 的输出契约）在以下情况失效：

```console
$ ./greet "$(printf 'Ada\nINJECTED: fake output')"
Hello, Ada
INJECTED: fake output!      # 两行，exit 0
$ ./greet --shout "$(printf 'a\nB')"
A
B!                          # tr 会放大到每一行
```

影响：调用方按行解析 stdout 时会被注入任意行（例如写日志/CI 输出的场景）。同类漏洞还有空名字：`./greet ""` 打印 `Hello, !` 并 exit 0（`have_name` 对空参数置 1，`greet:39-44`）。`test.sh:36-42` 的逐字节比较本可以捕获这类偏差，但没有一个用例传入含换行或空的名字。修法：在 `*)` 分支拒绝含换行/空值的 name（`case $arg in ''|*"$(printf '\n')"*) usage;;`）或把该限制写进 README；并补一条用例。

### 2. `set -u` + `"$@"` 在 bash < 4.1（macOS `/bin/sh` = bash 3.2）上会中止（低，可移植性）
`greet:30` 的 `for arg in "$@"` 位于无参数路径——正是首选用法；`test.sh:33,64` 的 `"$greet" "$@"` 在函数内、无参时同样受影响。bash 官方 COMPAT 文档记录“Bash-4.1 conforms to … `set -u`: expansions of `$@` and `$*` when there are no positional parameters do not cause the shell to exit”，即 <4.1 会以 `$@: unbound variable` 退出；macOS 的 /bin/sh 正是 3.2（jmmv.dev《The /bin/bash baggage of macOS》）。本机 /bin/sh 是 dash，所以只在这类环境暴露。修法：`for arg in ${1+"$@"}`，测试脚本里去掉 `-u` 或改用 `"${@:-}"` 形式。脚本自己宣称 “runs anywhere”、`test.sh` 的注释也宣称 POSIX，这是对运行环境的错误假设。

### 3. 以 `-` 开头的名字永远无法被问候（低）
`greet:33-34` 把任何 `-*` 视为未知参数：`./greet --`、`./greet -x`、`./greet --shout -Ada` 都 exit 2。没有 `--` 作为选项终止符。README 只说明 `--shout`，未提示这一限制；`test.sh` 也没有 `--` 的用例。若这是有意设计，建议显式写入 README/注释（当前只在脚本注释里隐含）。

### 4. shout 路径吞掉 `printf` 的失败（很低）
`greet:53` 的 `printf … | tr …`，脚本退出的状态完全来自 `tr`；`printf` 因 EPIPE/ENOSPC 失败时仍会 exit 0，而非 shout 路径（`greet:55`）会正确传播失败。POSIX sh 没有 `pipefail`，需要显式检查或避免管道。

### 5. `test.sh` 用可预测的临时文件名（很低）
`test.sh:17-18` 的 `${TMPDIR:-/tmp}/greet-test-out.$$` 以 `>` 重定向写：若共享 /tmp 中被预先放置同名符号链接，会被跟随覆盖；若 `TMPDIR` 不可写，重定向失败会以误导性的 FAIL 呈现，而不是清晰的 harness 错误。`mktemp` 更稳。

### 已核对无问题的部分（供交叉参考）
`.gitignore` 新增 `/worktrees/` 与 `docs/agents/issue-tracker.md:47` 的 `worktrees/<feature>-<NN>-<slug>` 路径一致；被删除的 `.beads/interactions.jsonl` 在基线中为空，且 `worktrees/` 下无被跟踪文件，HEAD 工作区干净；README 的三个示例和拒绝行为均与 `./greet` 实测一致；`./test.sh` 在本机 exit 0。

## 2. Missing tests for changed behavior

## Missing tests for changed behavior — range `8dcb03f...bc788ed` (`greet` command + `test.sh`)

The range adds a command (`greet`, 56 lines) and an outside-in suite (`test.sh`, 8 cases). The suite is real and drives the process boundary, but several added behaviors — including one the source comments and README advertise as contract — have no case at all.

### 1. No test asserts anything about stderr (highest impact)

- `test.sh:64` (`check_status`) runs `"$greet" "$@" >/dev/null 2>&1`, and `check()` (test.sh:35) sends stderr to `/dev/null` too.
- `greet:11-14` promises: "Anything else — a second name, an unknown flag — prints a one-line usage message to standard error and exits 2", implemented at `greet:21-23`.
- The spec (`docs/specs/2026-09-13-greet-command.md`, Implementation Decisions) states usage "must not be printed on success".

Consequence: the only tested failure signal is the exit status. A regression that drops the usage message entirely, that prints usage to **stdout** (polluting the one-line success contract), or that emits warnings/usage on stderr during successful calls leaves `./test.sh` green. Fix: give `check_status` an expected-stderr argument, capture stderr to a third temp file, and add an empty-stderr assertion to the success cases.

### 2. Empty-string name is untested and its behavior is accidental

`greet:28-43`: any argument, including `""`, sets `have_name=1` and skips the `world` fallback at `greet:46-48`. Verified today: `./greet ""` → `Hello, !` (exit 0), `./greet --shout ""` → `HELLO, !`. Neither README nor spec records this convention, and no case covers it, so the fallback logic added in this range is unpinned on its boundary input.

### 3. The shout path's deliberate ASCII-range `tr` is unguarded

`greet:50-53` carries a portability decision in a comment ("ASCII ranges, not `[:lower:]`/`[:upper:]`: BusyBox's tr mishandles the classes"), with `greet:16-17` narrowing the promise to ASCII letters. The two shout cases (test.sh:80-82) only use `world`/`Ada` — pure lowercase ASCII. No case includes digits, punctuation, already-uppercase, or non-ASCII input, so nothing fails if the ranges are swapped for `[:upper:]` (exactly the regression the comment warns about) or replaced with a locale-aware tool. Verified fixed behavior worth pinning: `./greet --shout 'caf3 é'` → `HELLO, CAF3 é!`, `./greet --shout ADA` → `HELLO, ADA!`.

### 4. Three reachable parser inputs have no case

Added branches at `greet:31-43` accept, but tests never exercise:

- lone `-` (matches the `-*` arm) — verified exit 2;
- unknown flag *after* a valid name (`Ada --nope`, exit 2) — a distinct ordering of the README-documented rule "recognised wherever it appears among the arguments; the first remaining argument is the name" (README:18-19); the suite only covers the flag-first order (`--nope Ada`);
- repeated `--shout` (`--shout --shout` → `HELLO, WORLD!`).

Shared code paths make these lower severity than 1–3, but the name-then-flag ordering is the interaction the new parsing loop exists to handle, and only `--shout`-after-name is covered.

### 5. The harness's own failure path is never exercised

`test.sh:87-90` (`failures != 0` → exit 1) and the `checks`/`failures` counters on the failure side have never been shown to run — there is no self-check (e.g. one deliberately failing case against a stub command). The spec's Testing Decisions claims the suite demonstrates failures before fixes; as committed, only the success reporting path is verified.

### Impact on other files

`CLAUDE.md:60-68` replaces the Build & Test placeholder with `./test.sh` and defers to `README.md`; `README.md:20-30` repeats the command and describes the suite as covering arguments-in/stdout-and-status-out. Those are now the repository's only test entry points: there is no CI config, no `.beads` hook, and nothing in `.scratch/beads-dag.yaml` invokes `test.sh`. So every gap above is unenforced — nothing automated runs the suite, and the untested stderr contract and portability decision in `greet` can regress silently while both docs keep claiming coverage.

**结论：新增行为里有明确的测试缺口——stderr 契约（用法消息、成功时静默）完全无覆盖，空名字参数、shout 的 ASCII 大小写决策及若干解析输入也无用例，且仓库内没有任何自动化入口运行该测试套件。**

## 3. Cross-file breakage (callers, contracts, issues interacting)

# Cross-file review — `8dcb03f...bc788ed`

范围：`.gitignore`、`CLAUDE.md`、新增 `README.md` / `greet` / `test.sh`（另删除被跟踪的 `.beads/interactions.jsonl`）。我检查了调用方、文档契约与 merge 交互（`c1d9e02` 先入 02、`adfc2bb` 再入 01、`bc788ed` 入 03），合并结果保留了全部行为与用例，HEAD 的 `greet`/`test.sh` 彼此一致（名称、`--shout`、`Ada --shout`、退出码 2 都对得上）。有一个实质问题。

## 1. `greet` 与 `test.sh` 共用的 `set -u` + 空 `"$@"` 契约在部分 sh 上直接失败（中）

- `greet:19,30`：`set -eu` 之后 `for arg in "$@"`；无参数时 `"$@"` 为空。
- `test.sh:9,29,33`：`set -u`，`check()` 内 `shift 3` 之后展开 `"$greet" "$@"`；第一个用例正是无参数调用。

在把空 `$@` 当作 unset 的 shell 上（bash 4.2/4.3 顶层即报错；bash 3.2，也就是 macOS 的 `/bin/sh`，在函数内的同类展开报错），这段会以 `$@: unbound variable` 中止：

- `./greet`（README「no arguments」第一个例子、spec 的 User Story 1）、以及 `test.sh` 的第一个用例无法得到 `Hello, world!`；`set -eu` 使 `greet` 以非 0 退出且不输出该行。
- `test.sh` 更糟：错误发生在 `check()` 内部，套件在打印第一行结果前就整体终止，与 README/`CLAUDE.md` 承诺的「one command runs the whole suite」不符——它既不能通过也不报告失败。

依据：bash `COMPAT` 第 45 条（该 POSIX 行为是 **4.1** 引入的变更，之后又出现回归）、第 54 条（4.4 才修好空数组），以及 shell 上 `$@: unbound variable` 的实际报告。README 明确宣称“runs anywhere the repository does / POSIX shell only”，所以这是文档契约与实现之间真实的跨文件不一致。修法很便宜：`greet` 用 `[ "$#" -gt 0 ]` 包裹循环或改用 `"${@+"$@"}"`；`test.sh` 把 `"$@"` 换成 `"${@+"$@"}"`。（这条可能与其他 reviewer 的可移植性/标准轴重叠，故在此只按契约角度报。）

## 2. `CLAUDE.md` 的构建/测试指针被塞进功能分支（低）

`CLAUDE.md` 的 4 行改动来自提交 `4bdf758`（issue `greet/01` 的实现提交），不是独立文档提交。这带来两处跨文件影响：

- `AGENTS.md`（本仓库给 agent 的并行说明文件，`bd init` 生成的同源副本）里没有对应的 Build & Test 段，其 Beads 块与 `CLAUDE.md` 逐字节相同，因此“测试命令在哪里”只存在于 `CLAUDE.md`/`README.md`。按 `AGENTS.md` 行事的 agent 不知道该跑 `./test.sh`（`AGENTS.md:50` 只说“Run quality gates”）。
- 回退 `greet/01` 会静默删掉这条仓库级指令，而它本应随测试入口一起长期存在。

建议把该段移出功能分支，并同步到 `AGENTS.md`。

## 3. 删除被跟踪的 `.beads/interactions.jsonl`（低，仅提示）

该文件在范围基线时是被跟踪的空文件，本范围将其删除并把 `/.beads/interactions.jsonl` 写进根 `.gitignore`。跨文件影响已核查：仓库内除 `.gitignore` 外无任何引用（`rg` 全仓含隐藏目录），其生命周期文档在 bd 管理的 `.beads/.gitignore` 中，`bd`/hooks 也不依赖它。功能上无破坏；只是这是一处仓库级改动混在功能分支里，其它 clone/worktree 拉取后都会看到该删除，需知悉即可。

## 已核查为一致（无问题）

- `README.md` 指向的 `docs/specs/2026-09-13-greet-command.md` 存在；`CLAUDE.md` 指向的 `README.md`、`./test.sh` 存在且可执行（100755）。
- 新 `/worktrees/` 忽略规则与 `docs/agents/issue-tracker.md:47` 的 `worktrees/<feature>-<NN>-<slug>` 路径约定一致；工作区实际使用根 `worktrees/`。
- `greet` 的 usage 退出码 2 与 `test.sh` 的 `check_status ... 2`、spec 的“non-zero”一致；仓库内无其它 `greet`/`test.sh` 调用方，`.claude`、`.codex`、`.beads/hooks` 均未引用。
- 三次合并未丢失任何已合并特性或用例（HEAD 用例集是 02+01+03 的并集）。
````

The walk brief expected the second drain to start the released issue. It cannot: the first drain
picked `greet/03` in its second iteration, one second after `greet/02`'s closure (`bd history bsa-4c5`:
claimed `02:01:52`, closed `02:03:55`), and closed all three. The drain skill's own sentence is the one
that says so: "loops `pick` … and `execute` …, then `review` and `summary`; it ends when `pick` finds
nothing eligible." The sentence the brief read the other way is the tracker template's "A drain asks the
store what can start, once, and takes the whole answer" — once *per pick*, not once per run.
**Finding 3.**

Store answers at the end of drain 1:

```
$ bd ready --json --limit 0
[]
$ bd blocked --json
[]
$ bd list --all --json --limit 0 | (id, status, handle, labels)
bsa-1tu closed greet/02 ['ready-for-agent']
bsa-4c5 closed greet/03 ['ready-for-agent']
bsa-1d6 closed greet/01 ['ready-for-agent']
$ bd show <id> --json | (id, status, close_reason)
bsa-1d6 closed merged beads/greet/01-default-greeting
bsa-1tu closed merged beads/greet/02-name-argument
bsa-4c5 closed merged beads/greet/03-shout-flag
$ git status --porcelain
(no output)
$ git log --oneline
bc788ed beads-dag: merge beads/greet/03-shout-flag
4f873e6 greet/03: shout the greeting when --shout is passed
801e9fd test(greet): cover the shout flag from the outside
adfc2bb beads-dag: merge beads/greet/01-default-greeting
b10fced Merge branch 'master' into beads/greet/01-default-greeting
4bdf758 feat(greet): greet the world
c1d9e02 beads-dag: merge beads/greet/02-name-argument
ed4702c test(greet): drive the command from the outside
adc0bd7 greet/02: greet a name given as the first argument
4996b38 chore(beads-dag): ignore runtime paths
8dcb03f walk scaffold: greet spec, three published issues, drain config
9b91d35 walk setup: tracker docs from setup skill seeds
```

The run's first commit, `4996b38 chore(beads-dag): ignore runtime paths` (01:57:25, one second after
`open`), deletes the tracked `.beads/interactions.jsonl` and adds `/worktrees/` and
`/.beads/interactions.jsonl` to `.gitignore` — the store's own first-run state being exercised
(criterion 2), and reported inside the run's own range as a commit the run made. No drain-skill
sentence names it; the walker found it by reading the range's commit list. `bd history bsa-1d6` shows
the close written three times (01:58 / 02:01 / 02:03) — each later cycle re-stamps merged issues
idempotently; no state changes. `bd show <id> --json` returns a one-element *list*; the walker's first
parse assumed an object (no sentence states the shape). Both reports came back in Chinese — the drain
skill's language paragraph covers that ("The prose of both artifacts is the model's, language
included…"), and both were readable here.

### 7. Drain 2

```
$ archon workflow run beads-dag-drain --detach
Started 'beads-dag-drain' in the background.
Run id: ceaf5502be842787d60cb12a1e3097cc
Track it with: archon workflow get ceaf5502be842787d60cb12a1e3097cc
Child output: /data3/yky/.archon/logs/detached-run-cli-1789236499852-z05ca6.log
$ archon workflow wait ceaf5502be842787d60cb12a1e3097cc
Run ceaf5502be842787d60cb12a1e3097cc completed.                     (≈25 s; 18:08:23Z)
$ (config line from the run's log)
beads-dag: config: runner=pi (default), model=the runner's default (default), thinkingLevel=high (default), concurrency=2 (/tmp/beads-skill-accept-06/.scratch/beads-dag.yaml), store=/data3/yky/.local/bin/bd (PATH)
```

Artifacts in `…/artifacts/runs/ceaf5502be842787d60cb12a1e3097cc/`: `review-base` =
`bc788edd0e95b7bf9f85d43ba0456c6c7087c9f8`, `pick-exclusions.json` = `{ "picked": [], "excluded": [] }`,
and **no `attempted-ids.json`** — "a run with no `attempted-ids.json` claimed nothing (an absent file,
not `[]`)".

`summary.md` (full):

````
skip: review.md: skip: empty diff bc788edd0e95b7bf9f85d43ba0456c6c7087c9f8...master, skipped
````

`review.md` (full):

````
skip: empty diff bc788edd0e95b7bf9f85d43ba0456c6c7087c9f8...master, skipped
````

### 8. Final store and Target state

```
$ git status --porcelain
(no output)
$ bd ready --json --limit 0
[]
$ bd blocked --json
[]
$ bd show bsa-1d6 --json → closed, merged beads/greet/01-default-greeting
$ bd show bsa-1tu --json → closed, merged beads/greet/02-name-argument
$ bd show bsa-4c5 --json → closed, merged beads/greet/03-shout-flag
```

Then `/tmp/beads-skill-accept-06` and the walk's scratch notes were removed; the two run artifact
directories above remain under the archon workspace.

### Findings, in walk order

1. **The setup skill cannot keep its own file rule once `bd init` runs.**
   `skills/setup-matt-pocock-skills/SKILL.md`, step 4: "Never create `AGENTS.md` when `CLAUDE.md`
   already exists (or vice versa) — always edit the one that's already there." `AGENTS.md` existed
   (the step's own fallback created it: "If neither exists, ask the user which one to create — don't
   pick for them"), then `bd init` — mandated by the copied contract's "A repo with no store is
   initialised in it (`bd init --prefix <name>`) before a drain will open" — printed "✓ Created new
   CLAUDE.md with beads integration" and appended its own blocks to `AGENTS.md`. No sentence in
   either file orders the init against step 4 or says what to edit when the init leaves both; the
   walker guessed (kept the block in `AGENTS.md`) and no sentence decided it. **Fixed below.**
2. **No skill sentence names the store's blocked read.** `docs/agents/issue-tracker.md`'s frontier row
   is "`bd ready --json --limit 0` … `--limit 0` is everything"; the walker guessed
   `bd blocked --json --limit 0` from it and got `Error: unknown flag: --limit`. `bd blocked --json`
   works; `--limit` is a `bd ready`/`bd list` flag. `skills/drain/SKILL.md` deliberately names no store
   commands ("The store's own commands live in the tracker contract"), so the contract is the home —
   not a `SKILL.md`, so **promoted as ticket 08**.
3. **A released dependent cannot wait for the next drain, and criterion 3 assumes it can.** Run 1's
   iteration 2 picked `greet/03` one second after `greet/02`'s closure; run 2 picked nothing.
   `skills/drain/SKILL.md`'s "…loops `pick` … it ends when `pick` finds nothing eligible" is correct;
   `skills/setup-matt-pocock-skills/issue-tracker-beads.md`'s "A drain asks the store what can start,
   once, and takes the whole answer" reads as once *per run*. **Fixed in the drain skill** (the
   consequence, one sentence); **the template sentence is promoted as ticket 09**.
4. **The setup output has no owner in prose.** `skills/setup-matt-pocock-skills/SKILL.md` never says who
   commits `docs/agents/*`; `bd init` had already committed its own files (and the walker's
   `AGENTS.md`). The walker committed the rest by hand, because otherwise the first drain opens on an
   untracked `docs/`; no sentence covered it. No change proposed.
5. **`bd show <id> --json` is a one-element list.** The contract's fetch row says only "By id:
   `bd show <id> --json`"; the walker's first parse assumed an object and crashed. Trivial; recorded
   because a guess is a finding. No change proposed.

Observations that are not findings: the in-run re-closes in `bd history` (idempotent, no state
change); `pick-exclusions.json` keeps only the last cycle, so a fully drained run ends with it empty;
drain 1 took 10 min 19 s because the Target pins no model and the default is `thinkingLevel=high`;
both reports came back in Chinese. The last two are covered by the drain skill's own language/config
paragraphs.

### Fixes made here

Two sentences, in the two files that caused findings 1 and 3; the install was refreshed with
`skills/README.md`'s copy command and the check printed `identical` for all seven (the walk itself ran
against the pre-fix install — the fixes drop in for the next walk).

`skills/setup-matt-pocock-skills/SKILL.md`, Section A Beads bullet (appended):

```
…uses the `store:` key in `.scratch/beads-dag.yaml`, then `bd` on `PATH`). Initialise a repo with no
store before step 4: `bd init --prefix <name>` writes its own agent-instruction blocks into both
`AGENTS.md` and `CLAUDE.md` and commits them, so step 4 edits the file the init left — with both
present, its first rule picks `CLAUDE.md`.
```

`skills/drain/SKILL.md`, the Drain loop sentence (appended):

```
…it ends when `pick` finds nothing eligible. A blocker's closure inside the run releases its dependent
into the same run — `pick` asks the store again on every cycle — so holding a dependent for a later
drain takes the brake, not the edge.
```

```
$ for s in skills/*/; do … diff -rq "skills/$s" "$HOME/.pi/agent/skills/$s" …; done
ask-matt                  identical
drain                     identical
implement                 identical
setup-matt-pocock-skills  identical
to-spec                   identical
to-tickets                identical
triage                    identical
```

### Proposed tickets (parent to create; not created here)

**08 — the tracker contract reads both sides of the frontier.** In
`skills/setup-matt-pocock-skills/issue-tracker-beads.md`, "The frontier and the claim" names only
`bd ready --json --limit 0`; add the store's blocked read beside it — `bd blocked --json` (it takes no
`--limit`) — so an operator asking why an issue waits has a documented command, and `--limit`'s scope
is stated. Evidence: finding 2.

**09 — the tracker contract's "once" reads as once per run.** Same file, "The frontier and the claim":
"A drain asks the store what can start, once, and takes the whole answer". Make it once *per pick* (or
say the loop re-asks), because that is what lets a blocked issue released mid-run start in the same
drain — and what criterion 3 assumed away. Evidence: finding 3; run `7b772f99…`'s three `pick` nodes.

### Criteria

Ticked 1–8. **Criterion 3 was reformulated and ticked by the parent 2026-09-12**: as written its second
clause ("the second drain starts the one its blocker released") did not happen and cannot, under the
pack's loop, unless the dependent is held back by the brake rather than by the edge — a blocker's
closure releases the dependent into the same run's next `pick`. The corrected claim is what the walk
proved, and everything else in criterion 3 held: both drains ended with an empty ready set, a clean
`git status --porcelain`, and a report a human could read (drain 2's is a one-line skip). The
`**Status:** BLOCKED` line is untouched.

### Run metadata

- Target: `/tmp/beads-skill-accept-06` (removed after the walk).
- Drain 1: `7b772f99a44bf8dbe9a703f1379da4e7`; artifacts
  `/data3/yky/.archon/workspaces/_local/beads-skill-accept-06/artifacts/runs/7b772f99a44bf8dbe9a703f1379da4e7/`;
  log `/data3/yky/.archon/workspaces/_local/beads-skill-accept-06/logs/7b772f99a44bf8dbe9a703f1379da4e7.jsonl`;
  child log `/data3/yky/.archon/logs/detached-run-cli-1789235840990-9mw2ds.log`.
- Drain 2: `ceaf5502be842787d60cb12a1e3097cc`; artifacts
  `…/artifacts/runs/ceaf5502be842787d60cb12a1e3097cc/`; log `…/logs/ceaf5502be842787d60cb12a1e3097cc.jsonl`;
  child log `/data3/yky/.archon/logs/detached-run-cli-1789236499852-z05ca6.log`.
- Issues: `greet/01` `bsa-1d6`, `greet/02` `bsa-1tu`, `greet/03` `bsa-4c5` (blocked by `bsa-1tu`).
- Store answers: pre-drain ready `["bsa-1tu","bsa-1d6"]`, blocked `["bsa-4c5" ← "bsa-1tu"]`; post-walk ready
  `[]`, blocked `[]`, three closes with `merged beads/greet/<NN>-<slug>`.
- `git status --porcelain` in the Target: clean at scaffold, after drain 1, and after drain 2.
