SOURCE-URL: https://docs.devin.ai/get-started/devin-intro.md
FETCHED: 2026-09-14T17:16:56+08:00
HTTP: 200

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.devin.ai/llms.txt
> Use this file to discover all available pages before exploring further.

# Introducing Devin

> Devin is the AI software engineer, built to help ambitious engineering teams crush their backlogs.

<Frame caption="Example Devin session, from prompt to PR">
  <video controls width="100%" playsInline>
    <source src="https://mintcdn.com/cognitionai/IDtCf_RaYAXtqaVv/images/get-started/devin-docs-new-intro.mp4?fit=max&auto=format&n=IDtCf_RaYAXtqaVv&q=85&s=a2c5cb4bddf349c8aac7b697ee25cb3e" type="video/mp4" data-path="images/get-started/devin-docs-new-intro.mp4" />

    Your browser does not support the video tag.
  </video>
</Frame>

Devin is an autonomous AI software engineer that can write, run and test code. Devin can handle most tasks, excluding extremely difficult tasks. As a rule of thumb, if you can do it in three hours, Devin can most likely do it. Ask Devin to tackle Linear/Jira tickets, implement entirely new features, repro and fix bugs, build internal tools, and more!

<Tip>
  See what's new with Devin in our [release notes](/release-notes/overview)!
</Tip>

<Note>
  In some cases Devin may not function exactly as referenced, or documentation may be out of date.
</Note>

## Already Signed Up? Get Started Now:

<Tip>
  [Browse use cases](/use-cases/gallery/index)
</Tip>

## What are Devin's strengths?

Here are the types of tasks where Devin excels:

1. **Tackling many tasks in parallel, before they end up in your backlog**
   * Linear/Jira tickets
   * Entire features from scratch
   * Bug reports
   * App testing
2. **Code migrations, refactors, and modernization**
   * Language migrations (e.g. JavaScript to TypeScript)
   * Framework upgrades (e.g. Angular 16 -> 18)
   * Monorepo to submodule conversions
   * Removing unused feature flags
   * Extracting common code into libraries
3. **Common, repetitive engineering tasks**
   * PR Review
   * Codebase Q\&A
   * Reproducing & fixing bugs
   * Writing unit tests
   * Maintaining documentation
4. **Customer engineering support**
   * Building new integrations and working with unfamiliar APIs
   * Creating customized demos
   * Prototyping solutions
   * Building internal tools

**To get the best results from Devin:**

* Write clear prompts with explicit completion criteria — the clearer the task, the higher the success rate, especially for complex work.
* Make tasks easy to verify — e.g. checking that CI passes or testing an automatic deployment.
* For harder tasks, break them into well-scoped steps and provide relevant context or examples.
* Follow our [best practices and pre-task checklist](/essential-guidelines/when-to-use-devin).

**The most successful workflows include:**

* Tagging Devin on a [Slack](/integrations/slack) or [Teams](/integrations/microsoft-teams) thread about a bug you're discussing with coworkers
* Delegating a more complex task via the web application and taking over in Devin's IDE once it gives you a good first draft.
* Running [Devin for Terminal](https://cli.devin.ai) in your local environment for quick fixes, code exploration, and interactive coding right from the command line — then using [`/handoff`](/work-with-devin/devin-cli#handoff-to-cloud-devin) to send longer tasks to cloud Devin.
* Carving out tasks from your todo list at the start of your day and returning to draft PRs waiting for review.

Devin is most effective when it's part of your team and your existing workflow.

<Frame caption="Devin in Slack">
  <img src="https://mintcdn.com/cognitionai/a0js040y87FuBerW/images/SlackGIF.gif?s=f1120b81fda6946dfdb28734362212e3" style={{ width: "100%", height: "auto" }} width="852" height="480" data-path="images/SlackGIF.gif" />
</Frame>

## General Product Features

### The Devin Interface

Devin is designed to be a conversational user interface, and allows you to follow and take over Devin's development process in the embedded IDE. Devin is also available via the [Devin API](/api-reference/overview).

In Devin's Workspace, you'll find [developer tools](/work-with-devin/devin-session-tools) that Devin will use to complete your task.

<CardGroup cols={3}>
  <Card title="Shell" icon="rectangle-terminal">
    Devin's terminal, where you can watch commands being executed and view output logs. You can also copy the shell output for debugging purposes. To run commands directly, use the IDE's shell.
  </Card>

  <Card title="IDE" icon="code">
    Devin's embedded code editor equipped with all the IDE tools and shortcuts you're familiar with. Follow Devin's work real-time and take over to run commands, make direct code edits or test Devin's code.
  </Card>

  <Card title="Browser" icon="browser">
    Watch Devin browse through documentation, test web applications it builds, download/upload information, and more. You can jump in to help Devin navigate through browsing tasks via the Interactive Browser.
  </Card>
</CardGroup>

<Frame caption="You can find Devin's tools in the sidebar or by clicking any progress steps in the session">
  <video controls width="100%" playsInline>
    <source src="https://mintcdn.com/cognitionai/IDtCf_RaYAXtqaVv/images/get-started/devintoolsnew.mp4?fit=max&auto=format&n=IDtCf_RaYAXtqaVv&q=85&s=217ee85538ed624e0f737520d262ea26" type="video/mp4" data-path="images/get-started/devintoolsnew.mp4" />

    Your browser does not support the video tag.
  </video>
</Frame>

## Getting Access

To access Devin, sign up at [app.devin.ai](https://app.devin.ai). Individual and Teams plans are available.

You can also install [Devin for Terminal](https://cli.devin.ai) to use Devin directly from your command line:

* Tagging Devin on a [Slack](/integrations/slack) or [Teams](/integrations/microsoft-teams) thread about a bug you're discussing with coworkers
* Delegating a more complex task via the web application and taking over in Devin's IDE once it gives you a good first draft.
* Running [Devin CLI](/cli) in your local environment for quick fixes, code exploration, and interactive coding right from the command line — then using [`/handoff`](/work-with-devin/devin-cli#handoff-to-cloud-devin) to send longer tasks to cloud Devin.
* Carving out tasks from your todo list at the start of your day and returning to draft PRs waiting for review.

<CardGroup cols={3}>
  <Card title="Shell" icon="rectangle-terminal">
    Devin's terminal, where you can watch commands being executed and view output logs. You can also copy the shell output for debugging purposes. To run commands directly, use the IDE's shell.
  </Card>

  <Card title="IDE" icon="code">
    Devin's embedded code editor equipped with all the IDE tools and shortcuts you're familiar with. Follow Devin's work in real time and take over to run commands, make direct code edits or test Devin's code.
  </Card>

  <Card title="Browser" icon="browser">
    Watch Devin browse through documentation, test web applications it builds, download/upload information, and more. You can jump in to help Devin navigate through browsing tasks via the Interactive Browser.
  </Card>
</CardGroup>

You can also install [Devin CLI](/cli) to use Devin directly from your command line:

```bash theme={null}
curl -fsSL https://cli.devin.ai/install.sh | bash
```

If your company is already working with Cognition, you can request permissions from your Administrator or Cognition directly and access Devin via the web application at [app.devin.ai](https://app.devin.ai).

## Feedback

We're learning and our customers' input is crucial! You can share your feedback to [support@cognition.ai](mailto:support@cognition.ai), [via Slack Connect](https://app.devin.ai/settings/support) (available to Teams users), or directly via the "Feedback" button on the far right edge of the web app.

We log all feedback provided by customers and use it to make quick improvements to Devin and inform our product priorities and roadmap.

## Demo

To learn more check out our [blog](https://cognition.com/blog/devin-generally-available).

<iframe width="840" height="473" src="https://www.youtube.com/embed/qcaiYD8UTsc" title="YouTube video player" className="max-w-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen />

## About Cognition

We are an applied AI lab building end-to-end software agents.

We're building AI software engineers that help ambitious engineering teams crush their backlogs.
