SOURCE-URL: https://kiro.dev/docs/specs/best-practices.md
FETCHED: 2026-09-14T17:15:59+08:00
HTTP: 200

> ## Documentation Index
> Fetch the complete documentation index at: https://kiro.dev/llms.txt
> Use this file to discover all available pages before exploring further.

# Best practices

> Best practices when using Specs with Kiro

## Feature Specs

### Which workflow should I choose?

Feature Specs support two workflows: Requirements-First and Design-First.

**Choose Requirements-First when:**
- You know the behavior of the system you want to build
- Architecture is flexible and can be designed to meet needs
- Building product features driven by customer feedback
- Starting without technical constraints

**Choose Design-First when:**
- You have an existing technical design or architecture
- System must meet strict non-functional requirements (latency, throughput, compliance)
- Prototyping with a specific tech stack
- Exploring technical feasibility before committing to scope

[Learn more about workflows →](https://kiro.dev/docs/specs/feature-specs.md)

### Can I switch workflows after starting a spec?

No, you must choose a workflow when creating the spec. If you need to change approaches, create a new Feature Spec with the desired workflow. You can copy relevant content from the previous spec if needed.

### Can I use both workflows for the same project?

Yes! You can create multiple specs. For example:
1. Use Design-First to validate technical feasibility
2. Create a Requirements-First spec for full feature development

### How do I import existing designs or architecture?

If you have existing architecture diagrams or design documents:

1. **Using Design-First workflow**: 
   - Create a new Feature Spec and select Design-First
   - Upload architecture diagrams (PNG, JPG) or paste design content
   - Kiro will formalize the design into design.md
   - Derive requirements from the architecture

2. **Using images**: Export diagrams from tools like draw.io, Lucidchart, or take photos of whiteboard sketches and include them in your initial prompt.

3. **Using MCP integration**: If your design tool has an [MCP server](https://kiro.dev/docs/mcp.md), you can connect directly to import designs.

### How do I import existing requirements?

If your requirements or designs already exist in another system (such as JIRA, Confluence, or Word documents), you have two options:

1. **Using MCP integration**: If your requirements tool has an [MCP server](https://kiro.dev/docs/mcp.md), you can connect directly to import requirements into your spec session. Kiro supports both local and remote MCP servers.

2. **Manual import**: Copy your existing requirements (e.g. `foo-prfaq.md`) into a new file in your repo and open a spec chat session and say `#foo-prfaq.md Generate a spec from it`. Kiro will read your requirements, and generate requirement and design specs.

### How do I iterate on my Feature Specs?

Kiro's Feature Specs are designed for continuous refinement, allowing you to update and enhance them as your project evolves. This iterative approach ensures that specifications remain synchronized with changing requirements and technical designs, providing a reliable foundation for development.

**For Requirements-First specs:**

1. **Update Requirements**: Either modify the `requirements.md` file directly or initiate a spec session and instruct Kiro to add new requirements or design elements.

2. **Update Design**: Navigate to the `design.md` file for your spec and select **Refine**. This action will update both the design documentation and the associated task list to reflect your modified requirements.

3. **Sync files**: Navigate to the `tasks.md` file and choose **Sync Files**. This will create new tasks that map to the new requirements.

**For Design-First specs:**

1. **Update Design**: Modify the `design.md` file directly or ask Kiro to update it in a spec session.

2. **Update Requirements**: After architecture changes, ask Kiro to validate and regenerate requirements to ensure they remain feasible.

3. **Sync files**: Navigate to the `tasks.md` file and choose **Sync Files** to reflect the changes.

## Bugfix Specs

### How do I write a good bug description?

A clear bug description helps Kiro perform accurate root cause analysis. Include:

1. **Reproduction steps** - Describe the exact conditions that trigger the bug
2. **Current behavior** - What the system does now (the defect)
3. **Expected behavior** - What the system should do instead
4. **Constraints** - Any code or behavior that must not change

**Example prompt:**
```
When a user submits a form with special characters in the name field 
(e.g., O'Brien), the API returns a 500 error. It should accept the 
input and save it correctly. The validation logic for email and 
password fields should not be affected.
```

### How do I prevent regressions with Bugfix Specs?

Bugfix Specs explicitly capture "unchanged behavior" alongside the fix. During the analysis phase, document what must continue working:

- **WHEN** [condition] **THEN** the system **SHALL CONTINUE TO** [existing behavior]

Kiro generates property-based tests that validate both the fix and the preservation of existing behavior, giving you confidence that the fix doesn't break anything else.

### When should I use a Bugfix Spec vs. a quick fix?

Use a Bugfix Spec when:
- The bug is in a critical code path
- Previous fix attempts caused regressions
- The root cause isn't immediately obvious
- You need documentation for compliance or team knowledge

A quick fix in chat is fine for straightforward issues like typos, simple logic errors, or well-understood one-line changes.

### Can I convert a Bugfix Spec into a Feature Spec?

Not directly. If root cause analysis reveals that the fix requires significant new functionality, create a separate Feature Spec for the new work and keep the Bugfix Spec focused on the original defect.

## General

### How do I share specs with my team?

Specs are designed to be version-controlled, making them easily shareable across your team. Store specs directly in your project repository alongside the code they describe. This keeps all project artifacts together and maintains the connection between requirements and implementation.

### Can I share specs across multiple teams?

Yes, you can share specs across multiple teams by leveraging Git submodules or package references. Here are some best practices for managing shared specs across teams:

1. **Create a central specs repository** - Establish a dedicated repository for shared specifications that multiple projects can reference.

2. **Use Git submodules or package references** - Link your central specs to individual projects using Git submodules, package references, or symbolic links depending on your development environment.

3. **Implement cross-repository workflows** - Develop processes for proposing, reviewing, and updating shared specs that affect multiple projects.

If you have specific needs for cross-project spec management, please share your requirements on our [GitHub issue tracker](https://github.com/kirodotdev) so we can prioritize features that support your workflow.

### Can I start a spec session from a vibe session?

Yes. You can have a vibe conversation and then say `Generate spec`. Kiro will then ask you if you want to start a spec session. If you say yes, it will proceed with generating requirements based on the context of your vibe session.

### Can I execute all the tasks in my spec in a single shot?

Yes, you can execute all the tasks in your `tasks.md` file by clicking the **Run all Tasks** button. Kiro analyzes dependencies between tasks and runs independent tasks concurrently, which can significantly speed up execution. Tasks with dependencies wait their turn. This only runs incomplete tasks that are marked as required. [Learn more about running tasks in parallel →](https://kiro.dev/docs/specs.md#running-tasks-in-parallel)

### Can tasks run in parallel?

Yes. When you click **Run all Tasks**, Kiro builds a dependency graph of your tasks and groups independent ones into waves that execute concurrently. No configuration needed. [Learn more →](https://kiro.dev/docs/specs.md#running-tasks-in-parallel)

### When should I use Quick Spec vs standard Feature Specs?

**Use Quick Spec when:**
- You're working on a well-understood feature where you trust Kiro's output
- You're rapid prototyping and want speed over review
- You rarely edit requirements or design in the standard flow
- You've been defaulting to Vibe mode because the standard Spec flow felt too heavy

**Use standard Feature Specs when:**
- You're exploring unfamiliar territory
- Requirements or design need iteration
- You're working in a compliance-sensitive domain where review gates add real value
- Your team benefits from explicit approval checkpoints

Both produce the same artifacts (`requirements.md`, `design.md`, `tasks.md`). The difference is whether you review each one before the next is generated. [Learn more about Quick Spec →](https://kiro.dev/docs/specs/quick-spec.md)

### When should I analyze my requirements before moving to design?

After Kiro generates your requirements, you can select **Analyze Requirements** to run a deep analysis that catches logical inconsistencies, ambiguities, conflicting constraints, and gaps. It's especially valuable for:

- Complex features with many requirements where interactions matter
- Domain-sensitive projects (financial services, healthcare, compliance) where ambiguity is costly
- [Quick Spec](https://kiro.dev/docs/specs/quick-spec.md) sessions where requirements were auto-generated without manual review

The analysis takes minutes (not seconds) because it reasons across your full requirement set. For small or well-understood specs, you can skip it and proceed directly to design. [Learn more →](https://kiro.dev/docs/specs/analyze-requirements.md)

### What if some tasks are already implemented?

When working on an existing codebase, you might find that some tasks in your spec are already complete because a coworker or you ended up doing it in another session. Here are two ways to handle this:

**Option 1: Click on Sync Files in your tasks.md**
- Open your `tasks.md` file
- Click **Sync Files**
- Kiro will automatically mark completed tasks.

**Option 2: Let Kiro scan for you in a spec chat session**
- In a spec session, ask Kiro: "Check which tasks are already complete"
- Kiro will analyze your codebase and identify implemented functionality
- Kiro will automatically mark completed tasks

This keeps your task spec accurate.

### How do I reference a spec in chat?

You can reference any spec from your specs list in chat conversations using the `#spec` context provider. Type `#spec` and press Enter to see a list of available specs, then select the one you want to include. Kiro automatically includes all spec files (requirements.md, design.md, and tasks.md) in the conversation context to ensure responses align with your documented specifications.

### When should I use #spec in chat?

Using `#spec` is particularly helpful when you need context-aware assistance:

- **Implementing tasks** - Generate code that aligns with your design decisions and meets acceptance criteria
- **Refining specs** - Request changes to requirements, design, or tasks based on new insights
- **Validating work** - Check if your implementation matches the spec's requirements
- **Asking questions** - Get answers about your feature's architecture or design

**Examples:**

```
#spec:user-authentication implement task 2.3
#spec:user-authentication update the design file to include password reset flow
#spec:user-authentication does my current implementation meet the acceptance criteria for task 7.1?
#spec:user-authentication why did we choose JWT over session-based authentication?
```

### How many specs can I have in a single repo?

You can have as many specs as you want in a single repo. We recommend creating multiple specs for different features for your project rather than attempting to just have a single one for your entire codebase.

For example, in an e-commerce application, you might organize your specs like this:

```
.kiro/specs/
├── user-authentication/       # Login, signup, password reset
├── product-catalog/           # Product listing, search, filtering
├── shopping-cart/             # Add to cart, quantity updates, checkout
├── payment-processing/        # Payment gateway integration, order confirmation
└── admin-dashboard/           # Product management, user analytics
```

This approach allows you to:
- Work on features independently without conflicts
- Maintain focused, manageable spec documents
- Iterate on specific functionality without affecting other areas
- Collaborate with team members on different features simultaneously
