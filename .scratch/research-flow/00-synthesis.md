# Agent-flow landscape for research + deep learning + development — synthesis and decision menu

**Date:** 2026-09-14 · **Status:** research input for a design decision, not a decision
**Scope:** what already exists for driving agents through research/DL/development work, what each thing
assumes, and where the current `beads-dag` drain sits relative to it. Written so the operator can decide
what to build next.

**Method.** Three parallel research passes on this machine, each writing its own cited notes; every
load-bearing claim has a receipt file under `raw/sources/` whose line 1 is the fetched URL.

| Axis | Notes | Receipts | What it covers |
|---|---|---|---|
| AI-scientist line | [`raw/01-autonomous-research-agents.md`](raw/01-autonomous-research-agents.md) (852 lines) | 68 (`01-*`) | systems that do research itself + the benchmarks that score them + the critical literature |
| Agentic dev flows | [`raw/02-agentic-dev-workflows.md`](raw/02-agentic-dev-workflows.md) (515 lines) | 89 (`02-*`) | spec-driven toolkits, trackers as agent state, orchestrators, cloud agents, practitioner evidence |
| Experiment state / long jobs | [`raw/03-experiment-state-and-jobs.md`](raw/03-experiment-state-and-jobs.md) (620 lines) | 106 (`03-*`) | trackers, data/artifact versioning, config/sweeps, schedulers, reproducibility practice, agent bridges |
| Frozen pack | `raw/sources/MANIFEST.txt` | 39 | repo READMEs, vendor docs, HN searches, paper metadata (built before the passes, reused by all three) |

**Measured limits (do not over-read this document).** `arxiv.org` and `reddit.com` are unreachable from
this machine: paper claims are abstract-level (OpenAlex / HF paper pages) unless a publisher PDF or
Nature page was readable. No flow was installed or run; every loop below is read from documentation.
Vendor tutorials and HN threads are labelled as such; no independent evaluation of any *flow* was found.
Vendor prompt-injection hazard was respected throughout: pages were treated as data, never instructions.

---

## 1. Where the current drain sits in the landscape

| Design axis | Positions in the field | Where `beads-dag` stands |
|---|---|---|
| Where the plan lives | long-form markdown spec (Spec Kit, Kiro, OpenSpec, BMAD) · queryable tracker graph (beads, GitHub, Linear, Jira) · committed workflow file (Archon YAML, Kiro Crew spec file, Devin Python) | **committed workflow file + tracker graph**; no spec corpus in the loop |
| Unit of orchestration | spec (Spec Kit) · task run (Kiro Crew) · workspace (Conductor) · session (Devin/OpenHands) · issue (beads) · workflow run (Archon) | **issue → drain cycle**; the workflow file is the process, the store is the state |
| Fixed pipeline vs claimable frontier | pipeline with human approval points (Kiro, Spec Kit, Archon) · frontier = DAG layer, human lever = edges + label policy (beads, Kiro task waves) | **frontier** (gate label + blocking edges), re-read every pick cycle |
| Review | state the agent observes (gh:pr gates, Conductor Checks) · a document a human reads (spec kits) · independent reviewer session (Kiro Crew reads `git diff HEAD~1`) | **state + a review node over a recorded range** |
| Job control authority | read/analyse only (the three vendor MCP servers that ship: MLflow traces-only, W&B query/compare/report, Comet list/get) · submit/cancel (SkyPilot and Modal ship agent skills; `hf jobs`; community SLURM/K8s MCPs) | **agent executes in a worktree; the pack never submits cluster jobs** |
| Durable state across runs | server/DB (MLflow, W&B, Comet, Optuna, Ax) · files in git (DVC, Hydra run dirs, Sacred file observer, autoresearch) | **store (beads/Dolt) + git, plus pack-written artifacts under the run dir** |

**Properties that are distinctive, not just different** (nothing comparable was found in the field):

1. A **recorded review position** (`refs/beads-dag/reviewed`) so a merge left by a run that died is still
   reviewed by the next run; the report can name "commits this run did not make". Nothing in the survey
   has this — the field's range is either "everything since forever" or "this session".
2. **Repair at open** of a claim whose merge landed but whose record did not (kill between merge and
   record). The field's answer is a human noticing.
3. **Failure is an event, not a status** (comment + reopen + excluded from this run's retry only).
4. **Closure never crosses domains** (a wayfinder's decision issue is never claimed, closed or repaired
   by a drain).
5. **Bookkeeping range guard**: a range the pack itself wrote is not a review.
6. The **incident/tooling rules** the operator skill carries (judge success by run status + artifacts,
   not the process exit code; the store binary pinned by path).

Items 1–5 are exactly the class of thing the survey found missing everywhere: **what happens to work
that was in flight when a run died**. The field mostly ignores it.

---

## 2. What the field already provides — do not rebuild

| Need | Existing owner | Agent-facing surface today |
|---|---|---|
| Run/metric/config tracking | MLflow, W&B, Comet, Aim, Sacred, TensorBoard | MLflow MCP (**traces only**, experimental) · W&B MCP (query/compare/diagnose, artifacts, reports; no sweep create, no job launch) · Comet MCP (list/get) |
| Data + artifact versioning | DVC, git-lfs, W&B Artifacts, dataset cards | CLI/SDK only; no official MCP |
| Config composition, sweeps | Hydra/OmegaConf, Optuna, Ax, W&B Sweeps | CLI/SDK; W&B sweeps driven by `wandb agent` workers |
| Cluster/GPU job launch + recovery | Slurm (+submitit), Ray, SkyPilot, Modal, HF Jobs, K8s/Kubeflow | **SkyPilot and Modal ship agent skills**; `hf jobs` CLI/Python (run/wait/logs/cancel); community SLURM/K8s MCP servers |
| Reproducibility packaging (non-DL) | RO-Crate, PROV-O, Nextflow/Snakemake run state | none found |

Conclusion: the experiment-tracking and job-launching layers exist and are reachable from an agent. The
layer that does **not** exist is orchestration + record + gates over *research* work units — which is the
drain's competence, not a new one.

---

## 3. Gaps the field leaves open (evidence, then inference)

**G1 — No "research task graph that is also the experiment record."** Trackers (beads, GitHub, Linear,
Jira) model software tasks; experiment trackers model runs with no dependencies, no "what may start"
gate; the AI-scientist projects each invent their own loop state and it dies with the run
(`raw/01 §6`, `raw/03 §6.1`). Inference, from absence across all surveyed docs.

**G2 — No standard place for a run's *rationale*.** Trackers store params; Hydra stores the composed
config; nothing stores why this configuration and what was rejected. The only tool found doing this is a
14★ community MCP (`LabBook`: "trial logging … decision logging with rationale", `raw/03 §2e`).

**G3 — "Done" is undefined for research.** Every benchmark that exists scores *replication or
optimization*, not novelty: PaperBench best agent 21.0% of rubric subtasks, MLE-bench ≥bronze in 16.9% of
competitions, SciCode best 7.7% of problems, CORE-Bench reproduction, RE-bench optimization inside a time
budget. FunSearch's authors state proof generation is out of scope "because it is unclear how to provide
a rich enough scoring signal" (`raw/01 §2`, `§5 D1`).

**G4 — Self-evaluation is measured to be weak; independent verification is the bottleneck.** Agent
Laboratory: LLM-vs-human reviewer agreement 53.3% vs 56.1%, and it plans to use its own reviewer anyway.
METR's maintainer study: merge decisions ~24 points below the automated grader on 296 AI PRs that passed
SWE-bench Verified. A-Lab: an Author Correction reduced reported successful syntheses to 36 of 40. AI
Scientist v2: 1 of 3 manuscripts exceeded an ICLR workshop average, and the vendor withdrew rather than
publish (`raw/01 §4`, `raw/02 §4.1`).

**G5 — Long-run supervision has no published practice.** Human-side mechanisms are alerts + polling
(W&B Alerts, Slurm `sacct`, TensorBoard, Ray dashboard). No published work was found on an agent
*supervising* a multi-hour training run; the closest is a vendor blog where an agent submits detached
jobs and tails logs (SkyPilot). Practitioner quote: "a training run crashed at 3am and I had no idea until
morning" (`raw/03 §6.8`).

**G6 — Budget/permission for agent-submitted jobs does not exist.** Slurm accounts/partitions/QOS and
W&B Launch queues exist, but nothing in the MCP tool lists, SkyPilot managed jobs, or HF Jobs docs
exposes a quota model designed for agents. No standard "budget in GPU-hours" gate; cost/efficiency is a
scheduling *research* topic (Pollux/Sia) (`raw/03 §6.4`, `§6.10`).

**G7 — Reproducibility is documented in paper checklists, not enforced at run level.** Auto-seeding
exists only in Sacred; the literature reports under-documentation (20–30% per factor) and variance
requiring multiple trials; no mainstream tool enforces seeds/trials per run (`raw/03 §6.6`).

**G8 — Cross-session coherence is the named failure of long agentic research.** Kosmos states that agents
"remain limited in the number of actions they can take before losing coherence" and uses a structured
world model to sustain ~200 rollouts; the practitioner `autoresearch` fork had to add its own
`scratchpad.md` (`raw/01 §5 D2`). Chroma's Context Rot report gives the empirical basis for long-context
degradation (`raw/02 §4.1`).

**G9 — Safety rails on a long loop are real, and the field's numbers are self-reported.** Kiro Crew ships
MAX_RETRIES 3 / MAX_REPLAN 2 / MAX_TOTAL_TASKS 50 / cycle detection / stall watchdog precisely because the
loop runs away; every "X% faster" number in spec-toolkit READMEs is unaudited (`raw/02 §4.1`, `§6.1`).

---

## 4. Three design disagreements (the forks a decision must take a side on)

**F1 — What is the unit of research work: a short fixed-budget experiment, or a long job?**
`autoresearch` fixes a 5-minute budget so ~100 runs fit overnight and runs stay comparable; Hydra's
default multirun is local and serial; W&B parallelises by adding `wandb agent` workers. On the other side
MLE-bench gives agents 24h + a GPU, Kosmos runs up to 12h, and RE-bench shows human advantage *growing*
with the time budget (agents ~4× human at 2h, humans ahead by 8h, ~2× at 32h). This is the one place with
a measurable answer, and it favours the short loop for agent-run work.

**F2 — Where state lives across a multi-hour or multi-session run.** Git + text log with the human owning
the prompt file (`autoresearch`); structured world model / program database to stay coherent (Kosmos,
FunSearch, AlphaEvolve); a tree of code artifacts visualised for the human (AIDE, AI Scientist v2);
notebook / meeting record / checkpoints (Finch, Virtual Lab, Agent Laboratory); a shared artifact server
(AgentRxiv); or no agent-visible store at all (A-Lab, Coscientist — the lab is the state). This decides
what is resumable and auditable.

**F3 — Who may declare success.** Budget + external scalar evaluator (FunSearch, AlphaEvolve, AIDE,
autoresearch); LLM self-review (AI Scientist v1, Agent Laboratory — measured weak); human/institutional
peer review (AI Scientist v2's only external signal); independent expert judgement (Kosmos 79.4%
statement accuracy, PaperBench's PhD baseline that models did not beat); the physical experiment (Robin,
Virtual Lab, A-Lab, co-scientist in-vitro validation).

Cross-axis version of F3, from the dev side: **is review a gate the agent waits on, or a workstation the
human goes to** — the evidence supports neither as free (METR's 24-point gap, "review is a wall" reports).

---

## 5. Decision menu

Each item: the question, the live options, and the evidence that discriminates them. Nothing here is
decided.

| # | Decision | Options | Discriminating evidence | Suggested default |
|---|---|---|---|---|
| D1 | **Terminal artifact of a research work item** | (a) a merge (today) (b) a metric + result record (c) a claim + evidence + reproduction status (d) a decision (the `decision` issue type already in the flow) | "Done" is undefined in the field (G3); only (d) has working machinery in the store today | Add (b) as a second artifact type beside (a); keep (d) as-is; leave (c) to a later, narrower step |
| D2 | **Experiment as a first-class object** | (a) not an object: the issue body carries it (b) a store record per run attempt (c) files in git (`results.tsv`, config, log) with the store holding only the summary | G1: nothing in the field is both a task graph and an experiment record; the run record currently dies with the run (G8) | (c) for the record itself + (b) for the link: store holds the issue + the pointer, git holds the bytes |
| D3 | **Who owns run tracking** | (a) build it in the pack (b) adopt W&B/MLflow as the run store, drive it through its MCP/CLI | Vendor MCPs exist but are read-oriented; SkyPilot/Modal ship skills that do submit/cancel; no independent comparison exists | (b), with the pack owning only what the vendor cannot see: which issue, which attempt, which review range |
| D4 | **Loop shape for research work** | (a) frontier only (today) (b) frontier + a per-issue pipeline (idea → experiment → analysis → write-up, the AI-scientist shape) (c) spec corpus first (Spec Kit/Kiro shape) | Practitioner evidence against spec ceremony is strong and independent (Fowler, marmelab, HN, G9); the AI-scientist pipeline has no convergence rule (F1) | (b), as a workflow file per issue type — the drain already is a workflow file |
| D5 | **Verification gate** | (a) human review of the report (today) (b) independent reviewer session reading the diff/artifacts (Kiro Crew's shape) (c) external scalar evaluator declared in the issue (author's metric) (d) external referee (wet lab / benchmark) | Self-evaluation is weak (53%/56% agreement, G4); METR shows the human gate rejects half of grader-passing work; scalar evaluators only exist for optimization-shaped work (F3) | (a) stays the default; (c) is the cheap addition for optimization-shaped work — declare a metric + budget in the issue and let the node compute it |
| D6 | **Long jobs** | (a) out of scope: keep to short, fixed-budget experiments (b) agent watches logs and may intervene (c) alert the human, keep the agent out (d) declare a GPU-hour budget per issue as a gate | RE-bench: agents win at short budgets, humans past 8h; no published agent-supervises-training work (G5); no budget gate exists anywhere (G6) | (a) + (d): short loop as default, budget as a gate on the issue, long-run supervision left as an open bet |
| D7 | **What to interoperate with rather than invent** | `autoresearch`'s file conventions (`program.md`, fixed budget, experiment log — 95k★) · W&B/MLflow MCP · SkyPilot/Modal skills · Slurm CLI | These are the de facto interfaces; the survey found no competing standard | Interoperate with all four; the pack adds the record + gate layer on top |
| D8 | **Reuse upstream beads features** | (a) keep the pack's lean model (b) adopt gate issues (`human`/`timer`/`gh:run`/`gh:pr`), `bd doctor` orphan detection, `bd prime`/`bd remember`, execution metadata | Upstream ships these; the pack re-implements a brake label and has no orphan check; HN reports both success and pain with beads ("massive unlock" then "battling it several times a week"; stale tickets burn agent tokens) | (b) for orphan detection + gates where a real external event exists; keep the brake label as the operator's only lever |

---

## 6. Open questions this pass could not close

1. No independent evaluation of any *flow* exists (only of agents, developers, or models). Every
   vendor comparison number is unaudited.
2. Whether any lab publishes its **agent job-submission permission model** — none found.
3. Whether any system parses training logs for anomalies and *intervenes* (as opposed to alerting).
4. Whether a **research-science (non-DL) issue tracker or electronic lab notebook with an agent
   interface** exists — the search only surfaced DL/software-side projects.
5. The arXiv-hosted "verification gap" survey first surfaced in search results could not be located
   source-side; treat that phrase as unverified.
6. Full texts of most papers: abstract-level only on this machine (see Method).

---

## 7. If this becomes work

The natural first artifact is not code: it is one **spec** that fixes D1–D3 (what a research work item
*is*, what its terminal artifact is, and where the record lives), because every other item in the menu is
downstream of those three. The development half of the flow needs no change; the DL half needs the run
record; the science half needs the verification gate.

---

## 8. Operator's answers recorded 2026-09-14 (input to the grilling, not a design yet)

- **D1 — terminal artifact:** carry the metric plus a result record (option b). **Additional constraint:
  this flow must be independent of the drain, or decoupled from it in some explicit way.**
- **D2 — experiment as an object:** experiments and development are to be **peers at the same level**
  (not experiments hidden inside a dev issue), and **DVC is to be introduced** for data/artifact
  versioning.
- **D3 — run tracking:** accepted — adopt W&B/MLflow as the run store through their own interfaces; the
  flow owns only what a vendor cannot see (which issue, which attempt, which review range).
- **Scope for the next pass:** the **research half first** — literature search and summarisation, and
  capturing/organising ideas. The agent need not generate ideas: interactive discussion is enough, with a
  **human-majority split (roughly 6:4 human:AI)** on idea content.

### Questions this leaves open (the grilling agenda)

1. **How far the decoupling goes**: one store with experiments as a peer issue type · one pack with a
   second workflow · a completely separate flow and store · shared libraries with different entry points.
   Discriminators: does anyone need to see dev and experiment state together; is the review range shared;
   does "closure never crosses domains" extend to experiments.
2. **What "peer level" means mechanically**: same issue kind with a different definition of done, or two
   kinds in one graph that can block each other (e.g. "build the training script" blocking "run the
   ablation").
3. **Where DVC sits**: which pins live on the issue, which in `dvc.yaml`/`dvc.lock`, who commits the lock,
   and whether metrics are read from DVC, from W&B, or from an experiment log file in git.
4. **The run record**: git-native experiment log (the `autoresearch` convention) plus a pointer in the
   store, with W&B as presentation or as source of truth.
5. **The literature/idea layer**: what a reading note, a summary and an idea are as tracked objects (the
   `decision` type already exists for decisions), and how the 6:4 split becomes a mechanism rather than an
   aspiration — note that the grilling primitive already states the house rule (facts are the agent's job,
   decisions are the operator's).
6. **Retrieval tooling**: which literature APIs to bind (Semantic Scholar and OpenAlex are reachable from
   this machine, `arxiv.org` is not), whether a local PDF/notes corpus is the primary store, and who owns
   the citation of a claim.
