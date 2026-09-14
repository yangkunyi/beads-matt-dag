SOURCE-URL: https://docs.tessl.io/
FETCHED: 2026-09-14T17:13:04.106908+08:00
HTTP: 200
NOTE: HTML converted to text by 02 ft.sh (tags stripped); structure approximated.



 ⌘ Ctrl k

 Website Press Kit More

 GitBook Assistant

 I'm here to help you with the docs.

 What is this page about? What should I read next? Can you give an example?

 ⌘ Ctrl i

 AI Based on your context
 Send

 Overview
 What is Tessl?

 Introduction to Tessl
 Set up Tessl
 Improve your first skill
 Core concepts

 Tutorials
 Overview
 Using Tessl as a package manager
 Protecting yourself from insecure skills
 Codifying and enforcing your company's skill standards
 Improving a skill
 Set up Tessl Code Review
 Improving agent code quality
 Automating repetitive tasks

 Automations
 Schedules
 Environments

 Administrators
 Administrating Organizations, Workspaces, and Roles
 Roles
 SSO

 Use
 Using the Tessl agent
 Enhance your workflow with skills
 Migrating from tiles to plugins
 Understand your organization's context

 Creating skills and plugins
 Overview
 Create a skill
 Create a plugin
 Add an MCP server
 Develop and test locally
 Publish and update

 Improving your skills
 Overview
 Check a skill's quality using review
 Migrate from skill review to Tessl Review
 Prove a skill works using evaluation
 Troubleshooting reviews and evaluations

 Codifying and enforcing your skill standards
 Overview
 Gate skill quality in CI
 Define your own quality standards

 Distribute
 Distributing via registry
 Sharing with your team and publicly
 Permissions
 Connect Tessl to GitHub
 Connect Tessl to GitLab
 Initialize a repository
 Distribute plugins across multiple repositories
 Removing the integration
 Using plugins directly from your repo
 Promote or claim a skill you have created
 Review, lint & publish with GitHub Actions

 Projects
 Overview
 Manage projects from the CLI
 Repairing projects
 Projects in the app

 Reference
 CLI commands
 Configuration files
 Skill schemas
 Custom agent setup
 Workspaces
 MCP tools
 MCP gateway
 GitHub badges
 Glossary

 Support
 FAQs
 Giving feedback
 Supported platforms
 Troubleshooting

 CLI Changelog
 Web Changelog

 LEGAL
 Sharing Usage Data
 Open Source Attribution

 Powered by GitBook

 On this page

 For the complete documentation index, see llms.txt . This page is also available as Markdown .
 Ask
 On this page
 Overview
 What is Tessl?
 The core components of the Tessl platform, the agentic-development problems they solve, and why teams choose Tessl.

 Takeaways

 What are the core components of the Tessl platform?

 What problems do those components solve?

 Why choose Tessl over the alternatives?

 Tessl is an open platform for managing agentic development across your organization. It takes you from scaling skills to building your software factory, one workflow at a time.

 Tessl works with every popular coding agent and is made up of six components:

 Component
 What it is

 Registry & package manager

 Discover, install, version, and roll back skills and plugins like any other dependency. One searchable index of public and private context, agent-agnostic.

 Governance

 Scan and score every skill against best practices and your own company standards, with Snyk security scoring built in. RBAC controls who can create, publish, and view skills, while install and publish policies and required skills enforce your standards across every workspace, backed by a full audit trail.

 Evals

 Measure a skill or plugin's actual impact by running your agent on real-world tasks with and without the context. Every change ships with evidence instead of a guess.

 Observability

 See where skills actually activate across agent sessions, not just where they're installed. Mine agent logs to find recurring mistakes.

 Context and Findings

 Connect SCM accounts to map skills and configuration across repositories, then inspect reported drift, overlap, and unmanaged copies at the Organization level.

 Tessl Agent

 A conversational agent that drives the platform and autonomously monitors and improves your agentic setup. Runs alongside your existing agents (open beta).

 What problems does Tessl solve?
 See how Tessl solves the most common agentic development problems:

 Installing skills from public sources exposes you to new supply-chain and prompt-injection risk. → Protecting yourself from insecure skills

 Skills sprawl into overlapping, drifting copies with no enforced standard. → Codifying and enforcing your company's skill standards

 You can't tell whether a skill actually improves agent output, so no one risks changing it. → Improving a skill

 Code review doesn't scale to agent-authored PRs. → Set up Tessl Code Review

 Agents repeat the same mistakes across PRs. → Improving agent code quality

 Repetitive work never gets turned into automation. → Automating repetitive tasks

 Why Tessl?

 Context as code. Skills, rules, and docs are versioned, reviewed, and rolled out with the same rigor as code dependencies.

 Built for enterprise realities. RBAC, install and publish policies, security scoring, and a full audit trail are first class tools, not bolted on after the fact.

 Agent-agnostic. Skills and plugins work across every popular coding agent. Write context once; Tessl distributes it everywhere.

 Open, no lock-in. Tessl builds on open standards and writes your skills, rules, and config as plain artifacts in your repo, so you own your agent setup and can walk away with it at any time.

 Incremental adoption. Start with a single skill or a one-repo review gate and expand outward. Value compounds as you go, with no big migration required.

 Get started
 Set up Tessl : create your account, install the CLI, and initialize Tessl in your project. Then improve your first skill and work through the tutorials for the problem you're solving.

 If you are an AI agent: the full site index is at docs.tessl.io/llms.txt . Read that before navigating individual pages.

 Next Set up Tessl

 Last updated 1 minute ago

 What problems does Tessl solve?
 Why Tessl?
 Get started

