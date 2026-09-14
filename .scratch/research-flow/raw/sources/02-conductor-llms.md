SOURCE-URL: https://conductor.build/llms.txt
FETCHED: 2026-09-14T17:19:46+08:00
HTTP: 200

# Conductor

> Conductor is a Mac app that lets you run many coding agents in parallel on your codebase.

## Links

- [Changelog](https://www.conductor.build/changelog.md)
- [Blog](https://www.conductor.build/blog)
- [Docs](https://www.conductor.build/docs)
- [All site markdown](https://www.conductor.build/llms-full.txt)

## Evergreen pages

- [Conductor brand assets](https://www.conductor.build/markdown/brandkit)
- [Conductor Enterprise](https://www.conductor.build/markdown/enterprise)
- [Join Conductor](https://www.conductor.build/markdown/join-us)
- [Pricing](https://www.conductor.build/markdown/pricing)
- [Privacy notice | Conductor](https://www.conductor.build/markdown/privacy)
- [Conductor Teams](https://www.conductor.build/markdown/team-plan)
- [Terms of service | Conductor](https://www.conductor.build/markdown/terms)

## Docs

- **Get Started**
- [Introduction](/docs): Learn what Conductor is and where to start in the docs
- [Install](/docs/installation): Get Conductor running on your Mac
- [Your first workspace](/docs/first-workspace): Import a repository, configure it, and start agent work in an isolated Conductor workspace
- [Configure your project](/docs/configure-your-project): Set up shared Conductor project settings for new workspaces

- **Cloud**
- [What is Conductor Cloud?](/docs/cloud): Run coding agents in shared cloud workspaces with your team
- [Set up cloud](/docs/cloud/getting-started): Connect GitHub, add an agent credential, and set up your Cloud Computer
- [Work with cloud workspaces](/docs/cloud/working-with-cloud-workspaces): Use workspace status, SSH, file sync, terminals, and forwarded ports
- [Multiplayer](/docs/cloud/collaboration): Find team work, share chats, follow workspaces, and hand work to a teammate
- [Cloud Computer](/docs/cloud/cloud-computer): Configure the shared repositories, environment, software, and builds for your organization
- [Environment variables](/docs/cloud/environment-variables)
- [Cloud FAQ](/docs/cloud/faq): Plans, specifications, pricing, and security for Conductor Cloud

- **Concepts**
- [Isolated workspaces](/docs/concepts/workspaces-and-branches): Understand projects, repositories, workspaces, branches, working trees, and running environments
- [Workflow](/docs/concepts/workflow): How Conductor turns isolated workspace streams into reviewed pull requests
- [Parallel agents](/docs/concepts/parallel-agents): Choose when to split work across workspaces or inside one workspace
- [Testing](/docs/concepts/testing): Automate testing in Conductor
- [Git worktrees](/docs/concepts/git-worktrees): Understand how Conductor uses Git worktrees to create isolated coding-agent workspaces

- **How-to Guides**

- **Setup**
- [Configure settings](/docs/guides/configure-settings): Set personal defaults, project settings, and local project overrides in Conductor
- [Use Files to copy](/docs/guides/use-files-to-copy): Copy .env files and other gitignored local config into local Conductor workspaces
- [Configure model providers](/docs/guides/providers): Set up Claude Code, Codex, OpenCode, and Cursor credentials in Conductor
- [Set up MCP servers](/docs/guides/configure-mcp-servers): Add MCP servers for Claude Code, Codex, and Cursor Composer workflows so agents can use shared tools and context
- [Work with Cursor](/docs/guides/migrate-from-cursor): Run Cursor sessions in Conductor, open workspaces in Cursor or VS Code, and bring Cursor MCP servers and rules into Conductor

- **Repository**
- Repository layouts: Work with larger repository and service layouts
  - [Work in monorepos](/docs/guides/repositories/monorepos): Control which directories agents can see in a monorepo workspace
  - [Linking multiple directories](/docs/guides/repositories/linking-multiple-directories): Let one workspace read and edit code across related repositories

- **Workspace**
- Parallel agents
  - [Run multiple Claude Code sessions in parallel](/docs/guides/parallel-agents/run-multiple-claude-code-sessions): Use Conductor workspaces to run several Claude Code tasks at once without sharing one checkout, branch, or review path
  - [Run multiple Codex sessions in parallel](/docs/guides/parallel-agents/run-multiple-codex-sessions): Use Conductor workspaces to run several Codex tasks at once with separate branches, files, terminals, and review state
  - [Run multiple Cursor sessions in parallel](/docs/guides/parallel-agents/run-multiple-cursor-sessions): Use Conductor workspaces to run several Cursor tasks at once with separate branches, files, terminals, and review state
- [From issue to PR](/docs/guides/issue-to-pr): Take a GitHub or Linear issue through implementation, review, and pull request
- [Review and merge a workspace](/docs/guides/review-and-merge): Use Conductor's review, checks, and PR tools before merging

- **Git**
- Git Worktrees
  - [Run Claude Code with Git worktrees](/docs/guides/git-worktrees/run-claude-code-with-git-worktrees): Use Claude Code in Conductor workspaces so parallel sessions get separate branches, files, and setup
  - [Run Codex with Git worktrees](/docs/guides/git-worktrees/run-codex-with-git-worktrees): Use Codex in Conductor workspaces so each task gets its own branch, files, and run environment

- **Reference**
- API: Drive Conductor cloud workspaces from code and MCP clients
  - [Conductor API](/docs/api): Drive Conductor cloud workspaces programmatically over HTTP
  - [Conductor MCP server](/docs/api/mcp): Connect an MCP client to create and manage Conductor cloud workspaces
- Settings: Settings model, supported keys, and examples
  - [Settings](/docs/reference/settings): How Conductor settings configure workspaces, scripts, agents, and projects
  - [User and project settings](/docs/reference/settings/user-project): Reference for Conductor user, project, and local project settings
  - [Managed settings](/docs/reference/settings/managed): Reference for organization-managed Conductor settings
  - [Settings reference](/docs/reference/settings/reference): Conductor settings keys by scope
  - [Sample settings configurations](/docs/reference/settings/example): Example repository settings files for Conductor
- Running your projects: Configure setup, run, Spotlight testing, and archive workflows
  - [Scripts](/docs/reference/scripts): Reference for setup, run, and archive scripts
  - [Run script reference](/docs/reference/scripts/run): Run scripts are covered in the project scripts reference
  - [Setup script reference](/docs/reference/scripts/setup): Setup scripts are covered in the project scripts reference
  - [Share repository settings with teammates](/docs/reference/scripts/share-with-teammates): Commit .conductor/settings.toml so a repository can share Conductor scripts and settings
  - [Spotlight testing](/docs/reference/scripts/spotlight-testing): Test one workspace from the repository root
- [Files to copy](/docs/reference/files-to-copy): Configure gitignored files that Conductor copies into new workspaces
- [.worktreeinclude](/docs/reference/worktreeinclude)
- [Conductor environment variables](/docs/reference/environment-variables): Variables available to workspace terminals, agents, and scripts
- [Shell configuration](/docs/reference/shells): Configure shell setup
- [Cities](/docs/reference/cities): How Conductor names workspaces after cities
- Harnesses: Claude Code, Codex, Cursor, and OpenCode support in Conductor
  - [Overview](/docs/reference/harnesses): Compare the harnesses Conductor can run and where each one is configured
  - [Claude Code](/docs/reference/harnesses/claude-code): Details for running Claude Code inside Conductor
  - [Codex](/docs/reference/harnesses/codex): Details for running OpenAI Codex inside Conductor
  - [Cursor](/docs/reference/harnesses/cursor): Details for running the Cursor Agent harness inside Conductor
  - [OpenCode](/docs/reference/harnesses/opencode): Details for running the OpenCode harness inside Conductor
- [Agent modes](/docs/concepts/agent-modes)
- [Agent behavior](/docs/reference/agent-behavior): Reference for agent instructions, modes, permissions, and checkpoints
- [Slash commands](/docs/reference/slash-commands): Reusable prompt commands for agent chats
- [MCP](/docs/reference/mcp): Configure Model Context Protocol servers for Claude Code, Codex, and Cursor Composer workflows
- [Diff viewer](/docs/reference/diff-viewer): Review workspace changes, comments, and PR-ready diffs
- [Checks](/docs/reference/checks): Reference for merge readiness signals in a workspace
- [Checkpoints](/docs/reference/checkpoints): View turn by turn changes in a workspace and revert to previous turns
- [Todos](/docs/reference/todos): Track merge-blocking work in a workspace
- [Keyboard shortcuts](/docs/reference/keyboard-shortcuts): Conductor shortcuts for navigation, workspaces, chat, review, Git, terminal, and app actions
- [Deep links](/docs/reference/deep-links): Open Conductor and trigger actions via conductor:// URLs
- [Big Terminal Mode](/docs/reference/big-terminal-mode): Use a full terminal in the center panel

- **Security**
- [Security and permissions](/docs/reference/security-and-permissions)
- [Privacy](/docs/reference/privacy)

- **Troubleshooting**
- [FAQ](/docs/faq): Frequently asked questions about Conductor
- [Troubleshooting issues](/docs/troubleshooting/issues): Fix common authentication, agent, script, workspace, review, and known product issues
