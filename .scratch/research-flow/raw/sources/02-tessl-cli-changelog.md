SOURCE-URL: https://docs.tessl.io/changelog-cli.md
FETCHED: 2026-09-14T17:19:34+08:00
HTTP: 200

> For the complete documentation index, see [llms.txt](https://docs.tessl.io/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.tessl.io/changelog-cli.md).

# CLI Changelog

Latest version = 0.108.0

## 0.108.0

### New Features

* **`tessl eval run --arms-json`** - supply comparison arms as inline JSON or a JSON file path. Malformed arrays, more than ten arms, non-object entries, and missing or duplicate labels fail before the run starts
* **Readable schedule formats in `tessl.json`** - a schedule accepts raw cron, a closed set of readable shorthand strings, or a structured object, and `schedule` works as an alias for `cron`
* **Agent signals from plugin hooks** - skill activations, MCP tool activations and session availability are captured when hooks fire

### Improvements

* **Dangling skill links in `tessl doctor`** - a skill link whose target has moved is reported as a blocker with `tessl install` as the next action, in both the human output and `--json`. Renaming a project folder on Windows breaks every link at once, and `doctor` previously reported everything healthy
* **Eval comparison tables** - `tessl eval run` renders a compact arm comparison table before the per-arm scenario tables, with score, cost, duration, token and turn values in separate columns. In `--full` mode distributions render vertically and each scenario's criterion table follows its arm table
* **One table style** - every human-readable table shares a single borderless style with bold headers
* **Code Review setup link** - the embedded `tessl/code-review` plugin moves to 0.3.1, so installing the App from `tessl agent` lands on the organization's Code reviews page, which carries connect, repository selection and the two configuration questions in order
* **`tessl schedule list`** - the truncation notice is reworded

### Bug Fixes

* A `PostToolUse` hook accepts an MCP content array as `tool_response`, which several native adapters rejected before the hook script ran
* A Claude Code `SessionStart` model is preserved when the native payload supplies one, and Claude Code `PostToolUse` is no longer expected to carry a duration
* Recursive verification rejects a `childManifests` path that resolves outside the active project root
* Launch run live progress defaults to `metrics.json`, the artifact every recipe produces

## 0.107.0

### New Features

* **Organization selection for Code Review** - `tessl code review` accepts `--org` and `TESSL_ORG`. The selected organization drives model availability, credit preflight, key minting and billing attribution, and stays pinned to the key even if the account default changes later
* **`tessl outdated --global`** - check the plugins installed in `~/.tessl` from any directory, with or without a local `tessl.json`
* **`tessl schedule list --all`** - page through every schedule instead of the first page. Without it, a notice now says how many are shown when more exist

### Improvements

* **Reviewed code state in Code Review output** - `tessl code review` names the selected head and comparison base, and warns when a committed selection leaves uncommitted local edits out of the review
* **`@tessl-reviewer`** - accepted as an alias for `@tessl-code-review` when triggering a review from a pull request comment
* **Tessl Verify model default** - `tessl change verify` and `tessl change verify suggest-scopes` now run on GPT-5.6 Luna. An explicit `--model` still takes priority
* **Eval view statistics** - `tessl eval view` builds its rollups and compact summaries from distributions, pairs spreads with means, labels solution cost as `mean/solution`, keeps the median in `--full` output, and marks a distribution that is incomplete

### Bug Fixes

* `tessl code review --json` emits one JSON document with nothing on stderr, so merged output streams parse cleanly through model retries and command failures
* `tessl eval view` shows why a scenario was excluded by the quality check rather than only that it was
* `tessl eval run` credit estimates count every arm, so a multi-arm run is no longer under-quoted before it starts
* `tessl update` reports every dependency whose version check failed, including private ones, instead of hiding them when another dependency is outdated
* `tessl agent` no longer leaves a stale status line frozen in the scrollback after a turn ends
* Filesystem, network and out-of-memory failures are reported as clear errors instead of surfacing as crashes

## 0.106.0

### New Features

* **Desktop notifications** - the agent rings the terminal bell and fires an OS notification when a turn finishes or a permission prompt appears while your terminal is in the background. Nothing fires while the terminal has focus, and print mode never notifies. Background detection relies on ANSI focus-event mode 1004, so a terminal that does not report focus changes is treated as focused and stays quiet. Turn it off with `tessl config set notifications false`
* **Every agent run ends with a summary** - an interactive `tessl agent` run now closes with one block: the files it recorded writing or editing, and one suggested next action, offered as prompt ghost text you accept with Tab. The file list covers edits made through the edit and write tools, so a run that reports none is saying it recorded no such edit, not that nothing on disk changed
* **`--no-wait`** - `tessl eval run`, `tessl review run` (quality and security) and `tessl scenario generate` take `--wait` and `--no-wait`. With `--no-wait` each submits the work and returns its run id, or ids for an `eval run` that submits several, without polling, so a CI job can start a run and collect the result later with the matching `view` command. It is rejected alongside a gate that needs the run to finish: `--threshold` on a quality review, `--fail-on` on a security review
* **Multi-arm eval runs** - `tessl eval view` detects a run with custom arms and renders one section per arm, each with a rollup line and per-scenario rows carrying score, cost per solution, turns, tokens and agent time. `--full` expands every stats cell to the full distribution: min, q1, median, mean, q3, max and sd. The classic baseline and with-context pair keeps its existing layout, now with compact stats lines. Arms mode never shows lift

### Improvements

* **The GitHub App is the supported way to install Code Review** - the docs and every CLI surface that pointed at the GitHub Action now point at the Tessl Review GitHub App, and the Action is marked unsupported. The tutorial is rewritten around installing the App, enabling a repository, trigger policy, approval, the three comment intents and the `.tessl-code-review.yml` reference; running Code Review in your own CI becomes a sub-page of it. The CLI embeds `tessl/code-review` 0.3.0
* **Deleting your last workspace deletes it** - the old behavior removed the workspace and immediately re-created an empty copy in its place, then explained across six messages that it had been kept. An organization may now hold no workspaces
* **A warning before a workspace name is lost** - deleting a workspace that has published a public plugin permanently reserves its name, and an interactive `tessl workspace delete` now says so while you can still change course, along with pointing out that moving a workspace between organizations is a support request rather than a delete and recreate. A scripted deletion does not show the preview
* **Windows skill installs no longer need Developer Mode** - `tessl install` and `tessl init` create a directory junction on Windows instead of a symbolic link, which a standard user can create without elevation. Installation had been failing outright on devices whose policy blocks Developer Mode
* `tessl skill review` is removed. It has printed a deprecation banner since June and the migration guide's removal date passed in July. Invoking it exits non-zero with "No review ran" and names `tessl review run` and `tessl review fix` as its replacements, and it still parses every flag the old command took, so a pipeline reaches that message rather than a flag-parse error. The flag-by-flag mapping is in [Migrate from skill review](/improving-your-skills/migrate-from-skill-review.md)

### Bug Fixes

* Ctrl+C works while a spinner is running. `tessl code review` made this visible because its live lens board keeps one spinner up for the whole run, so the command could not be interrupted at all, but every spinner in the CLI was affected whenever nothing had read stdin before the spinner started
* A tool call that fails and is recovered from on the next turn renders on the neutral gray background rather than in a red error box. The error output is still shown. Stack traces from background dependencies no longer reach the terminal
* The permission dialog's options each state their own effect, ordered narrowest to broadest: allow once, allow this pattern for the session, block once, and block with an optional reason for the agent
* Every interactive session has exactly one prompt ghost. Until the conversation starts it offers the splash question, and after every completed turn it offers the next thing to type, in every session rather than only one started with `/skill:<name>`
* `tessl scenario generate` against a repository now fails when a generation completes with no scenarios, matching what the plugin path already did. The exit code carries that verdict only on an invocation that waits for the run, so a CI pipeline gating on it needs `--wait`, since the command otherwise submits and returns before the outcome is known. The human output counts scenarios rather than generations

## 0.105.0

### New Features

* **Live lens board** - `tessl code review` shows a per-lens progress board on stderr while it runs, marking each lens as queued, reviewing, a finding count, failed, or skipped before the reconciling step; `--no-progress` hides it and `--json` implies it
* **Lift as the eval headline** - `tessl eval run` prints a `Lift:` line under each completed comparison run, and `tessl eval view` leads its summary and each scenario with the lift in percentage points, noting how many unscored results were excluded
* **Organization-level project discovery** - `tessl project list`, `tessl project link`, and `tessl project create` discover projects across your whole organization, with `--org` (or `TESSL_ORG`) to pick the organization, `--workspace` for single-workspace behavior, and `tessl project link --path` to match a package project by its repository subpath

### Improvements

* **One Tessl Code Review plugin** - the CLI embeds `tessl/code-review` 0.2.0, which now carries the setup, lens-authoring, and review-response skills alongside the four lenses; the default lenses are repinned to 0.2.0 with unchanged content, and a project that still declares `tessl/code-review-setup` or `tessl/code-review-lens-creator` in `tessl.json` keeps using it until it switches
* **Code review at splash** - the "Review code changes" onboarding workflow installs `tessl/code-review`, sets up review on every pull request, and suggests one custom lens the default lenses would miss, without writing it
* **Grouped review summary** - `tessl code review` ends with a versioned header, a verdict line with must-fix and suggestion counts, findings grouped into must fix and suggestions sorted by severity, and the exact publish command; under `--json` the same summary goes to stderr so CI logs carry it
* **Eval reuse made visible** - `tessl eval run` and `tessl eval view` print how many results were reused from previous runs beside the cost line, so a fast, cheap run no longer reads as stale
* **`tessl project list --json` reports the organization** - the output carries a top-level `org` instead of `workspace` unless `--workspace` or `TESSL_WORKSPACE` pins one

### Bug Fixes

* `tessl code review` against a caller-supplied LLM endpoint with a model-scoped key no longer fails during reconciliation, because the pinned supervisor model is sent by its bare name
* `tessl eval view` floors score percentages instead of rounding them, so the table, averages, and lift agree
* The splash screen's workflow picker moves one step per arrow key press on Kitty-protocol terminals such as Ghostty, Kitty, and WezTerm, where the key release was counted as a second press; a held arrow still scrolls smoothly

## 0.104.0

### New Features

* **Eval cost shown before you spend** - `tessl eval run` prints an estimated cost line and your org's daily eval usage before the run starts, including with `-y`
* **Eval cost in machine output** - `tessl eval run --json` gains `estimatedCredits` and `quota`, and `tessl eval view --json` gains `meta.credits` for the settled run cost

### Improvements

* **Review action beside severity** - every published Code Review finding now shows `Requires changes` or `Advisory` next to its severity, along with why an advisory finding is advisory: low confidence, pre-existing, unclear relationship, or the review mode
* **Run cost reported in CI** - the post-run credit cost line is no longer suppressed on non-interactive streams, so CI and piped runs see the spend

### Bug Fixes

* `tessl api --input -` and `-F key=@-` now read stdin from a redirected file or heredoc, not just a pipe; both refuse an empty stdin or a bare terminal with an error instead of sending no body

## 0.103.0

### New Features

* **Scheduled runs** - `tessl schedule` is now available. You can use it to automatically run skills on a periodic schedule.
* **Environment management** - `tessl environment` can be used to manage environments for `tessl schedule` and `tessl launch skill --cloud`
* **Antigravity support** - first-class support for the Antigravity CLI (`agy`) and the Antigravity IDE, alongside the existing Gemini integration
* **`tessl eval run --wait`** - polls the run to completion and exits non-zero when all runs fail; `--json` always submits without waiting, and a run that outlives the poll window exits 0
* **`tessl api-key delete --yes`** - skips the confirmation prompt, with `-y` as the short form

### Improvements

* **Agent step lines** - each tool call in an interactive `tessl agent` session renders as one status line naming the step and its result, with `ctrl+o` to expand the full output
* **Expand-all hint** - the agent header now advertises the collapse and expand-all shortcut, resolved from the effective keybinding
* **Activity footer** - the footer names the running step, shows an elapsed timer, and keeps the known-total count, then leaves a one-line result carrying the total duration
* **Permission prompts** - the command, target, or path appears on its own indented line, long commands are middle-truncated so the tail stays visible, and bash prompts carry a Why line when the agent states its intent
* **Code Review finding assessment** - the supervisor now assesses likelihood, confidence, and relationship to the change alongside severity, and a deterministic Strict, Standard, or Relaxed policy decides what blocks
* **Code Review severity table** - rows are ordered Critical, Major, Minor, then Nit rather than by insertion order
* **Code Review round notice** - rounds after the first carry a collapsed "About this review" block noting the findings are AI-generated, with a link to the guidance
* **Code Review thread links** - a finding carried forward now links the thread that is carrying it
* **Skill review phases** - the bundled `review-skills-in-repository` skill splits into a Discover phase that reports and stops, and a Review phase entered only when you opt in
* **Skill review scope** - after discovery the skill offers one skill, a prioritized batch, or every discovered skill, each with an expected duration and credit cost, replacing a silent 20-skill cap
* **Skill review output** - the review leads with a ranked list of every reviewed skill, one line each, with per-skill detail on request and coverage counts below it
* **Skill discovery** - discovery runs as a deterministic bundled script rather than an agent file-system walk
* **Clearer command briefs** - `tessl project`, `tessl agent`, `tessl outdated`, and `tessl update` now describe what they do
* **Clearer skill name errors** - an invalid skill name names the specific problem and suggests a corrected name
* **Eval default model notice** - the notice no longer names a model and points at `tessl eval run --list-agents`, since the default is declared per region
* **Project mismatch** - `tessl install` blocks with the relink command when the backend already has a project for this directory, and `tessl init` warns before creating a second one

### Bug Fixes

* `tessl eval view` exits 1 for a failed run, and `tessl eval run` aborts with exit 1 when the scenario count exceeds the guard
* `npm install tessl@X` installs version X instead of whatever the release channel currently advertises
* The agent session no longer clears scrollback and snaps to the top while streaming, so a permission prompt stays reachable
* Code Review keeps successful lens results when a sibling lens fails, and states the reduced coverage instead of discarding the whole review
* Code Review republishes a moved finding at its current anchor and links the earlier occurrence, instead of leaving the only comment on stale code
* Code Review includes verified optional findings in first and explicitly requested full reviews
* `tessl workspace delete` distinguishes a deleted workspace from one emptied in place, and names the plugins to remove when they block deletion
* `tessl scenario generate` no longer blames plugin content or the quality verifier for a zero-scenario result, and reports a timeout distinctly from a failure
* `tessl scenario download` defaults to the plugin root when run inside a plugin
* Fixing path handling bugs in `tessl install` and `tessl init` on Windows
* The agent onboarding editor keeps a custom editor factory and honors the Kitty keyboard protocol
* An ambient `WORKOS_CLIENT_ID` no longer overrides CLI auth

## 0.102.0

### New Features

* **`tessl eval lint`** - the scenario lint command now shows in `tessl eval --help`, and `tessl scenario download` prints a hint that downloaded scenario files can be edited by hand and validated with it
* **Launch activity for pending runs** - `tessl launch skill --cloud --wait`, `tessl launch view`, and `tessl launch list` now show a pending run's phase and last progress time; retrying and recovering read distinctly and are never shown as failed

### Improvements

* **Adaptive review effort** - `tessl code review` now defaults to adaptive effort, picking the right depth for each review; `--effort` with low, medium, or high stays fixed
* **Code Review finding quality** - findings are checked more rigorously before they are surfaced, and severity now better reflects the real consequence of each finding
* **MCP server status** - configured MCP servers now read as ready and connect automatically on first tool use; the footer, status output, and MCP panel share one state model with clearer sign-in guidance
* **Plugin terminology** - user-facing copy now consistently says plugin and plugins; the migrate commands for legacy tile content are unchanged

### Bug Fixes

* Code Review now replies on an existing review thread when a re-review changes its conclusion, instead of leaving its earlier answer as the last word while the check stays red
* `tessl login` now lets a user who belongs to more than one organization choose which one to sign in to on the approve page, instead of failing for members of an SSO-enforced organization with a second membership
* Spinners are suppressed when stdout is not a TTY, keeping piped output, `--json` mode, and agent contexts clean
* `tessl cli update` now shows a clear error pointing at `--channel` when a release channel name is passed as `--target`
* Eval runs that outlive the CLI's poll window are now reported as timed out instead of failed, so a run that completes server-side no longer triggers a false "All eval runs failed"
* The workflow hint in `tessl agent` now steps aside while another UI such as the settings menu owns the prompt row, and no longer appears on `--continue` or `--resume`

## 0.101.0

### New Features

* **`tessl login`** - loopback is now the default transport. Plain `tessl login` uses the loopback authorization-code and PKCE flow, and the device grant stays available with `--device`.
* **Local GitHub App minting** - when `TESSL_GITHUB_APP_ID` and `TESSL_GITHUB_APP_PRIVATE_KEY` are both set, `tessl github token`, `tessl github setup-auth` and the auto-refresh sidecar mint installation tokens directly as that App, so its own bot identity lands on commits and pull requests. With either variable absent, behavior is unchanged.
* **Guided first run** - a new signed-in user is handed off from the web onboarding into `tessl agent` with the review-skills workflow, with in-editor hints for the next action.
* **Context and Findings** - the embedded CLI skill now works in terms of Context and Findings instead of a skill inventory, and points at the current per-workspace Context and per-org Findings endpoints.

### Improvements

* **`tessl code review`** - a finding states what is broken and what a fix has to achieve instead of prescribing a specific fix, and a review no longer blocks on code outside the diff.
* A deliberate, explained reversal of an earlier fix is read as a decline rather than a regression, so the same concern is not raised again.
* A finding is reposted on a silenced thread only when it requests changes, so an optional suggestion is no longer republished every round.
* Local-mint failures show GitHub's own error message without `--verbose`, and report the measured local-versus-GitHub clock difference when the two disagree.
* The `--model` and `--scorer-model` briefs on `tessl eval run` show current model names.

### Bug Fixes

* `tessl login` reports the reason for a WorkOS authentication challenge, such as organization selection or email verification, instead of a bare status code.
* `tessl login --loopback` always runs the loopback transport instead of silently rerouting to the device grant on a host that looks remote. An automatic fallback prints why it happened and which flag overrides it.
* Skill symlinks resolve the physical parent directory before computing their target, so links no longer dangle when an intermediate directory is itself a symlink.
* `tessl launch skill` no longer reports a watch timeout as a launch failure. It stops watching, exits 0, and prints a `tessl launch view <id>` command.
* `tessl eval run` refuses a run started from inside a plugin's `evals/` directory before any credits are spent, rather than silently running baseline only with no plugin context.
* Onboarding hints release the arrow keys when another component, such as the model picker, takes focus.
* The `[PostHog] Timeout while shutting down PostHog` warning is no longer printed on exit.

## 0.100.0

### New Features

* **`tessl project list`** - lists the projects in a workspace with each one's name, ID and source. The workspace is resolved from `--workspace`, `TESSL_WORKSPACE`, the project linked in `tessl.json`, or a picker. `--json` emits a structured list and never prompts
* **A machine-readable verify report** - `tessl change verify --report-json <path>` writes its JSON report to a file, so CI can consume verifier findings without a second run. Stdout is untouched and `--github` annotations still work alongside it. The report now also carries each verifier's stable `id`, in both `--json` and `--report-json`
* **Cloud launch progress** - `tessl launch skill --cloud --wait` shows live progress on the spinner while the run is in flight, instead of a static message. `--json` and `--no-wait` are unaffected

### Improvements

* **Working with this review** - the first Tessl Code Review on a pull request now publishes a collapsed section telling the reader that the findings are AI-generated and not authoritative, which answer to give on each thread (addressed, refuted, or declined), that reviews are incremental and what a later round therefore withholds, and that lenses are configurable and glob-scoped. It is published on the first review only, so a later round does not push the findings further down. `tessl code review run -h` says the same things
* **Settled threads close themselves** - a Tessl Code Review round now resolves the threads whose finding the current head fixes, after replying on them, so what stays open on a pull request is what still needs someone. A refuted or declined finding's thread stays open for the author to close
* **One closing instruction on every round** - every published review round now closes with the same line: mention `@tessl-code-review` to run another review

### Bug Fixes

* **Repository flags accept a GitHub URL** - `tessl github setup-auth --repo` and `tessl github token --repo` accept a full GitHub URL as well as an `owner/name` slug. HTTPS, scheme-less `github.com/owner/name`, and SSH forms all resolve to the same repository, and a non-GitHub host is rejected with the value echoed back
* **A full review says it was full** - a full Tessl Code Review no longer closes by claiming it narrowed itself. A full round now states that the whole change was read and every new finding raised whatever its severity, and keeps the contrast with an ordinary round
* **A live finding is not left collapsed** - a re-review that concludes an earlier finding still applies now reopens that finding's resolved thread, so the update is not left where tooling and readers skip it. A thread whose finding was answered as addressed, refuted, or declined stays resolved
* **A finding reaches its reader when a thread cannot reopen** - the finding is published as its own comment instead of being left where no reader reaches it. A GitHub Actions token may reply to a review thread but may not unresolve one, so the review now asks per thread rather than assuming
* **Mentions are matched case-insensitively** - a mention of `@tessl-code-review` that differs only in case, such as `@Tessl-Code-Review approve`, is now read as a mention. An approval request spelled that way was previously answered with an ordinary review
* **Verify reaches allowlisted dot-directories** - `tessl change verify` discovers files in repository-root dot-directories that a verifier's include globs name explicitly, so an include such as `.github/code-review/*.mjs` matches instead of silently matching nothing. Only allowlisted repository-tooling directories are opened, and only at the repository root

## 0.99.0

### New Features

* **Named approver logins** - `tessl code review --approver <login>` names comment authors permitted to request an approval, beyond the repository owners, members and collaborators who always may. The flag is repeatable, logins are compared case-insensitively, and a bot login is matched exactly as the event payload spells it, `[bot]` suffix included. GitHub reports every app comment with association `NONE`, so before this no bot could pass the guard
* **A refused approval request no longer runs a review** - asking to approve without permission settles as skipped in under a second, rather than spending a full review to answer the opposite of what was asked. The message leads with what was refused and names the route back: approving is limited to owners, members and collaborators, plus any login passed with `--approver`
* **Full review requests** - a commenter who may approve can ask for a full review instead of another round. Its specialists then see the whole change rather than only the commits since the last reviewed head, and a low-severity finding no earlier round raised is raised. Prior findings still reconcile on their existing threads. A request from an author the repository does not trust to approve runs the ordinary round rather than being refused
* **A change-requirement threshold in Code Review profiles** - a repository YAML profile sets `requestChangesAt`, the severity at which a finding starts requesting changes, so a team adopting Code Review on a large existing codebase can gate on criticals alone while a repository with a strict main branch holds minors on every round. It is a profile key rather than a flag, so no caller can weaken the gate without changing the profile the repository committed. The default is now `major` on every round, which means a minor no longer requests changes on a first review
* **Machine-readable output on list and view commands** - `--json` on `tessl whoami`, `tessl config get`, `tessl config list`, `tessl org list`, `tessl plugin info`, `tessl workspace list` and `tessl workspace list-members` prints one JSON document. Every `--json` command now writes one pretty-printed document to stdout and routes hints, progress, warnings and errors to stderr, so stdout stays parseable
* **Sign in with a local browser redirect** - `tessl login --loopback` signs in with a loopback authorization code and PKCE, so the browser hands the session back to the terminal without a code to type. The device code flow stays the default and is unchanged, and `--loopback` falls back to it when the browser is not on this machine or the loopback port cannot bind
* **Find work to automate** - a fourth onboarding workflow in `tessl agent` looks for what you do repeatedly that could run itself. It returns at most five ranked candidates, each with its evidence, its expected value, a suggested trigger and an implementation direction, and expands one on request

### Improvements

* **Whoami describes the API key** - `tessl whoami` in a session authenticated with an API key now shows the current key in use (masked), its scope, its id, and the organization and workspace it belongs to
* **Findings below the threshold on a later round** - a re-review no longer raises a fresh finding below the change-requirement threshold, and a finding an earlier round raised stays on its thread. An approving review that carries findings now states how many of them are optional, so open findings under an approved verdict are not read as blockers
* **Guidance routing** - broad questions about Code Review, Risk and Verify reach the harness design skill, while an explicit request to author a review lens still reaches the lens creator
* **Code Review setup knows the new profile keys** - the bundled `tessl/code-review-setup` moves to 0.3.0, so a project that does not declare the plugin itself gets a setup skill that covers the change-requirement threshold and who may ask the reviewer to approve
* **A rejected CLI version says how to upgrade** - when the backend refuses a CLI as too old, the CLI prints the reason it was given along with how to upgrade, rather than a generic failure. A request that never reaches the backend at all is now reported as a network failure rather than as an API rejection
* **Clearer guidance outside a project** - a command run where no Tessl project can be found says to run `tessl init` from the project root, instead of describing what a project is

### Bug Fixes

* **Spinner frames stay out of JSON output** - `tessl review fix` and `tessl review run quality` stop the spinner before printing the `--json` status payload on the timeout, failed and cancelled paths
* **Code Review resolves the repository's default branch** - the base is read from `origin/HEAD`, falling back to a probe for `origin/main` then `origin/master`, instead of assuming `origin/main`. A repository whose trunk is named something else is told to pass `--base` rather than failing on a ref that does not exist, and an explicit `--base` still wins outright
* **An empty change is skipped rather than approved** - a local review of a clean, up-to-date checkout returns a skipped result carrying `No changes to review.` before any model call, instead of running every lens and publishing `Changes approved` over a change that does not exist
* **Eval runs report what happened** - `tessl eval run` retries a run that is momentarily missing from the poll endpoint just after it was created, rather than treating it as terminal, so completed runs no longer report `All eval runs failed`. When every run really does fail the command exits non-zero, so a pipeline wrapping it sees the failure

## 0.98.0

### New Features

* **Publish a Code Review from the CLI** - `tessl code review --publish <comment|verdict>` posts the completed review to the pull request it reviewed as one native GitHub review: a summary body, an inline comment on each finding GitHub can anchor to a changed line, and a reply on each earlier finding's thread the round reconciled. `comment` states no position on the change, while `verdict` carries the review's own conclusion, approving when nothing requires changes and requesting changes otherwise. With `--json`, the result carries a `publication` receipt naming what was published
* **Reasoning effort is supported configuration** - `--effort low`, `medium` or `high` sets how hard each review lens thinks. A YAML profile can set `effort` for every lens, and any single lens can set its own to think harder or less hard than the rest, so depth is spent where it pays. A lens without one uses the profile's, with neither the model applies its own default, and `--effort` overrides both
* **Ignore globs in Code Review profiles** - a YAML profile takes a top-level `ignore` list of repository-relative POSIX globs bounding which paths any lens reviews, so generated code, lockfiles, snapshots and vendored directories are excluded once instead of negated inside every lens
* **An inline workflow hint replaces the onboarding splash** - `tessl agent` opens with a few lines above the prompt rather than a full-screen welcome. Either arrow key opens the list, selecting a workflow fills the prompt with it ready to send, and `/getting-started` reopens the list
* **Review my skills** - a new onboarding workflow that reviews every skill in the repository. It discovers them, lints them deterministically, reviews each against seven dimensions, and returns a ranked plan tied to evidence. It changes no files, and offers `tessl review fix` as an opt-in follow-up
* **Learn from PR feedback needs no input** - the workflow defaults to the last two weeks instead of asking for a pull request number or a time period, states up front that it changes no files, and returns a ranked, capped set of improvements with its coverage limits named
* **Workspace and organization environment variables** - `TESSL_WORKSPACE` and `TESSL_ORG` set the workspace and organization for commands that take `--workspace` and `--org`, so a script does not repeat the flag on every call. An explicit flag always wins, and a project `.env` file cannot set either one
* **Global installs follow organization policy** - globally installed managed requirements converge on the organization's install policy whenever the CLI contacts the backend, not only on an explicit `tessl install -g`. Security thresholds, minimum release age and source restrictions all still apply, and only policy-owned content is removed

### Improvements

* **Clearer failure messages** - installing over Git, self-update, sign-in and eval artifact uploads report failures written for the reader, rather than passing transport wording such as `HTTP 404` through to the terminal
* **Help reads for its audience** - `tessl --help` prints plain text for a person, with usage, grouped commands and flags. The Markdown reference is served only to recognized agent callers, and covers the top level, a group and a leaf alike
* **Code Review setup** - the bundled `tessl/code-review-setup` moves to 0.2.0. The setup skill documents the profile `ignore` list, and the workflows it writes subscribe to pull request review comments, so a mention left on the diff starts a review. Who may request one moves to an `allowed-associations` input rather than a condition the workflow implements itself, and the `uses:` line references the Action's major tag instead of a commit resolved at setup time, so a repository picks up fixes without editing its workflow

### Bug Fixes

* **Conceded findings settle** - a finding the author agrees is real but defers to tracked follow-up work now reconciles as declined, instead of resurfacing as remaining on every later round
* **Verify separates errors from failures** - `tessl change verify` reports a target it could not judge, such as a base ref it cannot resolve, as a distinct `error` outcome rather than a verifier failure. Those targets are listed under "Could Not Be Verified", left out of the failure breakdown, annotated as notices, and still exit non-zero
* **Launch reports the agent's own outcome** - `tessl launch skill --cloud --wait` exits non-zero when the workflow completes but the agent reported a failure, and `tessl launch view` renders the agent-reported outcome for completed runs

## 0.97.0

### New Features

* **Repository YAML profiles** - `tessl code review --profile <path>` now accepts a repository YAML profile as well as the built-in `standard` profile. A profile routes lenses with ordered repository-relative globs, and each specialist's prompt and read-only diff tools are scoped to the paths its lens matched. The path must end in `.yml` or `.yaml`
* **Approval commands** - a trusted repository owner, organization member, or collaborator can mention `@tessl-code-review` with an explicit instruction to approve the pull request. Code Review returns an approved result without running specialist lenses. Ordinary review requests, ambiguous wording, and classification failures continue through a normal review
* **Agent-facing help** - a bare `tessl`, or an explicit `-h`, from a recognized agent now prints a Markdown description of Tessl and how to drive it, generated from the command registry. Claude Code, Cursor, Codex, and Gemini are detected without configuration
* **Readiness reporting** - `tessl doctor --json` and the MCP `status` tool both return a `readiness` field with a `state`, machine-readable `blockers`, and an ordered `nextActions` list. One shared function computes the field so the two surfaces return consistent guidance. Existing fields and `doctor` terminal output are unchanged
* **API key listings as JSON** - `tessl api-key list --json` prints a machine-readable listing, walks every page so a truncated result cannot appear complete, and includes each key's role
* **API key expiry notice** - `tessl api-key create` prints the key's expiry date and days remaining to stderr. A key piped directly into a secret store still reports its 30-day lifetime while stdout stays clean
* **`rotate-ci-key`** - a new bundled skill reads your pipeline to find which secret supplies `TESSL_TOKEN`, selects a rotation tier based on its access, presents a plan naming the source of each fact, and waits for approval before changing a live credential
* **Antigravity skills** - a global install now also symlinks skills into `~/.gemini/config/skills/`, where Antigravity, Antigravity IDE, and Antigravity CLI look. The existing `.agents/skills` path is unchanged

### Improvements

* **Lens limit** - Code Review accepts up to 8 lenses, up from 5. The lenses active for the current change are resolved before the limit applies, so lenses whose globs match nothing do not count against it
* **Error routing** - 9 more precondition failures name what was found and return the command that resolves it. This covers linting a directory with a `SKILL.md` but no manifest, an unlinked `tessl.json`, an invalid package name, an empty scenario directory, a missing fix-run bundle, and the deprecated skill review path. Raw HTTP statuses no longer reach the user
* **Setup handoff** - `tessl init` now wires agent context (`RULES.md` and `AGENTS.md`) even when no plugins are installed, so an agent has context before anything is installed. `tessl login` resumes the interrupted setup step when there is one, and otherwise points to the first unblocked step. Every MCP tool that requires authentication now says so in its description
* **Rejected key guidance** - a rejected API key now reports where the detected CI provider keeps pipeline secrets and which of its CLIs edits them, across 12 providers with a generic fallback. On GitHub Actions, the failure is attached to the workflow file as an annotation and appended to the run summary. Outside CI, the guidance points to a `TESSL_TOKEN` that may be shadowing a healthy session and should be unset instead of rotated
* **`tessl inventory import` scan scope** - scan scope is read from the integration scan policy configured on the organization integration page and enforced when data is persisted. The command no longer fetches a server-side exclusion list to pre-filter the scan. Only `--ignore-repo` narrows a run locally
* **Lens authoring** - the bundled `tessl/code-review-lens-creator` moves to 0.1.1. The lens-authoring skill now directs its reference reads explicitly, and its evaluation tasks no longer prescribe the answer they score
* **Code Review setup** - the bundled `tessl/code-review-setup` moves to 0.1.5. The setup skill now covers YAML profiles for CLI and Action runs, including lens routing, path scoping, the lens limit, local reference safety, and what happens when no lens matches. It also configures the Action with a repository-relative profile path

### Bug Fixes

* **Login link** - the URL printed when the CLI cannot open a browser now always carries its verification URI. Production builds previously omitted it, leaving SSH and development-container logins with a link the capture page could not use
* **MCP shutdown** - Ctrl-C no longer crashes the MCP server, and its capability warning is gone
* **Supervision context** - a live review refreshes the pull-request conversation after the specialists finish and immediately before supervision, so a reply posted while the review was running is taken into account. The run fails closed if the refresh fails or the base or head moves during the review
* **Reviews with no matching lens** - a review whose profile matches none of the changed paths returns an explicit skipped result without running a model, instead of completing in a way that reads as approval
* **Truncation reporting** - prompt truncation is reported whenever any specialist lens truncates, rather than depending on which parallel lens finished last
* **Review cancellation** - the every-commit workflow template no longer lets a comment on a pull request under review cancel the review in progress, and a push to a draft can no longer cancel a requested review. Cancellation is limited to a non-draft `synchronize` event. Workflows generated before this release keep their original template until regenerated

## 0.96.0

### New Features

* **Tessl Code Review (Beta)** - `tessl code review` now appears in the CLI help and runs a multi-lens review over a code change. With no flags it auto-selects the current pull request in a supported CI environment, or otherwise the complete local change; `--pr <ref>` reviews a pull request, and `--base` / `--head` review an explicit Git range with no pull request required
* **Code Review setup through Tessl Agent** - the tessl/code-review-setup plugin now ships embedded in the CLI, so asking Tessl Agent to set up Code Review installs the review workflow directly; the embedded guidance for the older change review flow was removed
* **Lens authoring through Tessl Agent** - the tessl/code-review-lens-creator plugin also ships embedded, so asking Tessl Agent to create a review lens scaffolds one without an install

### Improvements

* **Change review hidden from help** - `tessl change review` no longer appears in help output; Tessl Code Review supersedes it. The command keeps working for existing callers
* **First run points at setup** - the first CLI invocation shows a one-time hint pointing at `tessl init`, and the install scripts hand off with the same guidance. The hint is skipped in CI and on invocations requesting `--json`
* **Error messages direct the user to the command that resolves them** - user-facing errors now route to the command that fixes the reported state, instead of only describing the failure. Additionally, every missing-argument error states which argument was missing
* **Credit refusals are legible mid-run** - when credits run out in the middle of a run, commands surface a clear credit message across CLI and MCP surfaces instead of a generic failure
* **Skill review MCP tools state their scope** - the review\_run, review\_fix, and review\_view MCP tool descriptions now say they review skills, and point to `tessl code review` for reviewing code changes
* **MCP tool descriptions name neighboring workflows** - the status MCP tool description names the adjacent workflows to run next, so an agent picks the following tool without guessing
* **Skill publish validation** - publish validation reports every independently detectable problem in one pass, and skill validation messages use Tessl terms instead of raw schema output

### Bug Fixes

* **Install with a broken project link** - `tessl install` no longer fails when tessl.json links to a project that cannot be resolved, and errors in that state no longer suggest creating a new project
* **Organization selection in workspace create** - `tessl workspace create` resolves the owning organization before creating the workspace: the new `--org` flag takes an organization name or id, and membership in several organizations prompts for a choice
* **Scenario generation from the current directory** - the source argument to `tessl scenario generate` is now optional and defaults to the current working directory
* **API token identity** - `tessl doctor`, `tessl init`, and `tessl mcp start` no longer print a fabricated <api-key@tessl.io> email when authenticated with a TESSL\_TOKEN API key; they identify the session by the masked token instead
* **Corrupt tessl.json errors name the file** - a JSON parse failure while reading tessl.json now names tessl.json in the error message
* **Live documentation links** - `tessl skill new` and `tessl plugin new` print working docs.tessl.io links in their next-step guidance
* **No memory writes on read-only turns** - Tessl Agent no longer creates or updates .tessl/memory files during turns that make no changes

## 0.95.0

### New Features

* **Delete an API key by name** - `tessl api-key delete <name-or-id>` accepts either the key name or its ID, matching the pattern already used elsewhere. Interactive selection still works when no argument is given
* **Skill removal guidance** - asking to unpublish, archive or delete a skill now explains that skills are published inside a plugin and lists the three real removal paths, and `tessl skill --help` carries the same tip
* **Uncollected file warnings in review** - `tessl review run` and `tessl review fix` now name the skill files that were not sent to the reviewer, so content that scored low because it never reached the judge is visible
* **Out-of-workspace path warnings** - `tessl scenario view` flags generated scenarios whose task or criteria reference a home-directory or absolute path, which can never score above zero because the grader only sees the workspace

### Improvements

* **Credit warnings on stderr** - credit warnings print to stderr instead of stdout, so they no longer sit inside a command's own output. `TESSL_CREDIT_WARNING_STREAM` accepts `off`, `stderr` or `stdout` to override the choice
* **Upgrade path in the agent credit footer** - the out-of-credits and over-limit states now point at `/usage`, where the balance and the upgrade link live
* **Pricing links** - credit and upgrade calls to action point at `/pricing`
* **Credit checks on the MCP surface** - the MCP server now runs the same credit preflight as the CLI, closing a path where a blocked organization could still spend credits
* **Score composition in review output** - review results show how a score was composed, per judge, rather than only a final number
* **Organization default model for agent sessions** - `tessl agent` picks up an organization's configured session model when no `--model` flag and no persisted default are set
* **Review hands off to fix** - after a quality review, `tessl review run` points at `tessl review fix` as the next step when the review found something to act on. The MCP `review_view` tool carries the same signal as a `nextStep` field
* **Fix runs stop at a reachable score** - the default fix threshold drops from 100 to 90, so a run can finish early instead of burning every improve iteration on a target a review almost never hits. The MCP surface no longer holds its own defaults and reports the config the server resolved

### Bug Fixes

* Review scores render against the rubric's own scale instead of a hardcoded denominator of 3, so a 1 to 5 rubric no longer reports the wrong total
* `tessl skill review --json` carries the deprecation notice in its payload, and the post-apply hint points at `tessl review run` instead of the deprecated command
* A logged-out global install of registry content is refused when the global context is managed by an organization policy, closing a path where logging out skipped the organization's managed requirements
* `tessl install -g` labels the resolved policy scope `org:` instead of mislabeling it `workspace:`
* Auto permission mode no longer fails at startup for organizations whose model catalog omits `gpt-5.4-mini`. The classifier falls back to the resolved session model
* Reasoning models in the `gpt-5.6` family route through the OpenAI Responses API, fixing a gateway 400 when a request carried both a function tool and a reasoning effort
* Skill inventory upload accepts `internal` as a repository visibility, so GitHub Enterprise organization-internal repositories are no longer rejected

## 0.94.0

### New Features

* **Credit usage meter** - `tessl org usage` shows your organization's plan, credits used against the allowance, and when the current window started. Pass `--org` to name an organization, `--json` for the raw credit account
* **`/usage` and `/cost` in the agent** - `/usage` shows the same meter without leaving the session, `/cost` shows what the session has cost in credits with the token counts underneath, and a `credits: N left` segment on the footer refreshes each turn
* **Commands report what a run cost** - every command that waits for a run prints the credits it consumed once billing settles, and `... view` commands report the cost of the run they inspect. The figure comes from the server, so it matches what you are billed
* **Credit guardrails on billable commands** - a one-line notice when you are over your allowance but still allowed to proceed, and a hard stop with an upgrade link when you are not. Both are suppressed under `--json` so structured output stays parseable
* **Scoped reviews** - new repeatable `--path` flag on `tessl change review` restricts the review to files matching a pathspec

### Improvements

* **Security grades read Tessl's own levels** - `tessl search`, `tessl tile info` and the security review output now render the Tessl security level and per-finding severity. A clean result reads "Passed", an unscanned one reads "N/A", low-severity findings group into their own section below higher severities, and an unrecognized level renders as-is instead of failing. `--json` keeps the previous fields alongside the new ones
* **Eval fixtures are bounded to the run** - `tessl eval run` and publish-time evals now refuse scenario fixtures and packed symlinks that resolve outside the run's repository or scenarios boundary, so an eval can no longer archive files from elsewhere on the machine. `tessl eval lint` reports the same. Out-of-boundary directory fixtures and symlinks are opt-in via `tessl eval run --allow-unsafe-fixture-paths`, or `--allow-unsafe-eval-fixture-paths` on `tessl skill publish` and `tessl plugin publish`. A scenario `include` must always resolve inside its own scenario, with no override
* **A project's `.env` can no longer redirect the CLI's own state** - `TESSL_GLOBAL_DIR`, `TESSL_BINARY_BASE_URL`, `TESSL_AUTO_UPDATE_INTERVAL_MINUTES` and `TESSL_DISABLE_UPDATE` are ignored when they come from a `.env` file in the working directory. Values set in your shell are unaffected
* **Workspace resolved from a plugin manifest** - working inside a plugin directory that has `.tessl-plugin/plugin.json` but no `tessl.json` no longer prompts for `--workspace`; the workspace is read from the plugin name
* **Declared skills scanned as real files** - `tessl inventory import` now scans skills declared in `tile.json` / `plugin.json` the same way it scans any other `SKILL.md` in the repository, so they carry their body and frontmatter instead of being recorded as bare references. Their names now come from frontmatter (or the containing directory) rather than being prefixed with the plugin name, and a declared skill whose file is missing from the scanned tree is no longer recorded at all
* **`workspace_list` reports what you can do** - the MCP tool now returns `allowedActions` per workspace, so a caller can filter to the workspaces it has permission to act on before trying

### Bug Fixes

* Failing commands print one error line. Previously the same message appeared twice, with two different cross glyphs
* `tessl change verify --recursive --github` now emits GitHub Actions annotations for every root. Warning-level findings from a recursive run previously only appeared in the raw job log
* Out-of-credits and other expected failures from the `review_run`, `review_fix` and `uninstall` MCP tools are reported as errors rather than crashes
* The MCP `workspace_list_members` tool explains that your role cannot view members, instead of failing generically
* A cached version entry dated in the future is treated as expired, so it can no longer suppress the update check indefinitely
* The path-containment check no longer misreads directory names that begin with two dots, and anchors relative targets on the boundary root

## 0.93.0

### New Features

* **Severity grading on review findings** - `tessl change review` now grades every finding nit / minor / major / critical by default; pass `--no-grade` to turn it off
* **Finding attribution** - each `tessl change review` finding names the reviewer skill that produced it
* **Explicit review range** - new `--head` flag on `tessl change review` to review a specific commit range instead of the inferred one
* **Publish-access filter** - new `--has-publish-access` flag on `tessl workspace list` to show only workspaces you can publish to
* **Plugin Creator in Tessl Agent** - the agent now ships with the Plugin Creator skills for authoring plugins

### Improvements

* **Symlink guard for MCP config** - the CLI warns and asks for confirmation before writing MCP configuration through a symlink that points outside your project
* **Local-execution notice** - installing a plugin that ships an MCP command which runs on your machine now tells you at install time
* **Global installs respect `--agent`** - the `--agent` scope is honored when installing context globally
* **`CLAUDE_CONFIG_DIR` support** - installing global Claude Code context now honors `CLAUDE_CONFIG_DIR`
* **Clearer permission prompt** - the session-scope option in the agent permission prompt has a clearer label
* **Clearer MCP review tools** - `review_run`, `review_view`, and `review_fix` describe what they do and what to expect
* **Keys revoked on logout** - `tessl logout` revokes the device's LLM keys

### Bug Fixes

* Fixed concurrent auto-updates leaving behind a dangling symlink
* Fixed a race when two installs ran at once by staging npm installer downloads
* `tessl change verify` now fetches the diff base itself in shallow and CI checkouts instead of failing
* Install sync no longer fails when a skill entry is missing from the manifest
* Search results now render when ranking data is unavailable
* Review scores now use the rubric scale reported by the API instead of assuming a fixed scale

### Removals

* `tessl context library` and its `query_library_docs` MCP tool have been removed. They were deprecated and have no replacement.

## 0.92.0

### New Features

* **Hooks in plugins** - Plugins can now declare cross-agent hooks via `hooks` / `nativeHooks` in `plugin.json`. See the [plugin configuration docs](https://docs.tessl.io/reference/configuration#hooks).

### Improvements

* **Signed release verification** - CLI installation and self-update now verify against a cryptographically signed release manifest before extraction.

## 0.91.0

### New Features

* **Agent-readiness report** - run `/agent-ready` in the `tessl` agent to scan your repository and surface what to improve.
* **`tessl launch resume`** - resume an interrupted or completed cloud launch run.
* **Signed release verification** - the installer verifies the release signature before installing.

### Improvements

* **Agent works without native search tools** - uses `fd` / `rg` when available and falls back to a basic code implementation when they are not installed.
* **Verify cache relocated** - now stored at `~/.tessl/verify-cache`, so cached results are shared across projects instead of living in each checkout.
* **Auto-detect workspace** - `tessl review run` / `review fix` read the workspace from `tessl.json` instead of always prompting.
* **`tessl launch list`** now shows the workspace and the run's creator.
* **`tessl eval list`** consolidates injected context into a single column.
* **Credit errors link to top-up** - an out-of-credits error now points to the upgrade / top-up flow.
* **Explicit, persistent agent setup** - `tessl init` now records selected agents in `tessl.json` for reproducible installs across machines. Re-run `tessl init` on an existing project to update the list.
* **Clearer permission prompts** - prompts are deduped per tool call, bash paths are classified by read/write/delete, external and sensitive-path actions route through the auto classifier, and auto-mode prompt wording is combined.

### Changes

* **Separate `--agent` and `--model` flags** - compound `--agent <agent>:<model>` tuples are now split into `--agent <agent> --model <model>`. The old form still works but is deprecated and warns.

### Bug Fixes

* Installer validates the remote release version before installing.
* Generic hook command/args aligned to the `exec` / `shell` forms.

## 0.90.0

### Breaking Changes

* `tessl review <target>` (without `run`) no longer runs a review - it now shows the `review` command group's help instead. Use `tessl review run <target>` (or `tessl review run quality <target>`).

### New Features

* **`tessl review run quality` / `tessl review run security`** - `tessl review run` is now a subcommand group: `quality` (the default, unchanged behavior) scores a skill against a rubric, and `security` runs a Snyk-powered security scan - replacing the standalone `tessl security-review` command. `tessl review list`, `view`, and `retry` now work across both kinds from a single unified history, with a `--fail-on` flag mirroring `--threshold` for security scans. `tessl review run <target>` continues to work exactly as before - it's shorthand for `tessl review run quality <target>`.
* **Clone skills from GitLab and Bitbucket sources** - Skill installation and inventory scanning now support GitLab and Bitbucket repository sources, not just GitHub.

### Bug Fixes

* Fixed `tessl agent` ignoring a saved default model from `settings.json` on startup.
* `tessl agent` - Fixed session approval matching for external paths when multiple patterns are involved.

## 0.89.0

### New Features

* **`tessl agent` out in Open Beta** - It helps you build and optimize your software factory one workflow at a time.
* **`tessl change` commands to aid with automated code reviews**
  * **`tessl change risk`** - Assess PR/diff risk and decide whether human review is required.
  * **`tessl change verify`** - Verify code against configured verifiers.
  * **`tessl change review`** - Review the current diff with reviewer skills and emit structured review data.
  * Use `tessl agent` to set them up!
* **`tessl launch skill`** - Run skills using your preferred agent in order to automate parts of your workflow with skills.
* **`tessl mcp proxy`** - Connect to MCP servers through an MCP gateway set-up in a workspace’s settings.

### Improvements

* **Clearer error when `--skill` can't apply** - `tessl install --skill <name>` now fails fast with an actionable message when given zero sources or more than one source, instead of silently installing nothing.
* **Friendlier model-lock message on eval runs** - Selecting a non-default model on a Free plan now produces a single, clear message explaining how to proceed, instead of a raw `403 Forbidden`.

### Bug Fixes

* Fixed relative `file:` sources (e.g. `tessl install file:../my-source --global`) failing to resolve; they now resolve against your current working directory as expected.
* Fixed a single unsupported entry in a plugin's `.mcp.json` failing the whole file at publish and install time; unsupported entries are now skipped and the rest of the plugin installs.

## 0.88.2

### Bug Fixes

* **npm package** - fixup README.md file

## 0.88.1

### Bug Fixes

* **Global plugin MCP servers** - `tessl install --global` now writes a plugin's MCP server config to each agent's real user-level config.

## 0.88.0

### New Features

* **Plugin MCP Servers** - Plugins can now declare MCP servers in a bundled `.mcp.json` at the package root.
* **Publish Through Symlinks** - `tessl skill publish` and `tessl plugin publish` accept an opt-in `--resolve-symlinks` flag that copies a symlink target's bytes into the published tarball (within a safe boundary), so authors can reuse files from elsewhere in the repo.

### Improvements

* **Workspace Scoping for Reviews** - `tessl review view` and `tessl review retry` now accept `--workspace` / `-w`, and `--last` resolves the most recent run within that workspace.
* **Publish OIDC Warning** - When publishing from GitHub Actions without an OIDC token permission, the CLI now warns instead of failing opaquely.

### Bug Fixes

* Fixed `tessl skill review --threshold 0` incorrectly emitting a "Skill validation failed" error.

## 0.87.0

### Breaking Changes

* **Skill review now requires a Tessl account.** Both `tessl review` and the older `tessl skill review` now require authentication: sign in with `tessl login`, or set a `TESSL_TOKEN` API key in the environment for CI. Reviews run on Tessl's servers, so anonymous review runs are no longer supported.

### Deprecations

* **`tessl skill review` is deprecated - use `tessl review` instead.** `tessl review` (alias `tessl review run`) is the replacement: an async, server-side review with companion `view`, `list`, `retry`, and `fix` commands. The old command still runs for now but prints a deprecation warning on every run and will be removed in a future release. Replace `tessl skill review <path>` with `tessl review <path>`.

### New Features

* **`tessl review` is now fully launched as an end-to-end workflow** - review runs are first-class in the CLI with `run` as the default subcommand, and companion commands to view, retry, and fix reviews directly from the terminal.
* **Flexible reviewer selection** - you can target a specific reviewer with `--review-plugin` or use your workspace's default reviewer configuration.

### Improvements

* **Richer review output for debugging and automation** - `tessl review view` now renders dynamic judges per run, and review JSON includes reviewer/plugin identity metadata.
* **Clearer `tessl eval view` output** - run labels are shown and scenarios are sorted for easier reading.
* **More informative `tessl eval run` start output** - pre-run context details are surfaced before execution.

### Bug Fixes

* **Review command reliability fixes** - `tessl review list`, `view`, and `retry` now resolve workspace names correctly, and `--json` without `--workspace` now returns a clear error.
* Fixed completed scenario counts in multi-solution eval runs.
* Fixed evaluator failures caused by repeated plugin installation arguments.

## 0.86.0

### New Features

* **Customise the eval-scenarios run when publishing** - added `--eval-scenarios <scenario-search-path>` to `tessl plugin publish` / `tessl skill publish`. The default is `./evals` in the directory of the plugin being published.

### Improvements

* **Default eval model** is now DeepSeek v4 Flash.
* **`tessl eval list --context-type`** - filter eval runs by the type of context injected into scenarios for the "with context" variant.
* **Richer `tessl eval view`** - clearer variant labels, an injected-context block, scenario paths, and repo/plugin provenance.
* `tessl eval run` echoes the scenario search directory and count before starting.
* Commit-fixture uploads are grouped and deduped to remove some cases where redundant context was uploaded.
* Install source policy: git-source allowlist, with denial messages that name the offending source.
* You're prompted to accept pending invites before a personal org is created.

## 0.85.0

### Breaking Changes

* **tessl eval run --agent is now single-valued** - Previously `--agent` was repeatable and each value created a separate eval run. It now accepts a single agent; run the command once per agent to compare.
* **Removed legacy eval-run context flags** - `--variant`, `--context-ref`, and `--context-pattern` have been removed from `tessl eval run` in favour of the new `--context` selection (see below).

### New Features

* **Skill Inventory** - Skill Inventory gives you a living map of every skill in your GitHub org - what exists, where it's used, and where you're duplicating effort. Run the initial import with `tessl inventory import` and it scans your repos, collects your skills and manifests, and gives you a snapshot of your whole inventory. Run it again any time - each scan is diffed, so you get a living view of what's new, unchanged, and removed over time.
* **Context Selection for tessl eval run** - A single `--context <path>` front door now picks the context under test, with `--context-commit` to source it from a commit and `--skill` (repeatable) to narrow a local plugin to specific skills.
* **Control Baseline by Default** - `tessl eval run` now always runs a control variant to compare against, with `--skip-baseline` to opt out.
* **Secrets injection for plugin evals** - `tessl eval run` now accepts `--env-file <path>`. Variables in the file are encrypted client-side and delivered into the eval sandbox, where they are available to `setup.sh` scripts and the agent. See [Passing secrets to an evaluation](/improving-your-skills/evaluate-skill-quality-using-scenarios.md#passing-secrets-to-an-evaluation).
* **--child Flag for Nested Projects** - tessl project create now requires `--child` to create a project nested inside an existing one, and blocks with a clear explanation when a parent project is detected in an ancestor directory.
* **tessl version** - Bump a plugin's version locally without publishing, like `npm version`. Pass `patch`, `minor`, or `major` to increment the current version following semver, or an explicit version (e.g. `tessl version 2.1.0`) to set it directly. Updates the plugin manifest in place; an optional path argument targets a directory other than the current one.

### Improvements

* **Clearer Install Output** - `tessl install` now shows only the dependencies you explicitly requested on the success line; incidental re-installs are summarised as a dim `Synced: N count`.
* **tessl scenario generate workspace resolution** - Workspace is now resolved from your linked Tessl project (`tessl.json`), the `--workspace` flag, or an interactive prompt — instead of being derived from the tile manifest name, which caused confusing 403 errors when the manifest used the `local/ prefix`. The `--workspace` flag is now accepted for tile-based generation.

## 0.84.0

### New Features

* **Bootstrap Project Create** - `tessl project create` now works in directories that don't yet have a `tessl.json`, bootstrapping it as part of the create flow.
* **Personal GitHub Account in Skill Inventory Import** - `tessl skill inventory import` can now authenticate with a personal GitHub account, not just org-level credentials.
* **Plugin Marketplace Discovery** - Tessl now classifies `.claude-plugin/marketplace.json` as a first-party manifest, picking up plugins from that location.

### Improvements

* **Warning for Large-Scale Eval Runs** - `tessl eval run` now prompts a confirmation before launching large eval batches.
* **Plan-Entitlement-Gated Model and Agent Selection** - model and agent selection respects plan entitlements with clearer messages when a selection isn't available.
* **Age-Gated Registry Sources Fallback** - registry sources blocked by release-age policy can now resolve to an older fallback source rather than hard-blocking.

### Bug Fixes

* Fixed `tessl install` to fast-fail on private or missing git repositories instead of silently succeeding with a hidden failure.
* Fixed the judge-results display to show the correct score denominator in both CLI and frontend.

### Windows installer (new distribution channel)

Signed Windows installers are now available for direct download. The Inno installer wraps a signed `tessl.exe` bundled with `TESSL_DISABLE_UPDATE` (winget will manage updates):

* <https://install.tessl.io/installers-windows/0.84.0/TesslSetup-0.84.0-x64.exe>
* <https://install.tessl.io/installers-windows/0.84.0/TesslSetup-0.84.0-arm64.exe>

The signed package will be installable directly via `winget install tessl.tessl` as soon as it will be approved by Microsoft

## 0.83.0

### New Features

* \*\*Jujutsu Repo Support - `tessl project repair` now detects and handles `jj`-managed repositories alongside Git.
* Finer Eval Run Controls - `tessl eval run` adds two independent opt-outs: `--skip-forced-context-activation` and `--skip-scoring`. Use them on their own or together to control whether the run forces context activation and whether the rubric scorer fires.

### Improvements

* Solver and Scorer Flag Deprecation - The `--solver` and `--scorer` flags on tessl eval run are now hidden but still functional, with a one-line deprecation warning; prefer the new `--skip-*` flags.

### Bug Fixes

* \*\*Removed a vendor-native plugin-manifest ingestion path that could pick up stale manifests outside the expected resolution flow.

## 0.82.0

### Improvements

* **Install Policy Enforcement** - `tessl install` now honors org-configured release-age and commit-age policies. For registry sources, the CLI automatically falls back to an older version that satisfies the policy (with a clear reason in the install output) or hard-blocks if no version qualifies. For git sources, it resolves to the most recent commit old enough to satisfy the minimum commit-age policy instead of installing HEAD.
* **Policy-Aware `tessl outdated`** - Versions blocked by a release-age policy are now annotated as `[release age policy]` in the update table, and git sources show the latest age-compliant commit as the recommended update so you can see what will (and won't) be installed before running `tessl update`.

## 0.81.3

### Improvements

* **Eval Failure Reasons** - `eval run` and `eval view` now display the reason when a run fails (e.g. quota exceeded), instead of a bare failure marker
* **Eval Default Model Notice** - A one-time notice informs you that the default eval model is now GLM 5.1, with guidance on selecting a different model
* **Resilient Eval Polling** - `eval run` now rides out transient server errors and network blips while polling, instead of reporting a completed run as failed
* **Clearer Validation Errors** - Manifest schema errors are now rendered in a readable format instead of a raw JSON dump
* **MCP Tool Updates** - The `new_tile` MCP tool is renamed to `new_plugin`, and the `outdated` tool now accepts a `projectDir` parameter to check a specific directory

### Bug Fixes

* Fixed `plugin pack` failing with a missing `tile.json` error for plugins created with `plugin new`; migrated plugins also no longer pack from the stale legacy manifest
* Fixed `eval run` evaluating the stale legacy `tile.json` instead of `.tessl-plugin/plugin.json` when both manifests are present
* Publishing a migrated plugin now errors if `tile.json` declares `private: true` but `plugin.json` omits it, preventing a private plugin from accidentally going public
* Fixed broken documentation links shown after `plugin new` and `skill new`
* Removed misleading advice pointing at `tile.json` from the "no content" validation error

## 0.81.2

### Bug Fixes

* **`scenario generate`: Clearer Error When No Manifest Found** — Running `tessl scenario generate` in a directory with no manifest previously crashed with a confusing `ENOENT: tile.json` error. It now shows a clear message pointing you to add a `.tessl-plugin/plugin.json`.

## 0.81.1

### Bug Fixes

* Fixed `skill publish` incorrectly triggering the import wizard when `plugin.json` already exists
* Fixed `skill publish --bump` not writing the bumped version to `plugin.json`, causing the old version to be published
* Fixed `skill publish` pre-publish version checks reading from `tile.json` instead of `plugin.json`

## 0.81.0

### New Features

* **Tiles are now Plugins** - This release completes the switch from Tiles to Plugins. The CLI now uses "plugin" across every command, help listing, flag description, and message. For more information on how to migrate from Tiles to Plugins, [there is a guide in the documentation](https://github.com/tesslio/monorepo/tree/main/apps/docs/use/tile-to-plugin-migration.md).
* **Full moderation status in `plugin info`** - `plugin info` now shows the complete moderation state for a published version (pass, pending, skipped, fail, or error).

### Improvements

* **`ls` shortcut** - `tessl ls` now works as a shortcut for `tessl list`, mirroring the existing `i` → `install` shortcut.
* **Workspace-scoped uploads** - Eval-related uploads (scenario tarballs, plugin archives, repo archives) are now scoped to the active workspace, so teammates in the same workspace can access uploads created by other members.

### Bug Fixes

* Eval run links now point directly to workspace-scoped URLs, skipping the redirect members previously hit when clicking through.
* `scenario generate` now works in plugin-only directories (a `.tessl-plugin/plugin.json` with no `tile.json`), which previously failed with a "tile.json not found" error.
* The CLI no longer fails to start when its log file can't be written (e.g. in sandboxed or read-only environments) — file logging is now best-effort.

## 0.80.0

### New Features

* **Eval Enablement Checks** - `tessl scenario generate`, `tessl tile publish`, and `tessl skill publish` now pre-flight check whether the target workspace has evals enabled. Scenario generation fails fast with a clear message; publish still succeeds but cleanly skips the eval upload with a single info line.

### Improvements

* **Cleaner Publish Output** - `tessl tile publish` no longer prints validation warnings twice (once from pre-publish validate, once from pack).
* **Clearer Forbidden Errors** - When creating a project fails because the workspace doesn't exist or you lack permission, the CLI now shows an actionable message instead of a generic `403 Forbidden`.
* **Skill Install Paths** - Skills are no longer written under `.gemini/skills`; installation routes through `.agents/skills`, and any legacy `tessl:*` / `tessl__*` entries left in `.gemini/skills` are cleaned up automatically.

### Bug Fixes

* `tessl tile new` now preserves the rule description you provide instead of overwriting it with a `TODO` placeholder.
* Generated `RULES.md` now ends with a trailing newline.

## 0.79.1

### Improvements

* **Clearer Guidance for Missing Project Links** - When a linked Tessl project can't be found or isn't accessible, the CLI now surfaces actionable next steps with specific `tessl project create` and `tessl project repair` commands instead of a raw 404. The `tessl eval run` help text now also explains that eval runs are saved to a Tessl project.

## 0.79.0

### New Features

* **OpenHands agent support (alpha)** — `tessl init`, `tessl install`, and `tessl run` now recognise OpenHands. Auto-detection follows the standard project → home → PATH ladder; OpenHands is excluded from the interactive picker while in alpha but can be selected explicitly via `--agents openhands`.
* **`tessl search --global`** — install search results into `~/.tessl/` without requiring a project to be initialised. Short form `g` available.
* **`tessl eval run --list-agents`** — print the supported `<agent>:<model>` catalogue (with the default marked) without running an eval. Supports `--json` for scripting.
* **`tessl project` -** Tessl now supports workspace-backed projects in the CLI, giving your local work a persistent project identity for evals and other project-based workflows. Use `tessl project create` to create a project, `tessl project link` to connect an existing one, and `tessl project repair` to fix broken project links.
* **`tessl eval run --scorer-agent`** — override the agent and model used for the score step (as `agent:model`), while the solver agent stays unchanged. `tessl eval view` shows the override under a `Scored by:` line.
* **`tessl eval run --quality-check`** — opt-in flag that asks the backend's LLM judge to filter out misleading scenarios (low feasibility, rubric leakage, low value) before solve and score. Excluded scenarios show up under a red `✗ Excluded by quality check` line in `tessl eval view`. `tessl tile publish --with-scenario-quality-check` enables the same filter for the eval that runs as part of publishing.

### Improvements

* **Simpler `tessl skill import` / `skill new`** — no longer prompts for workspace or visibility; defaults to `local` workspace and `private` visibility. Pass flags explicitly to override.
* **Scenario config (`scenario.json`)** — declarative working-directory setup for evals. Declare `fixtures` to install (commit or directory), `include` paths to copy in verbatim, and `setup` scripts to run after install. Conventional defaults (`resources/` auto-included, `setup.sh` auto-run) mean most scenarios need no `scenario.json` at all. `tessl scenario generate` now produces a `scenario.json` for every generated scenario, plus any supporting input state (e.g. `resources/`) when the source commit needs it. Setup scripts are off by default per workspace — contact Tessl to enable.
* **Cleaner install error messages** — local paths missing the `file:` prefix now surface a clear validation error instead of a generic parse failure.
* **Softer security-review copy** — surfaces showing a per-skill security status now display "No security review available." instead of "Security review has not been run yet."
* `tessl skill review` **includes referenced skill content** — skill reviews now include all referenced content and scripts for logged-in users.

### Bug Fixes

* **Install exits non-zero on failure** — `tessl install` and `tessl install --global` now reliably propagate tile install failures as command failures (non-zero exit code).
* **`tessl scenario generate <relative-path>`** — relative paths like `tiles/foo` are now correctly routed to the tile flow when the directory exists locally, instead of misrouting to the repo flow and erroring on missing `-commits`/`-prs`.
* **`tessl tile lint`** — `@decorator` tokens in markdown headings and YAML frontmatter are no longer treated as hard-link references and no longer produce false-positive lint warnings.
* **MCP install bootstrap message** — the "Initialising new tessl project at …" message no longer prints during bulk sync installs that don't actually write `tessl.json`.
* **Experimental agent detection** — explicit project-level usage of experimental agents (e.g. OpenClaw workspace markers) is now respected ahead of the experimental gate, and the default install flow no longer force-enables experimental agents.

## 0.78.0

### New Features

* **Activation Solver for Evals** - `tessl eval run --solver=activation` measures which skills activate for each scenario, and `tessl eval view` renders the results in a per-scenario activation table
* **Set Project Name on Init** - `tessl init` accepts a new `--name` flag to set the project name in `tessl.json` at creation time
* **Target Org on Workspace Create** - `tessl workspace create` now accepts a `--org-id` flag to associate a workspace with a specific organization
* **List Organizations** - New `tessl org list` command displays the organizations you belong to
* **Scenario Quality Checks for Evals** - `tessl eval run --quality-check` will filter out scenarios that would give misleading results, based on a quality assessment that looks for things like “criteria leaking into the task” or “task duplicating information from the skill it is meant to exercise”

### Improvements

* Clearer Eval Run Status - Pending and in-progress eval and generation runs render as yellow "In Progress" with elapsed time, instead of an ambiguous "Pending"
* Better Invalid Manifest Errors - tessl eval run against a directory with a malformed tile.json now reports the manifest error directly with a hint to fix it, instead of falling through to the scenarios flow
* Removed Eval Compare - tessl eval compare has been removed. Use tessl eval view and tessl eval list instead
* Global Install from Search - `tessl search` now supports `--global` so selecting a result installs it to `~/.tessl/` instead of the current project

### Bug Fixes

* Fixed tile rule creation to safely handle prompts containing `/` so they no longer create unintended nested paths in the generated rule files

## 0.77.0

### New Features

* **Experimental Windows Support** - The Tessl CLI is now available on Windows as an experimental release. Install it with PowerShell:

  ```powershell
  irm https://install.tessl.io/scripts/latest.ps1 | iex
  ```
* **Eval Setup Scripts** - Eval scenarios support a new `setup` field in `scenario.json` — an ordered array of script paths that run after fixtures and includes are installed, before the solver agent starts.

### Improvements

* **Cleaner Top-Level Help** - Simplified top-level CLI help.

## 0.76.0

### New Features

* **Eval Progress Bars** — `eval run` and `eval view` now show real-time per-scenario progress bars with colour-coded status (complete, active, queued)
* **Directory Fixtures in Evals** — Scenarios can now declare `include` paths for directory-based fixtures, alongside existing commit-based fixtures.
* **"latest" Dependency Version** — Use `"latest"` as a dependency version in `tessl.json` to always resolve the most recent published version
* **Uninstall Individual Skills** — `tessl uninstall --skill <name>` removes specific skills from a dependency instead of removing the entire tile
* **Verifiers in Tile Packing** — The `verifiers/` directory is now included when packing tiles (when evals are enabled)
* **Failed Security Review Visibility** — Security reviews that failed to run are now shown as "failed" instead of appearing as "pending"

### Improvements

* **Project Name from Directory** — `tessl init` now derives the project name from the directory basename instead of using a generic default
* **Archive Without Version** — `tessl archive` now works without a version suffix, allowing you to archive all versions of a tile at once
* **Eval Agent/Model Display** — `eval view` now shows the agent and model for all eval run types
* **Workspace Commands** — `-user` flag renamed to `-username` , `-user` still works with a deprecation warning
* **Help Text Corrections** — Improved descriptions for `install --skip-init`, `tile pack`, `skill import`, and `config set`

### Bug Fixes

* Fixed eval scenario path resolution when base directory is "."
* Fixed eval git diff ignoring user's custom diff tool configuration
* Fixed object metadata serialization in eval debug output

### Breaking Changes

* **Removed `--project-dependencies`** — The `--project-dependencies` flag has been removed from `tessl install` and `tessl init`. Dependency scanning and automatic tile matching are no longer part of the install flow. Use `tessl search` to find relevant tiles instead.

## 0.75.0

### New Features

* **API Key Management** — New `api-key` command group with `create`, `list`, and `delete` subcommands for managing workspace-scoped API keys. Supports both interactive and non-interactive (scripting) modes
* **Auto-Select Single Workspace** — When you're a member of only one workspace, the CLI now skips the workspace selection prompt and selects it automatically

### Breaking Changes

* **`auth token` Removed** — The `auth token` command has been removed. Use the new `api-key create`, `api-key list`, and `api-key delete` commands instead for workspace-scoped API key management

## 0.74.0

### New Features

* **Machine-Readable Search**: `tessl search --json` flag outputs results in JSON format for scripting and automation
* **Skill Review Threshold**: `tessl skill review` now supports a `--threshold` option: when the score is below this threshold, the command will fail - helpful for CI use cases
* **Scores in Search & Info**: Search results and `tessl tile info` now display quality scores and security review details

### Improvements

* **Piped Token Output**: `tessl auth token` now suppresses the spinner and hints when output is piped, making it easier to use in scripts
* **Better Error Display**: Failed operations now render a red cross indicator for clearer error visibility
* **Search Column Alignment**: Interactive search results now have properly aligned columns
* **Remove Steering to Use `query_library_docs` MCP tool**: It was getting in the way of skill activation from some users. You can manually opt-in to install the rules yourself with `tessl install tessl/cli-setup`

### Bug Fixes

* Fixed skill review API calls failing due to stale authentication tokens
* Fixed eval commands resolving git repo root incorrectly when run from subdirectories

## 0.73.0

### **New Features**

* **Security Reviews on Install** - `tessl install` and `tessl update` now show security review results before installation. CRITICAL/RISKY findings require confirmation to proceed, ADVISORY findings show an advisory after install, and unscanned items display a warning. Use `-dangerously-ignore-security` to bypass prompts in CI/scripted contexts
* **Commit-Pinned Installs** - `tessl install` now accepts `github:<repo>@<sha>` and full GitHub commit URLs, allowing you to install a skill at a specific commit. A post-install hint directs to `tessl update` for future updates
* **Publish `--bump` Flag** - `tessl tile publish` and `tessl skill publish` now accept `--bump patch|minor|major` to auto-increment the version when the current version already exists in the registry
* **`.agents/skills` Directory Support** - Install skills in `.agents/skills` alongside other requested agents since that’s the folder many tools are aligning with

### **Improvements**

* **Grouped Search Results** - `tessl search` now groups results by type (Tiles / Skills) with section headers when both types are present

### **Bug Fixes**

* Fixed `tessl skill new` showing interactive prompts even when all required flags (`-name`, `-description`, `-workspace`) are provided
* Fixed MCP server processes becoming orphaned when the parent process disconnects (stdin closes)

## 0.72.0

### **New Features**

* **Pre-Publish Validation & Dry Run** - Tile and skill publish commands now validate permissions, workspace, and version availability before publishing, with clear pass/fail output. Use `--dry-run` to check without actually publishing.
* **Security Scores in Search** - Search results now display security assessment levels (Passed, Caution, Risky, Critical) alongside tile scores

### **Improvements**

* **Smarter Eval Scenario Generation** - Existing scenarios are now considered when generating new ones, avoiding duplicates
* **Large File Exclusion in Eval Archives** - Files over 10MB are automatically excluded from repo archives during eval runs
* **Eval Commit Ref Validation** - Commit refs are validated before archive creation, with clear error messages for missing refs

## 0.71.0

### New Features

* **Support for Copilot in VSCode** — Skills, rules, and our MCP server can be automatically set-up for vscode
* **Eval Run Labels** — New `--label` / `-l` flag on `tessl eval run` lets you attach a short description to a run. Labels appear in `tessl eval list` and the Tessl web UI, making it easier to identify what you were testing across multiple runs.
* **Eval Variant Selection** — New `--variant` flag on `tessl eval run` lets you run only a specific variant. Pass `--variant without-context` to run the baseline only (useful for iterating on scenario quality without affecting the with-context comparison), or `--variant with-context` to skip the baseline.
* **Local Repo Eval Runs** — Project evals can now run against local git repos without SCM integration; the CLI archives and uploads the repo automatically
* **Smarter Scenario Generation** — `tessl eval generate` now avoids duplicating existing scenarios when generating new ones; `--count` specifies how many new scenarios to add

### Bug Fixes

* Allow installation of skills from unknown dot folders in GitHub repositories (e.g., `.agent-skills/`)

## 0.70.1

### Improvements

* **Non-Interactive Mode for Evals & Scenarios** — `tessl eval run` and `tessl scenario generate` now print the run/generation ID and URL immediately when running non-interactively, instead of polling for completion
* **Clearer Help Text** — `tessl eval run` and `tessl scenario generate` now show which flags are mode-specific, and invalid flag combinations are rejected with helpful messages

### Bug Fixes

* **Fixed install --watch-local exiting prematurely** — the process now stays alive until Ctrl+C and updated output to show relative paths rather than absolute ones
* **Fixed installation from `file:`** **source to exclude .git directories** - It now installs the same files that would be captured by `tessl tile pack` or `tessl tile publish`

## 0.70.0

### New Features

* **Local Tile Watching** — New `--watch-local` flag on `tessl install` watches local file-source tiles for changes and automatically reinstalls tiles, streamlining the tile development workflow
* **Search Score Display** — `tessl search` results now show aggregate quality and impact scores with color-coded badges
* **Scenario Generation from PRs** — New `--prs` flag on tessl scenario generate accepts PR numbers as an alternative to `--commits`
* **Multiple Scenario Downloads** — `tessl scenario download` now accepts multiple space-separated IDs (e.g., `tessl scenario download id1 id2`)
* **Eval Run Repeats** — New `--runs / -n` flag on `tessl eval run` to repeat each agent configuration multiple times
* **Eval Polling for Tile Evals** — Tile evals now poll for completion instead of returning immediately, with Ctrl+C to detach gracefully
* **Eval JSON Output for Tile Evals** — `--json` flag on `tessl eval run` now works for tile evals, outputting run ID, tile name, and scenario count
* **Eval Agent Flag** — New `--agent` flag (format: `agent:model`) replaces `--model` for tile evals, aligning with project eval conventions
* **Eval Cost Metadata** — `tessl eval view` now displays cost, runtime, turns, and token usage below each solution
* **Eval Agent/Model Display** — `tessl eval view` stats now show the agent and model used for each solution
* **`--last` for Eval Debug & Retry** — `tessl eval debug` and `tessl eval retry` now support `--last` for quick access to the most recent eval run
* **Repository Metadata in tile.json** — Tiles now support an optional repository URL field in their manifest

### Improvements

* **Tile Cache Protection** — Tile authoring commands now warn when operating on paths inside `.tessl/tiles/`, preventing accidental edits that would be overwritten on the next install
* **Cleaner Help Text** — Removed meaningless `--no-{flag}` negated boolean flags from all commands, improved flag capitalization, and reordered commands for logical grouping
* **Consistent Scenario Terminology** — "Generation run" renamed to "generation" throughout the CLI for simpler, more natural language
* **Scenario Generate Table Output** — `tessl scenario generate` results now render as a formatted table with Scenario ID and Commit ID columns
* **Smarter Binary Install** — Skips re-downloading binaries that already exist and pass validation; corrupt binaries are automatically cleaned up

### Fixes

* Fixed CLI crashes when output streams disconnect unexpectedly (EPIPE handling)
* Fixed `unpublish` help text to reflect the correct 2-day timeframe (was showing 2 hours)

## 0.69.0

### New Features

* **Scenario Generation Commands** - New `tessl scenario` command suite for generating and managing test scenarios. Generate scenarios from tiles or repository commits (`tessl scenario generate`), download them to disk (`tessl scenario download`), and track generation runs (`tessl scenario list`, `tessl scenario view`)
* **Global Tile Installation** - Install tiles globally with `tessl install --global` to make documentation and skills available across all your projects.
* **Eval Variant Comparison** - `tessl eval run` now supports running evaluations with multiple agent variants and context patterns, with automatic detection of tile vs. project scenario sources

### Improvements

* **Project Directory Hints** - `tessl init` and `tessl install` now display a helpful hint when the target project directory differs from your current working directory

### Bug Fixes

* Fixed a crash when piping CLI output to another command (e.g., `tessl list | head`) by gracefully handling broken pipe signals
* Fixed markdown link validation incorrectly parsing non-markdown files during tile linting

## 0.68.0

### New Features

* **GitHub Copilot CLI Support** — Tessl now recognizes GitHub Copilot CLI as an agent, with automatic detection, rules wiring via `AGENTS.md`, skill installation, and MCP configuration
* **Search Type Filtering** — `tessl search` now accepts a `--type` flag to filter results by content type (skills, docs, or rules)
* **Skill Review Auto-Accept** — `tessl skill review --optimize` now supports a `--yes / -y` flag to skip the confirmation prompt and auto-apply improvements

### Improvements

* Automatic Binary Cleanup — Old CLI binary versions are now automatically cleaned up after updates, keeping only the current version and one rollback
* Short SHAs for Git Tiles — `tessl list` and `tessl doctor` now display short SHAs for git-sourced tiles instead of full commit hashes
* Command Detection Timeout — Command lookups now have a 1-second timeout to prevent indefinite hangs during agent detection

### Breaking Changes

* `tessl skill search` Removed — Use `tessl search` --type skills instead

### Bug Fixes

* Fixed `tessl skill review --optimize` failing with a raw 401 error when not authenticated — now shows a clear login prompt
* Fixed `unpublish` help text to reflect the correct 2-day window (was incorrectly showing 2 hours)

## 0.67.0

### **New Features**

* Skill Optimization - `tessl skill review --optimize` now applies feedback from the review to generate an updated SKILL.md file
* Evaluation Type Support - `tessl eval list` now displays all evaluation types (tile, repo, skill) with a new "Type" column and `--type` flag to filter by evaluation type
* Filter Evaluations by Status - `tessl eval list` now supports a `--status` flag to filter runs by status (pending, in\_progress, completed, failed)

### **Bug Fixes**

* Fixed `tessl skill review` returning exit code 0 on validation failure — it now correctly returns a non-zero exit code, enabling proper CI/CD integration
* Fixed `tessl api --input` - sending incorrect Content-Type when piping JSON via stdin

## 0.66.0

### New Features

* **`outdated` command** — Check installed tiles for newer versions, showing current, safe update, and latest version info
* **`update` command** — Update tiles to newer versions. Use `--yes` for all, and `--force` to include breaking updates

## 0.65.0

### Bug Fixes

* **Windows Compatibility for Generated Files** - Fixes generated file and directory names containing colons (`:`) which are invalid in Windows file paths. Tile files committed to git repositories can now be cloned on Windows without errors. Existing installations are migrated automatically

## 0.64.0

### New Features

* **Local Tile Evaluation** - Run evals against your tiles directly from the CLI with `tessl eval run` and get a fast feedback loop for improving your tiles
* **Eval Results in Terminal** - View eval results with per-scenario breakdowns, variant comparisons, and scoring summaries using `tessl eval view`
* **Eval Run History** - List recent eval runs filtered by workspace, tile, or author with `tessl eval list`
* **Eval Retry** - Re-run failed evals with `tessl eval retry`

## 0.63.4

### Improvements

* **Internal** - Stability improvements

## 0.63.3

### New Features

* **Local Path Support for Tile Info** - `tessl tile info` now accepts a local directory path as an argument and defaults to the current directory when no argument is provided, making it consistent with other tile commands like `publish` and `lint`

### Improvements

* **Better Publish Messages** - After publishing tiles or skills, the CLI now displays the published resource URL and a note about moderation timelines

### Bug Fixes

* Fixed MCP configuration failures when using `npx tessl` by ensuring the tessl binary is accessible via the PATH during `init`

## 0.63.2

### Bug Fixes

* Fixed circular reference issues when `CLAUDE.md` and `AGENTS.md` are symlinked

## 0.63.0

### Improvements

* The CLI is now distributed as a native binary instead of a bundled Node.js package

## 0.62.2

### New Features

* **Optional Authentication** - You can now use `tessl init`, `tessl install`, and `tessl search` without logging in. Public tiles are accessible to everyone, while private tiles will show helpful hints to log in when needed

### Bug Fixes

* Fixed `--skill` flag not working correctly when installing a single skill from a local tile with multiple skills

## 0.62.1

### Improvements

* **Internal** - Stability improvements

## 0.62.0

#### New Features

* Unified Search — `tessl search` now returns both tiles and skills in a single view, with visual badges showing content types (\[docs], \[skills], \[rules]) and skill provenance
* Tile Evaluations — New tessl eval command group for evaluating tiles:
  * `tessl eval run [path]` — Run evaluations on local tiles
    * `--force` flag to re-run all evaluations including previously solved cases
  * `tessl eval list` — View recent eval runs with status
  * `tessl eval view-results <id>` — View detailed results with color-coded scores and assessment tables
    * `--last` flag to quickly view most recent eval results
  * Git metadata (branch, commit, dirty state) automatically attached to eval runs
* Tile Info — New `tessl tile info <name>` command to view tile metadata, verification status, and moderation status
* Skills in MCP Context — The `query_library_docs` MCP tool now includes installed skills when building knowledge context

#### Improvements

* Redesigned Help for `tessl -h` — Commands are now grouped by category with improved formatting and readability
* Publish Workspace Context — Publishing now shows the target workspace name before uploading

#### Bug Fixes

* Fixed `--skill` flag being ignored when installing skills from registry tiles
* Fixed re-installing tiles not updating the manifest with new skill selections
* Fixed tile lint incorrectly flagging files as orphaned when linked via `@path.md` includes

## 0.61.4

### Improvements

* **Install `--yes` Flag Behavior** - The `--yes` flag now auto-selects all skills when installing from GitHub, even in interactive mode. Previously it only worked in non-interactive environments.
* **Non-Interactive tile new** - The tessl tile new command can now run fully non-interactively when all required flags are provided, making it easier for scripts and agents to use.

### Fixes

* **GitHub Skill Installation Bugfixes** - Address various edge cases that prevented some skills being installed from GitHub
* **GitHub Skill Installation Respects Pinned Version** - Fixed an issue that meant we always installed a skill from a repository's trunk rather than the commit sha in `tessl.json` when doing `tessl install`

## 0.61.3

### Improvements

* **Faster git installs** - Git dependencies are no longer re-downloaded on every install when already at the correct version

## 0.61.2

### Improvements

* **Windows Platform Detection** - The CLI now detects Windows and provides a clear error message directing users to use WSL instead
* **Lenient GitHub Skill Installation** - Skills from GitHub with missing referenced files or minor schema issues now install with warnings instead of failing completely
* **Better Warning Display** - Installation warnings are now grouped by tile name with count summaries (e.g., "3 content warnings in github:user/repo")
* **Verbose Install Output** - Added `--verbose` (`-v`) flag to `tessl install` and `tessl skill search` commands to display detailed warning messages during installation

### Bug Fixes

* Fixed skill validation warnings showing absolute temp directory paths instead of relative paths
* Fixed installation failures when GitHub skills have invalid optional frontmatter fields (e.g., `allowed-tools` as array instead of string)

## 0.61.1

### New Features

* **Skill Commands** - Added a complete set of dedicated skill management commands: `tessl skill new`, `tessl skill import`, `tessl skill lint`, `tessl skill publish`, `tessl skill review`, and `tessl skill search`. Skills are now first-class citizens with their own command group for easier discovery and management.
* **GitHub Installation Support** - Install tiles and skills directly from GitHub repositories using `tessl install github:user/repo` or full URLs. Supports branch selection, subdirectories, and interactive skill selection. Git sources are pinned to commit SHAs for version stability.
* **Skill Search** - Discover available skills across the Tessl ecosystem with the new interactive `tessl skill search` command. Search returns both external skills from GitHub and tiles containing skills, with interactive selection and installation.
* **Skill Review** - Evaluate skill quality with `tessl skill review`, which validates [SKILL.md](http://skill.md/) files and provides LLM-based scoring across multiple dimensions with actionable suggestions for improvement. Supports both local paths and GitHub URLs.
* **Non-Interactive Mode** - Commands now auto-detect TTY availability and work in CI/CD pipelines and with AI agents. When required flags are missing in non-interactive environments, commands provide clear error messages pointing to available options.
* **Selective Skill Installation** - Choose specific skills when installing tiles using the new `include.skills` manifest field in tessl.json. Reduces clutter in agent directories by only activating the skills you need.
* **Codex Support** - Full support for Codex as a core agent alongside Claude Code, Cursor, and Gemini. Includes project detection, MCP configuration, steering, and skills synchronization.
* **Gemini Production Ready** - Gemini agent is no longer experimental and fully supported in production workflows.

### Improvements

* **Simplified Skill Naming** - Skill directories now use cleaner names (`tessl:<skill>` instead of `tessl:<workspace>:<tile>:<skill>`) and are symlinked rather than copied for better performance and consistency.
* **Automatic Eval Publishing** - Evals are now published by default when running `tessl tile publish` or `tessl skill publish`. Use `-skip-evals` to opt out. Published evals automatically trigger evaluation runs.
* **Better Skill Discovery** - Improved skill detection uses a three-step process (root check, priority directories, full scan) with optimizations that reduce scan time and exclude build/cache directories.
* **Streamlined Publishing** - The `tessl skill publish` command no longer asks redundant "will you share this?" prompts since publishing inherently means sharing.
* **Improved Help Text** - Updated `tessl init --agent` to list all supported agents (claude-code, codex, cursor, gemini) and clarified that `tessl install` accepts both registry tiles and GitHub URLs. Added `tessl i` as a shortcut alias.
* **Relative Paths in Manifest** - When creating tiles with `--install`, the CLI now stores relative paths in tessl.json instead of absolute paths, making projects portable across machines and directories.
* **Smarter CLI Setup** - The tessl/cli-setup tile is now only installed when your tiles have documentation, reducing overhead for steering-only projects.
* **Flexible Tile Content** - Tiles can now contain any file type, not just markdown files, allowing for configuration files, code examples, and other documentation formats.

### Bug Fixes

* Fixed skill review score display showing `/4` instead of the correct `/3` scale
* Fixed status command handling of non-semver versions for git-based and file-based tiles
* Fixed orphaned file detection for tiles with root-level skills - README.md and other root files are no longer incorrectly flagged as orphaned
* Fixed skill publish command to accept [SKILL.md](http://skill.md/) file paths directly instead of only directory paths
* Fixed file source tiles being incorrectly deleted as orphaned on repeated installs when dependency key differed from tile name
* Fixed skill frontmatter validation warnings during installation from external sources like GitHub
* Fixed `tessl skill new` output messages to reference correct tile directory paths
* Fixed skill selection in GitHub repos to require explicit choices, preventing accidental installation of all skills from large repositories

## 0.60.0

### New Features

* **Project Mode (Managed vs Vendored)** - Choose how tile content is managed in your project:
  * **Managed mode** - Tile contents are gitignored like `node_modules` (default for existing projects)
  * **Vendored mode** - Tile contents are committed to your repository (default for new projects)
  * Switch modes anytime by setting `"mode": "managed"` or `"mode": "vendored"` in `tessl.json`

### Improvements

* **Simplified Local Tile Dependencies** - Local tiles (using `file:` or `link:` sources) no longer require a `version` field in `tessl.json`. The CLI automatically reads versions from installed `tile.json` files. Existing manifests with both `version` and `source` are automatically migrated to the new format.

## 0.59.0

### New Features

* **`.tileignore` Support** - Exclude files from tile validation and packaging using gitignore-style patterns.

## 0.58.1

### Improvements

* **Tile Commands Auto-Detect** - `tessl tile pack`, `tessl tile lint`, and `tessl tile publish` can now be run directly from your tile directory without explicitly specifying the path

### Bug Fixes

* Squashed some bugs that were hiding in the codebase. They know what they did.

## 0.58.0

### New Features

* **Context Cost Analysis (Experimental)** - The `tessl doctor` and `tessl tile lint` commands now display estimated token costs for tile content loaded into agent context windows. This helps you understand which tiles contribute most to context usage and identify oversized content before publishing.
* **HTTP Proxy Support** - The CLI now works in proxied network environments by automatically detecting and using HTTP/HTTPS proxy settings from environment variables (`http_proxy`, `https_proxy`, `HTTP_PROXY`, `HTTPS_PROXY`). The CLI respects `no_proxy`/`NO_PROXY` bypass rules.

### Improvements

* **Enhanced Python Dependency Scanning** - Improved Python dependency detection with support for extras notation (e.g., `openai[aiohttp]>=1.52.2`) across requirements.txt, pyproject.toml, and `uv tree` output. The scanner now also automatically falls back to `pip3` when `pip` is not available, improving compatibility with macOS and Linux distributions.

### Bug Fixes

* Fixed Go package PURL validation to require the `v` prefix in version strings (e.g., `v1.9.3` instead of `1.9.3`), ensuring pkg.go.dev documentation links work correctly.
* Fixed false "broken link" warnings during `tessl tile lint` when markdown files contain URI schemes like `mailto:`, `tel:`, `ftp:`, or `data:`.

## 0.57.0

### New Features

* **Monorepo Subfolder Support** - The `tessl install --project-dependencies` command now scans dependencies from your current working directory, enabling you to run it from monorepo subfolders in an initialized project (e.g., `tessl init && cd backend && tessl install --project-dependencies`)

### Improvements

* **Smarter Documentation Tree** - The context tool now only includes files that are transitively linked from a tile's documentation entrypoint, filtering out orphaned files and making documentation discovery more focused

### Bug Fixes

* Fixed markdown link validation to properly handle anchors (e.g., `./guide.md#section`). The validator now validates both file existence and anchor validity, with clearer error messages for broken links

## 0.56.2

### Improvements

* **Internal** - Stability improvements

## 0.56.1

### Improvements

* **Observability Enhancements** - Improved telemetry infrastructure for better diagnostics and system monitoring

## 0.56.0

### Breaking Changes

* **Node.js 18 No Longer Supported** - The CLI now requires Node.js 20 or later. Node.js 18 reached end-of-life in April 2025 and is no longer supported. The CLI will now fail with a clear error message if you attempt to run it on Node.js 18.

### Improvements

* **Only Auto-Init Outside Existing Projects** - The `install` and `search` commands no longer automatically initialize a project when run in a subdirectory of a Tessl project directory. This prevents accidentally creating unwanted projects when running commands after changing directories. To initialize a project, explicitly run `tessl init` first.

### Bug Fixes

* Fixed an issue where the `init` command's failed to identify and install relevant tiles.

## 0.55.1

### Improvements

* **Faster Auto-Updates** - The CLI now checks for updates every 3 hours (down from 24 hours), ensuring you get critical fixes and improvements more quickly. You can still adjust the interval with `TESSL_AUTO_UPDATE_INTERVAL_MINUTES` or disable it by setting it to `0`.

## 0.55.0

### New Features

* **Updated Workspace Roles** - Workspace member roles have been updated to: `member`, `publisher`, `manager`, and `owner` (the `viewer` role has been removed)

### Bug Fixes

* Fixed authentication issue where API token authentication (`TESSL_TOKEN`) would fail after token refresh attempts, causing authenticated API calls to fail

## 0.54.0

### New Features

* **Tile Manifest Validation** - The `describes` field in tile manifests is now validated to ensure it contains a valid PURL (Package URL) format. Invalid PURLs or unsupported package types will show helpful warnings during `tessl tile lint`, `tessl tile pack`, and `tessl tile publish` operations

### Improvements

* **Project Directory Detection** - Improved project directory discovery logic allows the CLI to better locate your `tessl.json` even when running commands from subdirectories within your project

### Bug Fixes

* Fixed missing newline after `tessl list` output for better terminal formatting

## 0.53.0

### New Features

* **Go Modules Support** - Dependency scanner now detects Go projects and extracts dependencies from `go.mod` files
* **Auto-Init on Search** - When selecting a tile from search results, the CLI now automatically initializes the project if needed (creates `tessl.json`)
* **Dynamic Terminal Sizing** - Interactive prompts now adapt to your terminal height for better readability
* **Escape Key Cancellation** - Press Escape to cancel select/checkbox prompts

### Improvements

* **Smarter Context Tool** - When no documentation is found, the tool now suggests running a search to find relevant tiles
* **CI Environment Detection** - Auto-update and version checks are now automatically disabled in CI environments

### Bug Fixes

* Fixed tile installation failures when system temp directory is on a different filesystem (handles cross-device moves)

## 0.52.2

No changes in this release

## 0.52.1

### Improvements

* Homebrew installation now available for stable releases
* MCP server stability improvements

## 0.52.0

### New Features

* Added `tessl tile lint` command to validate tiles before publishing

### Bug Fixes

* Tile upgrades now properly clean up old files when installing new versions
* Fixed markdown link validation to skip code blocks in tile documentation

## 0.51.0

* MCP Tool Improvements
  * Renamed `get_library_context` tool to `query_library_docs` and updated descriptions for better clarity
  * Updated cli-setup steering tile version to reflect tool rename and improve adoption
* Tile Management
  * Added `tessl list` command to display installed tiles
* CLI UX
  * Improved CLI message spacing and copy for better readability

## 0.50.6

* Added the ability to `archive` and `unarchive` workspaces
  * Archiving a workspace allows you to non-destructively remove workspaces you no longer wish to use or see. Archiving a workspace also archives all tiles in that workspace. This means that users can still install those tiles if defined in their manifest, but will not otherwise see them in search etc.
  * Unarchiving, as you’d expect, shows a workspace once again. However, it does *not* unarchive tiles within the workspace, to avoid potentially unarchiving content that was previously archived before the workspace was.
* Fixed a bug when authenticating in multiple machines that would result in our MCP tool `get_library_context` only working on the last machine you authenticated.

## 0.50.5

We added a new `tessl tile pack` command which validates and builds a tarball for a tile. It can be useful to validate things before doing `tessl tile publish`.

Also fixed a bug where the CLI would fail to run when who signed up without a first or last name.

## 0.50.4

Fix `tessl tile publish` requiring an absolute path

## 0.50.3

This release marks a significant shift in focus. We've rebuilt the CLI from the ground up as an **Agent Enablement Platform**, pausing work on the Tessl Framework to concentrate on our registry functionality and agent integration.

We really appreciate all the feedback we have received so far. Please, keep it coming.

### What's Changed

#### Getting Started is Now Simpler

When you run `tessl init` in your project, it now automatically detects your dependencies and pulls relevant tiles from the registry. For teams already using tessl, new developers only need to install the CLI and grant MCP server permissions—everything else happens automatically when the MCP starts up.

#### Smarter Agent Integration

Instead of agents searching through generated documentation, they now use our new `get_library_context` MCP tool to query tiles directly. This requires logging in to tessl, but makes context retrieval much more efficient. The MCP tools also include `login` (for in-session authentication) and `status` (for checking project state).

Note: `KNOWLEDGE.md` is no longer generated since agents now pull context on-demand.

#### Command Reorganization

We've streamlined the command structure. Changes to existing commands:

* `tessl registry install|search` → `tessl install|search`
* `tessl registry sync` → `tessl install --project-dependencies`
* `tessl registry publish|unpublish|archive` → `tessl tile publish|unpublish|archive`
* `tessl version` → `tessl --version`

#### Release Channels & Auto-Updates

You can now choose between `latest` (default, stable) and `beta` (early access) channels. The CLI checks for updates hourly and auto-updates transparently (max once per 24 hours). Configure the interval with `$TESSL_AUTO_UPDATE_INTERVAL_MINUTES` or set it to 0 to disable.

#### New Commands

* `tessl doctor` - diagnose authentication, manifest status, detected agents, and dependencies (add `-json` for full dependency details)
* `tessl uninstall` - remove tiles from your project

### What's Removed

**The Framework functionality is no longer included.** If you need the full framework features, v0.28.0 remains available (though development is paused).

Currently, automatic setup only supports Claude Code and Cursor. We'll add other agents based on requests—in the meantime, you can manually configure the MCP with any agent.

***

**Note:** This is a major rewrite (v0.30.0 → v0.50.2). Existing workflows will need adjustment.

*(Updated Nov 27, 2025)*

***

## 0.28.0

### New Features

* Invoking `setup agent` via `npx` will now configure mcp to use tessl via `npx`, ensuring smoother setup for users without a global install.
* Added integration with Cursor IDE for automatic generation and application of steering rules from tiles.
* Added `tessl registry uninstall` to easily uninstall tiles.

### Improvements

* Improved error messages for the `add-member` command to enhance clarity.
* Improved `tessl status` output to better reflect post-generation changes.
* Aligned arguments for `tessl registry unpublish` and `tessl registry archive`.

### Bug Fixes

* Fixed detection of direct dependencies in the pip detector.
* Resolved issue where unsupported package managers showed unnecessary user-facing messages.
* Extended display name support to include PyPI and Maven packages.
* Removed outdated compatibility code for `specs.json`.

## 0.27.0

### New Features

* **New `tessl setup project-info` Command**: CLI-only users can use this command to add details that Tessl tools require to `AGENTS.md`.
* **Framework Initialization**: you can choose “full-framework” (closed beta, login required) or “registry only” when running `init`.
* **Steering Rules**: Tiles can now define agent behavior rules via a new `steering` section in their manifests. These rules are automatically aggregated into a `RULES.md` file.
* **Local Usage Spec Installation**: Added support for installing tiles from local directories via a new `source` field in `tessl.json`.

### Improvements

* Simplified usage spec installation paths by removing version info from the directory structure.

### Bug Fixes

* Fixed `config list` to return empty results instead of throwing errors when no config file is present.

## 0.26.0

### New Features

* Selecting Cursor during `tessl init` or via `tessl setup agent` will now automatically install rule files into `.cursor/rules/tessl/framework` as part of project setup, improving Framework adherence.

## 0.25.0

### New Features

* **Improved Tile Installation UX:** Tiles suggested during install/update are now selected by default, making the default path simpler for users.
* **Improved Help for `tessl init`:** The `-help` output for `tessl init` now lists available agents, making it easier to discover options.
* **Non-Interactive Shell Support:** CLI installation no longer blocks in non-interactive shell environments.

### Improvements

* **Better Logging Behavior:** In non-interactive mode, JSON logs are now correctly sent to stderr, preserving standard piping behavior.
* **Help Text Visibility:** Tile help text remains visible even when tiles are deselected, improving clarity during installation.

### Bug Fixes

* **Maven Dependency Detection:** Fixed issues with the Maven dependency detector to ensure accurate detection.
* **Logging Flushing Reliability:** Addressed a flakiness issue by ensuring that stdio is flushed on close, not exit.
* **Ink Render Handling:** Corrected usage of Ink’s rendering logic to prevent hanging or exit-related issues.
* **Security:** Updated `pino` logger to remove a transitive vulnerability.

## 0.24.0

### New Features

* `tessl registry sync` to synchronize tiles from the registry.
* `tessl setup framework` to switch between the full Tessl framework and “registry-only” mode.
* `tessl stamp` to manually sync spec/code hashes after intentional edits so tessl status stops flagging them.
* `tessl registry search` now matches by full tile name (workspace/name), making it easier to find your own tiles.
* `tessl registry list` added to browse available tiles.
* `tessl document` adds tests to spec by default.

### Improvements

* `tessl status` surfaces an explicit error if bootstrap hasn’t been run.
* Tool calls will fail if agent bootstrap process has not been run, with guidance to fix.
* Added --print-project-cache flag for getting the path to the project cache.
* Removed interactive tool picker removed to simplify workflows.
* AGENTS.md now includes clearer “bootstrap” hints and wording tweaks to reduce confusion about when/why bootstrap should run.

### Bug Fixes

* MCP commands now authenticate correctly in all call sites.
* Reduced noisy output during `tessl registry sync`.

### Compatibility

* Minimum Node.js version is now **>= 22.0.0**.

## 0.23.0

### New Features

* Added support for **GitHub Copilot**.
* `tessl edit` now supports code files that have an associated `@describe` spec. Changes are made via the spec.

### Improvements

* `tessl whoami` command now includes your user ID.
* Reduced the chances of "token expired" errors, by proactively refreshing tokens when commands are run.
* Test commands will now time out if no output is received for a set period, preventing hangs.
* Registry commands now prompt for initialization if the workspace isn’t already set up.
* Unused `.tessl/usage-specs` directories are now removed during sync if the corresponding entries are removed from `tessl.json`.
* Test generation is now controlled by a unified `generateTests` param, which always skips locked tests.
* Improved `list` command usability, to make it easier for agents to select the right parameters.
* `tessl registry publish` **s**kips uploading irrelevant `.md` and `.gitignore`d files.

### Bug Fixes

* `tessl status` no longer shows duplicated test paths.
* Resolved issue where interactively selected tools weren’t able to run.
* Fixed Goose setup, so that correct `.gooserules` configuration is used.

### Deprecations

* Removed deprecated annotations like `@describes`, `@generates`, and `@satisfied-by`.

{% hint style="warning" %}
**⚠️ Be sure to check out the changes in** [**0.22.0**](#0.22.0) **if you're coming from an older version**
{% endhint %}

## 0.22.1

### Bug Fixes

* Fixed a project language detection issue that would occasionally cause errors across different commands.

## 0.22.0

{% hint style="warning" %}
**⚠️ Upgrading for users who installed via `npm`**

If you have already installed tessl via npm, you'll need to:

* Run `npm uninstall -g tessl-alpha` (if you have a version earlier than `v0.21.0`)
* Run `npm i -g @tessl/cli` to update to the latest version.

The `update` command will work as expected from `v0.22.0` onwards.
{% endhint %}

{% hint style="info" %}
**Camel case flag support has been removed**

Camel case flag support has now been fully phased out, all command flags should be provided in kebab case.
{% endhint %}

### **New Features**

* `init` now offers the option to set up an agent and MCP integration when initializing a project for the first time.

### **Improvements**

* Support information is now listed in help for logged-out users.
* Tool parameters are now displayed before model parameters in tool-level help.
* Links are now supported in kitty terminal.

### **Bug Fixes**

* Fixed the rules file targeting in Gemini CLI agent setup.
* `feedback` is now gated to authenticated users, unauthenticated users can request support via email (<support@tessl.io>).

## 0.21.2

### **Bug Fixes**

* Fixed MCP server not allowing invocation of install or search tools when not logged in.

## 0.21.1

### **Improvements**

* Running tools with spec-registry-only context will now fail early and remind you to install the Tessl Framework before continuing.
* Added ability to exit `registry search` with the Escape key.
* Search results now link to the **spec registry** page instead of individual package registries.

### **Bug Fixes**

* Fixed **Ctrl+C** handling with the experimental `observe` command.
* Fixed a deprecation warning on `registry install`.

## 0.21.0

{% hint style="warning" %}
**⚠️ Upgrading for users who installed via `npm`**

We have now published to public npm! This means that if you installed Tessl using `npm`, auto update with `tessl update` will not work for you for this version. To update, you’ll need to run:

```markdown
npm uninstall -g tessl-alpha
npm install -g @tessl/cli
```

{% endhint %}

{% hint style="warning" %}
**⚠️ Re-initializing your projects**

With this release, you’ll need to re-initialize any previously-created Tessl projects by running `tessl init` inside those directories.
{% endhint %}

***

### Breaking Changes

* Removed test generation from the `build` tool and introduced a new `build-tests` tool
* The spec format has been updated to allow capabilities to contain requirements that don’t have `[@test]` links:
  * `create` and `edit` specs will only add `[@test]` links if explicitly asked to do so in the `--prompt`

### **New Features**

* Our spec format now supports distinguishing between three types of tests:
  * `locked` tests: capture functional requirements provided
    * Denoted by `{ .locked }` next to the `[@test]` link or in a header containing `[@test]` links.
    * You can manually mark tests as locked or use `tessl test` to do it by passing `--lock-tests`.
  * `impl` tests: cover implementation details that are tested to identify changes in behaviour disconnected from a spec’s functional requirements.
    * Denoted by `{ .impl }`.
    * They are generated by `tessl document --include-impl-details` .
  * `draft` tests: are untagged and could have been added manually or using `edit` or `create`
    * You can use `tessl test --lock-tests` to automatically lock all draft the tests from a spec when all tests pass.
* Added flags to `build-tests` tool to select which kind of tests to generate `--generate-draft-tests`, `--generate-locked-tests`, and `--generate-impl-tests`.

### New Commands & Tools

* Added new `registry install`, `registry search`, and `registry sync` commands for working with Usage Specs.
* Added a new `test` tool, to run all of the tests for a given spec.
* Added `generate-tests` tool to add tests to a given spec.
* Added experimental `observe` tool to observe MCP tool invocations.

### Spec Registry

* Unauthenticated users can now access a subset of Tessl’s features to add Usage Specs to their projects.
  * Running `init` while logged out will set up `AGENTS.md` and framework files relating to the Tessl Spec Registry.

### Global Config

* `config` commands now support the `--global` flag, for updating the global Tessl config.
* The global config now supports a `shareUsageData` key to allow for analytics opt-out.

### **Improvements**

* Cleaner output for `build` and `build-tests` with a final summary listing successful and failed specs.
* Spec discovery for `build` is smarter: only builds specs with @generate links that actually need code updates.
* Diagnostics suggestions now correctly use positional parameters (e.g., `tessl build <spec>`), and `status` accepts \<spec> as positional.
* Registry-only flows link to the Knowledge Index; usage spec manifest split into tessl.json (structured) and `KNOWLEDGE.md` (narrative).
* Tessl MCP tools can now log detailed output to a file to reduce their output and avoid saturating agent context when the agent is instructed to do so.
* Added `--code` and `--tests` filters to `list` command for finer control.
* Made `test` tools `spec` argument positional in CLI commands.
* `status` now splits diagnosed issues into errors and warnings and includes errors regarding spec parsing.
* `config set` now **validates keys** before setting.
* Updated spec syntax information in our system prompts:
  * Added context about our content tags: untagged (draft), `locked` and `impl`.
  * Removed un-used `.dependencies` and `.dependency` tags.
* Updated Tessl framework content with clearer guidance on `tessl test`, `status`, and `fix` behavior.
* `version` output is now cleaner and includes a hint to update if a new version is available.
* The `--spec` argument in `build` is now positional.
* Exposed `modelName` parameter in MCP tools

### **Bug Fixes**

* Spec selection no longer appears to “infinite scroll.”
* `infer-spec` no longer swallows errors.
* Fix loop now receives test results properly.
* Reporter failures print helpful context (e.g., missing file paths) to the terminal.
* Prevent generation of tests when using edit on code files.
* Test-runner name generation validates input and throws on invalid paths.
* Tessl framework files are now filtered from context provided to tools to prevent context poisoning.
* Fixed issue where **login could not be cancelled** while polling.
* Fixed truncated console logs when running in **non-interactive/piped mode**.
* Fixed `edit` tool so context files are properly passed.
* Fixed dependency verification to use correct `@use` path resolution.
* Prevented whitespace-only messages from being sent to models.
* Pass test results through fix loop iterations correctly.
* Fixed an incorrect path in `.tessl/.gitignore` for session data storage.
* Fixed `init` missing from global help.
* Reject invisible characters from LLM interactions.

## 0.19.0

{% hint style="warning" %}

> This release includes breaking changes that require migration for existing projects.\*\*

To migrate your existing projects using `TESSL.md`, run the following steps:

1. Remove old system prompt directory: `rm -rf .tessl/system-prompt`
2. Run `tessl init` to initialize the new framework.
3. Migrate any custom content from `TESSL.md` to `AGENTS.md`
4. Remove the old file: `rm TESSL.md`
5. Re-configure any existing agent integrations: `tessl setup agent`
   {% endhint %}

***

### New Features

* Adopted [`AGENTS.md`](http://agents.md/) standard (replacing `TESSL.md`) for unified AI agent configuration across your development workflow.
* **Improved Dependency Handling**
  * `verify-deps` now runs automatically after code generation in the build process.
  * New `specifyMissingDependencies` flag can auto-update your spec with missing dependencies in `tessl build` and `tessl edit`.
  * New `never` option added to generation mode to skip file generation entirely.
* `tessl status` enhancements:
  * Highlights whether a spec includes `@generate` or `@describe` annotations.
  * Added dirtiness diagnostic to detect out-of-sync code/test files.
  * Added diagnostic for missing `AGENTS.md` entries in `tessl status`.
* **Improved Spec & Test Management**
  * Rewritten `document` tool with more intuitive behavior and support for complex specs.
  * Re-initializing a project now regenerates framework files.

### Improvements

* Removes `setup language` command; tools that require test commands now have a `--test-command` flag.
* Removed description upon tool invocation.
* Increased latest version check timeout in `update` command to reduce false negatives.

### Bug Fixes

* Logging in from an agent now automatically updates the MCP server so you can continue without restarting.
* Fixed tool summaries not showing in CLI output.
* CLI session data no longer prevents process exit after command completion.

## 0.18.1

### **New Features**

* **`build` tool** now has a post-generation fix loop to automatically resolve issues - *we will be tweaking how we decide which test command to run in the coming week*
* New **`status`** checks for orphaned tests, mixed implementation links & missing required files
* Added support for **agent-native planning**: agents now create and maintain **`.plan.md`** files automatically during planning.

### **Improvements**

* **Removed `--recursive` option** from status command for consistency with other commands
* **Replaced** `--rebuild-tests` with `--generate-tests` to `build` to generate only missing, outdated or always (default is now `outdated` rather than `missing`)
* **Added** `--generate-code` to `build` which behaves like `--generate-tests` but for code files (default is `outdated`, but is likely to change)
* **Generated code now includes self-hashing** for integrity checking and better status reporting on modified files
* Removed **timestamps from generated code tags**
* Improved **logging and error messages** across tools
* Improved **exception messages** to include more debugging context
* Better **editor detection and logging** in planning workflows
* Clarified descriptions for several commands & tools
* Tools invoked via MCP now return more information about their run, improving feedback visibility for agents
* The `build` tool now returns a failure exit code when the fix loop fails, ensuring accurate signaling of build status.

### **Bug Fixes**

* Fixed **update** command in Linux when using npm
* Fixed **test generation messages** saying “tests” instead of “test files”

### Deprecations

* Removed ability to edit plan files directly via the `edit` tool; users now receive a clear error if they attempt to do so.
* Made the `plan` tool private to reduce confusion and encourage agent-driven planning workflows

## 0.17.1

### Bug Fixes

* Fixes creation of the Claude subagent instructions directory as part of `setup agent`

## 0.17.0

### New Features

* Enabled tessl status to list all specs by default, providing broader project insights.
* Updated tessl status to include sync checks that detect whether a spec's code and tests are up to date.

### Improvements

* Updated build and document tool descriptions for clarity and accuracy.
* Made the -spec parameter more explicit and consistently required in tessl status help output.
* Renamed build tool's iterations parameter to maxIterations for clarity.
* Renamed @build links to @generate to reflect intended behavior.

### Bug Fixes

* Fixed bash execution in the update command to work reliably across Mac and Linux.
* Corrected error handling for expired keys.
* Made terms and conditions check respect a global directory set via environment variable.
* Fixed a crash in tessl status when a non-existent or empty spec file is provided.
* Resolved incorrect logging of issue counts in single-spec status output.
* Improved handling of file paths in the document tool to normalize inputs like ./path/to/file.


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.tessl.io/changelog-cli.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
