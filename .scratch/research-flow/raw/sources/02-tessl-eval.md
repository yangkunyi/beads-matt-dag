SOURCE-URL: https://docs.tessl.io/improving-your-skills/evaluate-skill-quality-using-scenarios.md
FETCHED: 2026-09-14T17:18:42+08:00
HTTP: 200

> For the complete documentation index, see [llms.txt](https://docs.tessl.io/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.tessl.io/improving-your-skills/evaluate-skill-quality-using-scenarios.md).

# Prove a skill works using evaluation

Generate scenarios, run an evaluation, and read the score difference to see whether a skill actually changes what an agent produces.

{% hint style="info" %}
**Takeaway** Generate scenarios from a skill, run an evaluation, and read the score difference to see whether the skill actually changes what an agent produces. Scenarios are saved with the skill, so they become a regression test you re-run after every change.
{% endhint %}

An evaluation runs an agent on real tasks twice, once without the skill and once with it, then scores the difference. That difference is the skill's value: proof it changes what the agent does, not just that it reads well. Where a review checks the skill itself, an evaluation measures its effect.

Evaluation is more rigorous than review and takes longer to set up and run. Reach for it when you need confidence a skill works, for example before you publish it or share it into a repository where you will not see how others' agents use it.

You can evaluate a single skill against generated scenarios, or evaluate context files against real tasks taken from your codebase's commit history. Both run through the same `tessl eval` commands.

{% hint style="info" %}
All the steps on this page are also available through your agent. Install Tessl's Skill Optimizer to generate scenarios, run evaluations, and improve skills without leaving your editor: `tessl install tessl/skill-optimizer`
{% endhint %}

## Skills are evaluated inside Tessl plugins

A Tessl plugin is a structure that bundles the skills, rules, and documentation an agent needs for an area of context, packaged so it can be versioned and shared. An evaluation generates scenarios and produces results, and a plugin is the natural place to keep them with the skill they belong to.

For this reason `tessl eval run` expects the generated scenarios to live inside the plugin, and the shorthand `tessl eval run ./my-skill` expects a directory containing a `.tessl-plugin/plugin.json`. If you have a standalone skill, import it into a plugin first:

```bash
tessl skill import ./my-skill
```

## Generate scenarios

Scenarios are the tasks an agent is assessed against. Generate them from the plugin:

```bash
tessl scenario generate ./my-skill
```

Each generated scenario is put through a feasibility check on the server. Only scenarios that pass are saved, so the generator gives you tests that actually exercise the skill rather than filler.

`--count` sets how many scenarios to target, and defaults to 3. Pass a higher number to cover more of what the skill claims to do. For a narrowly scoped skill the generator may return fewer than requested, because it will not save scenarios that fail the feasibility check.

```bash
tessl scenario generate ./my-skill --count 5
```

Generation runs server-side. Check progress with `tessl scenario list --mine`, then download the scenarios once it completes:

```bash
tessl scenario download --last
```

When run from inside a plugin directory (or any subdirectory of one), `tessl scenario download` writes scenarios directly into the plugin's `evals/` directory, so they are immediately runnable by `tessl eval run`. When run outside a plugin, it writes to an `evals/` directory relative to your current directory. Override the location with `--output`, and choose whether new scenarios merge with or replace existing ones with `--strategy merge` (the default) or `--strategy replace`. The command always prints where the files landed.

{% hint style="warning" %}
**The default destination is the plugin's `evals/`, wherever you run from inside the plugin.** Two consequences follow from this:

* `--strategy replace` clears the plugin's `evals/` directory before writing, even when you run from a subdirectory such as `src/`. It does not target `src/evals`. Pass `--output <dir>` to replace a different directory.
* `--strategy merge` (the default) overwrites existing scenario files with the same name. Scenario names are canonical (`scenario-1/`, `scenario-2/`, …), so a re-download replaces `scenario-1/` and any hand-edits in it. Copy edited scenarios you want to keep to a directory the download will not touch, or download with `--output` to a separate directory.
  {% endhint %}

The scenarios are saved with the skill, so anyone who changes it later can re-run the same scenarios and confirm it still behaves as expected.

You do not have to generate scenarios. You or your agent can write them by hand instead, as long as they sit in the plugin's `evals/` directory, one scenario per subdirectory. See [File formats](#file-formats) for the structure.

### Generate scenarios from your codebase

Instead of generating scenarios from a skill, you can build them from real changes in your repository, so the tasks reflect work your team actually does. Point `tessl scenario generate` at a repository with commit hashes or PR numbers:

```bash
# From commits
tessl scenario generate org/repo --commits abc123,def456 --workspace engteam

# From pull requests
tessl scenario generate org/repo --prs 42,107 --workspace engteam
```

Tessl analyses each diff and reconstructs the intent of the change as a task brief and a scoring rubric. The starting state has your context files stripped out, so the agent solves the task without them.

`--context` tells Tessl which files are context files. The patterns are saved in each scenario as the codebase fixture's exclude list. When omitted, Tessl excludes `*.mdc`, `*.md`, `tile.json`, `.tessl-plugin/plugin.json`, `tessl.json`, and `.tessl/` by default.

To browse recent commits and choose which to turn into scenarios, use `tessl repo select-commits org/repo`. It accepts `--keyword`, `--author`, `--since` / `--until`, and `--count`, and prints a table of commit hashes to pass to `generate`.

{% hint style="info" %}
Your GitHub or GitLab account must be connected in workspace settings.
{% endhint %}

Because these scenarios start from a state with your context files stripped out, pass `--context` again at run time with a glob matching those files. This adds a with-context variant on top of the baseline so you can measure the delta:

```bash
tessl eval run ./my-skill/evals/ --context 'src/**/*.knowledge.md'
```

Match the `--context` glob to the files each scenario excludes. With no `--context`, only the baseline runs.

## Run an evaluation

```bash
tessl eval run ./my-skill
```

The agent solves each scenario twice, without the skill and with it, and a judge scores both against a per-scenario rubric. The run reports the baseline score, the with-skill score, and the difference between them. Runs can take a while; pressing Ctrl+C detaches and the run continues server-side.

Label a run to find it again later:

```bash
tessl eval run ./my-skill --label "baseline"
```

```bash
# List your recent runs
tessl eval list --mine

# View a run, including the per-scenario breakdown
tessl eval view --last
tessl eval view abc123

# Retry a failed run
tessl eval retry abc123
```

## Read the result

A run produces output like this:

```
Eval Results: baseline

Agent:     claude:deepseek-v4-flash
Variants:  Without this plugin, With this plugin
Status:    Completed

Scenario: Commit message formatting for complex refactor

  Without this plugin
  Check                         Score
  ------------------------------------------
  Conventional Commits format   30/30  (100%)
  Valid type                    0/20   (0%)
  Subject line <= 72 chars      0/30   (0%)
  Blank line separator          20/20  (100%)
  Total                         50/100  (50%)

  With this plugin
  Check                         Score
  ------------------------------------------
  Conventional Commits format   30/30  (100%)
  Valid type                    20/20  (100%)
  Subject line <= 72 chars      30/30  (100%)
  Blank line separator          20/20  (100%)
  Total                         100/100  (100%)

Scenario: Type selection for a small fix

  Without this plugin
  Total                         90/100  (90%)

  With this plugin
  Total                         95/100  (95%)

Summary
  Scenarios: 3 completed
  Without this plugin avg:  71%
  With this plugin avg:     92%
```

The score difference tells you what the skill is worth:

* **A large positive difference** means the skill reliably moves the agent toward the right behaviour.
* **Little or no difference** means the agent already did the task well without the skill, or the skill is not landing.
* **A small negative difference** is usually normal model variance, not evidence the skill is harmful.
* **A large or consistent negative difference** is a real sign the skill is confusing the agent or pushing it toward unhelpful behaviour, and the content needs work.

Read the per-scenario breakdown rather than just the headline average, since a strong result on one scenario can hide a weak one on another.

### Outcome and activation

A standard evaluation measures **outcome**: with the context forced on, does the agent produce better work against the rubric. It does not test whether the agent would have loaded the skill on its own.

To measure **activation**, whether the agent picks up the skill itself without being told to, add `--skip-forced-context-activation`. A skill can score well on outcome but fail to activate, which means it would not help in practice because the agent never reaches for it.

```bash
# Measure activation only: don't force the context, and skip outcome scoring
tessl eval run ./my-skill --skip-forced-context-activation --skip-scoring
```

The two flags are independent: `--skip-forced-context-activation` stops forcing the context so activation can be observed, and `--skip-scoring` skips rubric scoring. Used together they give a pure activation check.

Example activation output:

```
Activation Results

Agent:     claude:deepseek-v4-flash
Variants:  baseline, with context
Status:    Completed

Injected context
Plugin: format-commit-messages@0.1.0

Scenario                                            Activated skills
--------------------------------------------------------------------
1. Conventional Commits format and type selection   format-commit-messages
2. Commit message formatting for complex refactor   format-commit-messages
3. Conventional Commits with multi-line message     —
```

`—` in the Activated skills column means the skill was not selected by the agent on its own. A skill that does not activate is a description problem, best fixed with a [review](/improving-your-skills/reviewing-skills.md). A skill that activates but does not improve the outcome is a content problem to fix in the skill body.

## Choose how rigorous to be

Evaluation is a toolkit, not a single fixed test. Scale the rigour to how much confidence you need.

* **More scenarios.** Generate a higher `--count` to cover more of what the skill claims to do.
* **Repeated runs.** An evaluation runs a real agent, and agents are non-deterministic, so a single run can mislead. Pass `--runs` (or `-n`) to run each scenario several times and average out the variance. Worth doing before you publish.
* **Different agents.** Run the evaluation against more than one agent with `--agent` to check the skill holds up across the models your team uses.
* **Quality filter.** Pass `--quality-check` to exclude scenarios the platform judges low-feasibility, rubric-leaking, or low-signal at run time, a stricter filter than the one applied at generation.
* **Skip the baseline.** Pass `--skip-baseline` to run only the with-context variant when you do not need the comparison.
* **Override the scorer.** Pass `--scorer-agent` to score with a different agent from the one solving the tasks.

## Passing secrets to an evaluation

Some scenarios need external credentials, for example an API key or a database URL. The `--env-file` flag encrypts a local `.env` file client-side and injects the variables into the eval sandbox, where setup scripts and the agent inherit them:

```bash
tessl eval run ./my-skill --env-file ./secrets.env
```

The file uses standard `KEY=VALUE` lines; blank lines and `#` comments are ignored. The CLI rejects reserved keys at submit time, including `LITELLM_ADMIN_KEY`, `LITELLM_MASTER_KEY`, `UPLOAD_WORKSPACE`, `DOWNLOAD_WORKSPACE`, and any key prefixed `AWS_`, `S3_`, `DAYTONA_`, or `RECIPE_RUN_`. Rename conflicting keys before running.

## Choosing an agent

By default an evaluation runs against agent `claude`, and in the US region model `deepseek-v4-flash`. Choose a different agent and model with `--agent` and `--model`. An evaluation takes a single agent and model; to compare models, run it once per model.

The default model and the available models both depend on the region you are connected to: the open-weight models below (DeepSeek, GLM, Kimi, Qwen, MiniMax, GPT OSS, and Nemotron) are not offered in the EU region, which defaults to a Claude model instead. Run `tessl eval run --list-agents` to print the models and the default for your region.

```bash
$ tessl eval run ./my-skill --agent claude --model claude-opus-4-8
```

`--agent` values: `claude`, `codex`, `tessl`. Pair each with a `--model` value from its tab below.

{% tabs %}
{% tab title="Claude" %}

| Model             | `--model` value     |
| ----------------- | ------------------- |
| Claude Fable 5    | `claude-fable-5`    |
| Claude Opus 5     | `claude-opus-5`     |
| Claude Opus 4.8   | `claude-opus-4-8`   |
| Claude Opus 4.7   | `claude-opus-4-7`   |
| Claude Opus 4.6   | `claude-opus-4-6`   |
| Claude Sonnet 5   | `claude-sonnet-5`   |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` |
| Claude Opus 4.5   | `claude-opus-4-5`   |
| Claude Sonnet 4.5 | `claude-sonnet-4-5` |
| Claude Haiku 4.5  | `claude-haiku-4-5`  |
| {% endtab %}      |                     |

{% tab title="Other hosted models" %}
Also served through `--agent claude`.

| Model                       | `--model` value          |
| --------------------------- | ------------------------ |
| Deepseek V4 Flash (default) | `deepseek-v4-flash`      |
| Deepseek V4 Pro             | `deepseek-v4-pro`        |
| Kimi K2.6                   | `kimi-k2.6`              |
| Kimi K2.7 Code              | `kimi-k2.7-code`         |
| GLM 5.2                     | `glm-5.2`                |
| Qwen3.7 Plus                | `qwen3.7-plus`           |
| MiniMax M3                  | `minimax-m3`             |
| MiniMax M2.7                | `minimax-m2.7`           |
| GPT OSS 20B                 | `gpt-oss-20b`            |
| GPT OSS 120B                | `gpt-oss-120b`           |
| Nemotron 3 Ultra            | `nemotron-3-ultra-nvfp4` |
| {% endtab %}                |                          |

{% tab title="Codex" %}

| Model         | `--model` value |
| ------------- | --------------- |
| GPT 5.6 Sol   | `gpt-5.6-sol`   |
| GPT 5.6 Terra | `gpt-5.6-terra` |
| GPT 5.6 Luna  | `gpt-5.6-luna`  |
| GPT 5.5       | `gpt-5.5`       |
| GPT 5.4       | `gpt-5.4`       |
| GPT 5.4 Mini  | `gpt-5.4-mini`  |
| GPT 5.4 Nano  | `gpt-5.4-nano`  |
| GPT 5 Codex   | `gpt-5-codex`   |
| GPT 5.3 Codex | `gpt-5.3-codex` |
| GPT 5.2 Codex | `gpt-5.2-codex` |
| GPT 4.1       | `gpt-4.1`       |
| GPT 4.1 Mini  | `gpt-4.1-mini`  |
| {% endtab %}  |                 |

{% tab title="Tessl" %}

| Model             | `--model` value          |
| ----------------- | ------------------------ |
| Claude Fable 5    | `claude-fable-5`         |
| Claude Opus 5     | `claude-opus-5`          |
| Claude Opus 4.8   | `claude-opus-4-8`        |
| Claude Opus 4.7   | `claude-opus-4-7`        |
| Claude Opus 4.6   | `claude-opus-4-6`        |
| Claude Sonnet 5   | `claude-sonnet-5`        |
| Claude Sonnet 4.6 | `claude-sonnet-4-6`      |
| Claude Opus 4.5   | `claude-opus-4-5`        |
| Claude Sonnet 4.5 | `claude-sonnet-4-5`      |
| Claude Haiku 4.5  | `claude-haiku-4-5`       |
| Kimi K2.6         | `kimi-k2.6`              |
| Deepseek V4 Flash | `deepseek-v4-flash`      |
| GLM 5.2           | `glm-5.2`                |
| Kimi K2.7 Code    | `kimi-k2.7-code`         |
| Qwen3.7 Plus      | `qwen3.7-plus`           |
| MiniMax M3        | `minimax-m3`             |
| Deepseek V4 Pro   | `deepseek-v4-pro`        |
| MiniMax M2.7      | `minimax-m2.7`           |
| GPT OSS 20B       | `gpt-oss-20b`            |
| GPT OSS 120B      | `gpt-oss-120b`           |
| Nemotron 3 Ultra  | `nemotron-3-ultra-nvfp4` |
| {% endtab %}      |                          |
| {% endtabs %}     |                          |

## Evaluations when you publish

Publishing a plugin to the registry runs an evaluation as part of publishing, and the results appear on the registry. The evaluation is optional: pass `--skip-evals` to publish without it, or `--with-scenario-quality-check` to apply the quality filter to the publish-time run. See [Distributing via registry](/distribute/distributing-via-registry.md).

## Prerequisites

* Authentication, either a logged-in session, confirmed with `tessl whoami` and started with `tessl login`, or a `TESSL_TOKEN` API key in the environment.
* Workspace access at Publisher level or above.
* A Tessl project, so Tessl knows which repository an evaluation belongs to and your results stay tied to your codebase over time. Create one with `tessl project create <name> --workspace engteam`, link an existing one with `tessl project link`, and repair a broken link with `tessl project repair`. See [Projects overview](/projects/overview.md).

A plugin that holds evaluations looks like this on disk:

```
my-plugin/
├── .tessl-plugin/
│   └── plugin.json      workspace, name, version
├── skills/<name>/SKILL.md
├── tessl.json           links the directory to a Tessl project
└── evals/
    └── scenario-name/
        ├── task.md          the task brief the agent sees
        ├── criteria.json    the scoring rubric
        └── scenario.json    fixture and include declarations
```

## File formats

### task.md

Free-form markdown, and the only file the agent sees. Typically structured with problem, expected behaviour, and acceptance criteria sections. Edit it freely before running.

### criteria.json

Defines how a solution is scored, as a weighted checklist:

```json
{
  "context": "Brief description of what is being evaluated.",
  "type": "weighted_checklist",
  "checklist": [
    {
      "name": "fixes_syntax_error",
      "description": "The solution adds the missing closing parenthesis.",
      "max_score": 1,
      "category": "INTENT"
    }
  ]
}
```

Each checklist item carries a `category`: `INTENT`, `DESIGN`, `MUST_NOT`, `MINIMALITY`, `REUSE`, `INTEGRATION`, or `EDGE_CASE`. The score is the sum of awarded scores over the sum of maximum scores, as a percentage, and the grader can award partial credit.

### scenario.json

Optional. Declares fixtures, included files, and setup scripts. A skill scenario can simply list `include` paths to copy into the working directory. A codebase scenario carries a commit fixture with the repository URL, the starting commit, and the context exclude patterns. See the [configuration reference](/reference/configuration.md) for the full schema.

## Next

* [Codifying and enforcing your skill standards](/codifying-and-enforcing-your-skill-standards/overview.md) - set an organisation-wide quality bar and enforce it.
* [Troubleshooting reviews and evaluations](/improving-your-skills/troubleshooting-reviews-and-evals.md) - what to do when a run fails or scores look wrong.


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.tessl.io/improving-your-skills/evaluate-skill-quality-using-scenarios.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
