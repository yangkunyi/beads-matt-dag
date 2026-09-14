SOURCE-URL: https://docs.tessl.io/codifying-and-enforcing-your-skill-standards/gate-skill-quality-in-ci.md
FETCHED: 2026-09-14T17:18:41+08:00
HTTP: 200

> For the complete documentation index, see [llms.txt](https://docs.tessl.io/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.tessl.io/codifying-and-enforcing-your-skill-standards/gate-skill-quality-in-ci.md).

# Gate skill quality in CI

Run a review on every pull request and fail the build when a skill scores below your threshold.

{% hint style="info" %}
**Takeaway** Run a review on every pull request and fail the build when a skill scores below your threshold. Skills that fall short of the bar never merge.
{% endhint %}

A review tells one person whether a skill is good. Gating in CI applies that check to everyone, automatically, so a substandard skill cannot reach your shared repository in the first place.

## Fail a build below a threshold

Pass `--threshold` to exit non-zero when a review score falls below your bar:

```bash
tessl review run ./my-skill --workspace engteam --threshold 80
```

`--threshold` takes a 0-100 integer. The default is 0, which never fails. Any value above 0 causes the command to exit non-zero - and fail the CI step - when the score falls below it.

Add `--json` when you need machine-readable output, for example in a script that reads the score programmatically:

```bash
tessl review run ./my-skill --workspace engteam --json --threshold 80
```

`--workspace` is required when `--json` is set, because a non-interactive run cannot prompt for one. In practice, always pass `--workspace` in CI regardless.

You can also re-check an existing run against a threshold without starting a new review:

```bash
tessl review view <run-id> --json --threshold 80
```

## Authenticating in CI

A review runs against your workspace, so CI needs to authenticate without an interactive login. Create an API key for your workspace:

```bash
tessl api-key create --workspace engteam
```

Set the key as a repository secret named `TESSL_TOKEN`. The CLI and the Tessl GitHub Action both read it from that variable.

### Keys expire after 30 days

Every API key expires. Unless you pass `--expiry-date`, the key you just created is valid for **30 days from creation**, and the CLI prints the exact date when it issues the key.

This matters most in CI, because nothing fails at the moment the key expires. Your pipeline stays green for a month and then starts failing authentication on a run that changed nothing. Put a reminder in your calendar, or pass a longer `--expiry-date` when you create the key:

```bash
tessl api-key create --workspace engteam --name ci --role member --expiry-date 2027-12-31T00:00:00Z
```

### Rotating a CI key

Rotation is always something you run from your own machine, never from inside the pipeline. An API key cannot create another API key, which means a leaked CI credential cannot renew itself. That is deliberate.

Two paths, depending on whether the key has already expired.

**The key has already expired.** Your pipeline is broken, so there is no window to protect. Replace it under the same name:

```bash
tessl api-key delete --workspace engteam ci
tessl api-key create --workspace engteam --name ci --role member
```

**The key is still valid.** Create the replacement under a new name first, confirm a run passes with it, and only then remove the old key. Your pipeline is never without a working credential:

```bash
tessl api-key create --workspace engteam --name ci-2 --role member
# update the secret, confirm a run passes, then:
tessl api-key delete --workspace engteam ci
```

Key names are unique per workspace, which is why the second path needs a different name rather than reusing `ci`.

Both paths involve reading your pipeline to find which secret feeds `TESSL_TOKEN`, and that secret can be named anything. `tessl agent` can do that part for you: ask it to rotate your Tessl CI key and it finds the secret, shows you a plan naming where each fact came from, and waits for a go-ahead before it changes anything.

```bash
tessl agent "rotate my Tessl CI key"
```

Nothing to install. The skill behind this ships with the CLI.

Use `tessl api-key list --workspace engteam --json` when you want key ids, roles, or expiry dates in a script.

### Where the key lives on each CI platform

Whatever your platform, the CLI reads the key from the `TESSL_TOKEN` environment variable. What changes is where the secret behind that variable is stored. The secret itself can be named anything, so check your pipeline definition to see which one it maps to `TESSL_TOKEN`.

| Platform            | Where the secret lives                                 | CLI                            |
| ------------------- | ------------------------------------------------------ | ------------------------------ |
| GitHub Actions      | Settings > Secrets and variables > Actions             | `gh secret set <secret>`       |
| GitLab CI           | Settings > CI/CD > Variables                           | `glab variable set <variable>` |
| CircleCI            | Project Settings > Environment Variables               |                                |
| Buildkite           | Pipeline Settings > Secrets                            | `bk secret set <secret>`       |
| Azure Pipelines     | Pipelines > Library                                    | `az pipelines variable update` |
| Jenkins             | Manage Jenkins > Credentials                           |                                |
| Bitbucket Pipelines | Repository settings > Pipelines > Repository variables |                                |
| TeamCity            | Build Configuration > Parameters                       |                                |

When a key expires, the CLI names your platform and its secret location in the error, so you do not have to come back to this table.

## Run it on pull requests

Tessl publishes a GitHub Action that installs the CLI and runs this gate on pull requests, so you do not have to wire up the CLI by hand. For the complete workflow, see [Review, lint & publish with GitHub Actions](/distribute/review-and-publish-with-github-actions.md).

## Next

* [Define your own quality standards](/codifying-and-enforcing-your-skill-standards/define-your-own-quality-standards.md) - gate against your organisation's own rubric, not just the default.
* [Check a skill's quality using review](/improving-your-skills/reviewing-skills.md) - full reference for `tessl review run`, score interpretation, and applying fixes.


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.tessl.io/codifying-and-enforcing-your-skill-standards/gate-skill-quality-in-ci.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
