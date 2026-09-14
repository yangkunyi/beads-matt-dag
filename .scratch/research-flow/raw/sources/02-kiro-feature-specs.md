SOURCE-URL: https://kiro.dev/docs/specs/feature-specs.md
FETCHED: 2026-09-14T17:15:54+08:00
HTTP: 200

> ## Documentation Index
> Fetch the complete documentation index at: https://kiro.dev/llms.txt
> Use this file to discover all available pages before exploring further.

# Feature Specs

> Build new features with structured requirements, technical design, and implementation planning

Feature Specs provide a structured approach to building new features, guiding you through requirements gathering, technical design, and implementation planning. Depending on your starting point, whether you have clear user requirements or a technical design in mind, you can choose between two workflow variants that adapt to your development process.

## Key Benefits

**Structured approach** - Clear phases guide you from idea to implementation

**Flexibility** - Choose the workflow that matches your starting point

**Documentation** - Automatic generation of requirements and design docs

**Tracking** - Monitor progress across discrete implementation tasks

**Collaboration** - Shared artifacts for product and engineering alignment

## When to Use Feature Specs

**Best for:**
- Complex features requiring structured planning
- Features with multiple implementation tasks
- Projects needing documentation for team collaboration
- Features where requirements or design need iteration

**Not ideal for:**
- Bug fixes (use Bugfix Specs instead)
- Exploratory coding without clear goals

## Workflow Variants

Feature Specs support two workflow variants to accommodate different development scenarios. Choose the workflow that best matches your starting point and project constraints.

### Requirements-First

Start with the behavior of the system you want to create, captured as requirements, then generate technical design and implementation tasks.

``` mermaid
flowchart TD
    accTitle: Requirements-first spec workflow
    accDescr: Start a spec leads to requirements.md, then design.md, then implementation, with edit and request-changes loops at each approval gate.
    A["Start a spec"] --> B["requirements.md"]
    B --> C{Happy?}
    C -->|no| D["Edit/Request changes"] --> B
    C -->|yes| E["design.md"]
    E --> F{Happy?}
    F -->|no| G["Edit/Request changes"] --> E
    F -->|yes| H["Implementation"]
```

**When to use:**
- You know the behavior of the system you want to build
- Architecture is flexible and can be designed to meet needs
- Building product features driven by customer feedback
- Starting a greenfield project without technical constraints
- Working in a product-led organization

**Flow:** Requirements → Design → Tasks

### Design-First

Start with technical design (architecture or low-level design), then derive feasible requirements and implementation tasks.

``` mermaid
flowchart TD
    accTitle: Design-first spec workflow
    accDescr: Start a spec leads to design.md, then requirements.md, then implementation, with edit and request-changes loops at each approval gate.
    A["Start a spec"] --> B["design.md"]
    B --> C{Happy?}
    C -->|no| D["Edit/Request changes"] --> B
    C -->|yes| E["requirements.md"]
    E --> F{Happy?}
    F -->|no| G["Edit/Request changes"] --> E
    F -->|yes| H["Implementation"]
```

**When to use:**
- You have an architecture in mind (high-level design)
- You want to start with implementation behavior through pseudocode and algorithms (low-level design)
- System must meet strict non-functional requirements (latency, throughput, compliance)
- Porting design documents from other tools into Kiro
- Exploring technical feasibility before committing to scope

**Flow:** Design → Requirements → Tasks

### Quick Comparison

| | Requirements-First | Design-First |
|---|---|---|
| **Start with** | System behavior, captured as requirements | Technical design, architecture or pseudocode |
| **Generate** | Design from requirements | Requirements from design |
| **Best for** | Product-driven development | Technically-constrained or design-driven projects |
| **Ensures** | Desired behavior is specified | Technical feasibility |
| **Flexibility** | Implementation can adapt | Requirements can adapt |

**💡 Tip:** For well-understood features where you trust Kiro's output, **[Quick Spec](https://kiro.dev/docs/specs/quick-spec.md)** runs all three phases automatically without approval gates between them. You answer clarifying questions up front and land directly on the task list.

## Requirements with EARS Notation

The `requirements.md` file uses EARS (Easy Approach to Requirements Syntax) notation to provide structured, testable requirements. Each requirement follows this pattern:

```
WHEN [condition/event]
THE SYSTEM SHALL [expected behavior]
```

For example:

```
WHEN a user submits a form with invalid data
THE SYSTEM SHALL display validation errors next to the relevant fields
```

This structured approach offers several benefits:

- **Clarity**: Requirements are unambiguous and easy to understand
- **Testability**: Each requirement can be directly translated into test cases
- **Traceability**: Individual requirements can be tracked through implementation
- **Completeness**: The format encourages thinking through all conditions and behaviors

## Analyzing requirements before design

Before moving from requirements to design, you can ask Kiro to analyze your requirements for logical inconsistencies, ambiguities, conflicting constraints, and gaps. Select **Analyze Requirements** from the chat options or the Continue dropdown in the editor after requirements are generated.

[Learn more about Analyze Requirements →](https://kiro.dev/docs/specs/analyze-requirements.md)

## Design Documentation

[Video](https://kiro.dev/videos/specs-design.mp4)

The `design.md` file documents technical architecture, sequence diagrams, and implementation considerations. It captures the big picture of how the system will work, including components and their interactions.

``` mermaid
flowchart TD
    accTitle: Contents of a design.md document
    accDescr: A design.md document branches into Architecture, Data Flow, Interfaces, Data Models, Error Handling, Unit Testing Strategy, and more.
    A["design.md"] --> B["Architecture"]
    A --> C["Data Flow"]
    A --> D["Interfaces"]
    A --> E["Data Models"]
    A --> F["Error Handling"]
    A --> G["Unit Testing Strategy"]
    A --> H["..."]
```

## Getting Started

Feature Specs start like any other spec - see [Getting started](https://kiro.dev/docs/specs.md#getting-started) for the per-surface steps. When Kiro asks for your intent, choose **Feature**, then pick your workflow: **Requirements-First** or **Design-First**. For well-understood features where you don't need approval gates between phases, select **[Quick Spec](https://kiro.dev/docs/specs/quick-spec.md)** instead.

You can also set a default workflow in your Kiro settings to skip the selection step.

## Learn More

  - [Best Practices](https://kiro.dev/docs/specs/best-practices.md) — Tips for effective Feature Spec usage
