# 01 — Autonomous LLM research agents ("AI scientist" line): landscape notes

Axis: agents that do research itself. Written for the parent task ("report what EXISTS and what it
ASSUMES; do not design, do not recommend"). Citation convention: every claim carries the URL actually
read; anything known but not read source-side is prefixed "UNVERIFIED:"; arXiv-only papers are marked
"abstract only" because arxiv.org is not reachable from this machine.

## 1 Scope and method

- Fetching was done with `curl --max-time 25` from this machine (2026-09-14). Reachable and used:
  `raw.githubusercontent.com`, `api.github.com`, `huggingface.co/papers/<id>`, `api.openalex.org`,
  `hn.algolia.com`, `nature.com` (HTML + some PDFs), `aclanthology.org`, `sakana.ai`,
  `metr.org`, `api.crossref.org`, `www.ebi.ac.uk/europepmc`, `storage.googleapis.com` (DeepMind
  whitepaper PDF), `alphaxiv.org` (abstract mirror). Not reachable: arxiv.org, openai.com (403),
  research.google (timeout), docs.futurehouse.org (DNS), edisonscientific.com article (404),
  assets.cureus.com (403). `pdftotext` was available and used for the PDFs that did download.
- Read from the frozen pack (line 1 of each file records its URL): `repo-ai-scientist.md`,
  `repo-ai-scientist-v2.md`, `repo-aide.md`, `repo-agent-laboratory.md`, `repo-mle-bench.md`,
  `repo-frontier-evals.md`, `repo-paper-qa.md`, `repo-robin.md`, `repo-aviary.md`,
  `paper-agent-laboratory.md`, `paper-funsearch.md`, `hn-ai-scientist-agent.md`,
  `hn-llm-agent-research-experiments.md`.
- New receipts added by me under `raw/sources/01-*.md` (same header format). They include
  Hugging Face paper pages (abstract + authors + HF's own "AI summary" where present), OpenAlex
  records (title/abstract/year/DOI), Nature HTML pages, two publisher PDFs converted to text
  (AlphaEvolve whitepaper, Agent Laboratory), GitHub READMEs, HN item JSON reduced to readable
  comment text, and practitioner blog posts.
- What "abstract only" means here: I could not open arXiv PDFs/HTML. For papers whose only
  location I could read is an abstract page, I say so per claim. Where a Nature page or publisher
  PDF gave more than the abstract (FunSearch, A-Lab, AlphaEvolve, Agent Laboratory, PaperBench
  README, etc.) I used that.
- This file covers systems that *do research*; it does not cover the issue-tracker/drain flow
  itself (other children own that). Two practitioner flows (Karpathy `autoresearch`, SkyPilot
  scaling) are included because they are the closest thing found to a research analogue of a
  drain loop with an on-disk experiment log.

## 2 Comparison table

Columns: system | what it is | unit of work | state store | the loop | how "done" is decided |
source.

| System | What it is | Unit of work | State store | The loop | How "done" is decided | Source |
|---|---|---|---|---|---|---|
| **AI Scientist v1** (Sakana, 2024) | End-to-end paper generator over a human-written code template | A "research idea" → one full LaTeX paper | Files in the template run dir (`experiment.py --out_dir run_N`), figure/notes JSON, papers; an "open-ended" archive of ideas is claimed in the blog | 4 phases: idea generation (+Semantic Scholar novelty check) → experimental iteration (code edits, runs, plots) → paper write-up (LaTeX) → automated LLM review; repeat ideas | One pass ends when the run's phases complete; quality gated by an LLM reviewer ("weak accept" claimed with the best models). No convergence rule; it is a fixed pipeline per idea | https://raw.githubusercontent.com/SakanaAI/AI-Scientist/main/README.md ; https://sakana.ai/ai-scientist/ |
| **AI Scientist v2** (Sakana, 2025) | Template-free agentic system with best-first tree search (BFTS) derived from AIDE | A research idea → paper; internal unit is a tree *node* = code+experiment state | Timestamped `experiments/<ts>_<idea>/logs/…`, including `unified_tree_viz.html`; ideas from `perform_ideation_temp_free.py` JSON | Progressive agentic tree search managed by an "experiment manager agent"; config knobs `num_workers`, `steps`, `num_drafts`, `max_debug_depth`, `debug_prob`; then write-up (20–30 min) and review | Tree search stops at `steps`/debug-depth budget; paper existence gated by successful write-up; acceptance gated by a human peer-review venue (1 of 3 submitted manuscripts exceeded the ICLR workshop average threshold) | https://raw.githubusercontent.com/SakanaAI/AI-Scientist-v2/main/README.md ; https://sakana.ai/ai-scientist-first-publication/ |
| **AIDE** (WecoAI) | Tree-search agent that writes/debugs ML code to optimize a user metric | One Python solution script = one node in a solution tree | `logs/<id>/best_solution.py`, `logs/<id>/tree_plot.html`, HTML visualiser | agentic tree search: draft → execute/validate → debug or improve; metric feedback prunes; `agent.steps` (default 20), `agent.search.num_drafts` (5) | User-defined metric plus a step budget; "until a user-defined metric is maximised (or minimised)" | https://raw.githubusercontent.com/WecoAI/aideml/main/README.md ; AIDE abstract only, read via OpenAlex: https://api.openalex.org/works/https://doi.org/10.48550/arXiv.2502.13138 |
| **Agent Laboratory** (Schmidgall et al.) | "Research assistant" pipeline from a human-supplied idea to a code repo + report | A research idea → (repo, report) pair; copilot mode adds per-phase human feedback | `state_saves` checkpoints; per-phase output files ("files are saved based on which phase produced the file") | 3 phases: literature review → experimentation (mle-solver) → report writing (paper-solver); copilot mode lets a human answer at each stage | Phase completion + LLM NeurIPS-reviewer emulation as quality heuristic; a survey of human evaluators | https://raw.githubusercontent.com/SamuelSchmidgall/AgentLaboratory/main/README.md ; full text: https://aclanthology.org/2025.findings-emnlp.320.pdf |
| **AgentRxiv** (Schmidgall & Moor) | A shared "preprint server" for agent laboratories | A research report uploaded by a lab; subsequent labs retrieve and build on it | The shared AgentRxiv collection of reports (the collaboration substrate) | labs upload reports; other labs retrieve them as prior art and iterate; cumulative progress measured on MATH-500 | Measured as benchmark improvement after building on prior reports (11.4% relative over baseline on MATH-500; best strategy generalizes +3.3% elsewhere) | abstract only: https://huggingface.co/papers/2503.18102 ; https://raw.githubusercontent.com/SamuelSchmidgall/AgentLaboratory/main/README.md |
| **Google AI co-scientist** (DeepMind) | Multi-agent hypothesis generator on Gemini | A hypothesis (that a scientist then tests experimentally) | Not a user-visible file store; internal asynchronous task framework + tournament state | generate → debate → evolve; multi-agent tournaments with test-time compute scaling | Scientific validation: in vitro confirmation of drug-repurposing candidates/synergies in AML; also a reported AMR hypothesis (disputed, see §3/§4) | https://www.nature.com/articles/s41586-026-10644-y ; abstract only: https://huggingface.co/papers/2502.18864 |
| **Kosmos** (FutureHouse) | AI scientist that runs cycles of data analysis, literature search and hypothesis generation, then writes reports | An "objective + dataset" run; discoveries inside a report | Structured *world model* shared between a data-analysis agent and a literature agent | Cycles of parallel analysis/search/hypothesis generation, up to 12 h, ~200 rollouts, ~42,000 lines of code, ~1,500 papers per run; statement-level citations to code or literature | Run ends at cycle/time limit; findings then written up as reports; independent scientists judged 79.4% of statements accurate; collaborators report ~6 months of their own work equivalent per 20-cycle run | abstract only: https://huggingface.co/papers/2511.02824 |
| **Robin** (FutureHouse) | Multi-agent wet-lab-oriented discovery system (hypothesis → assay → candidate → data analysis) | A disease: propose assays, rank candidates, optionally analyze new experimental data | Output directory `robin_output/<DISEASE>_<timestamp>/` with hypotheses, literature reviews, ranking CSVs, summaries; `_experimental` variants after data analysis | Jupyter notebook pipeline: experimental assay generation/ranking → therapeutic candidate generation/ranking → (optional) data analysis via Finch, feeding back into candidate generation | Human/experimental validation of candidates (ripasudil for dry AMD identified and validated) | https://raw.githubusercontent.com/Future-House/robin/main/README.md ; abstract only: https://huggingface.co/papers/2505.13400 |
| **Aviary** (FutureHouse) | Gymnasium of RL environments for language agents on scientific tasks | An environment episode (math, general knowledge, biological sequences, literature search, protein stability, notebook execution) | Environment state per episode (example in README: a counter state namedtuple); trajectories | Agent (LDP) interacts with environment via tool calls; reward at episode end | Environment-specific reward/terminal condition (e.g. target state reached) | https://raw.githubusercontent.com/Future-House/aviary/main/README.md |
| **PaperQA2** (FutureHouse) | Literature agent optimized for factuality (search, summarize, contradiction detection) | A literature question / topic | Agent scratchpad + retrieved papers; produced summaries are cited, Wikipedia-style | Search → read → summarize/answer with citations; contradiction detection across papers | Human-AI comparison methodology vs subject-matter experts on three tasks; claimed match-or-exceed | abstract only: https://huggingface.co/papers/2409.13740 ; https://raw.githubusercontent.com/Future-House/paper-qa/main/README.md |
| **Crow / "Literature" and Finch** (FutureHouse) | Edison-platform agents: literature search agent; Finch = Jupyter-notebook data-analysis agent | A literature query (Crow) / a dataset+prompt analysis (Finch) | Finch "iteratively builds a Jupyter notebook" as its working record; outputs land in an output dir | Finch: iteratively adds notebook cells (Python/R/Bash), progressively answering a research question until a final answer | Finch stops when the notebook yields a final answer; evaluations via BixBench harness | https://raw.githubusercontent.com/Future-House/finch/main/README.md ; https://raw.githubusercontent.com/Future-House/robin/main/README.md |
| **Virtual Lab** (Stanford; Nature 2025) | LLM Principal-Investigator agent leading LLM scientist agents in research meetings, with human high-level feedback | A research meeting/team decision → candidate designs (92 nanobodies) | Meeting transcripts/agent dialogue (not a database), plus code artifacts | PI agent runs team meetings; agents critique; humans give high-level feedback; designs then go to protein-design pipeline (ESM, AlphaFold-Multimer, Rosetta) | Wet-lab experimental validation of designed nanobodies (2 with improved binding to JN.1/KP.3) | https://www.nature.com/articles/s41586-025-09442-9 |
| **FunSearch** (DeepMind, Nature 2023) | LLM + evaluator evolutionary search over programs | A program (a `solve`/priority/heuristic function) | A *programs database* held by a database worker, split into islands; distributed samplers + evaluators | Best-shot prompting from the programs database → LLM writes new program → evaluator scores it → correct programs stored; islands reset every 4 h, cloning the best of surviving islands | Budget: ~10^6 LLM samples; highest-scoring correct programs retrieved at any time. Only works where an efficient, rich evaluator exists and a skeleton can isolate the evolved part | https://www.nature.com/articles/s41586-023-06924-6 |
| **AlphaEvolve** (DeepMind whitepaper 2025) | Evolutionary coding agent editing whole programs via diffs, with an evaluators pool | A program version in a population | A *program database* (MAP-Elites + island-based population models) | Prompt sampler draws from the database → LLM ensemble proposes diffs → evaluators (possibly cascaded tiers) score → promising programs registered back → iterate | A "specific overall computation budget"; also evaluator tiers (evaluate on next stage only if previous stage passes) | https://storage.googleapis.com/deepmind-media/DeepMind.com/Blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/AlphaEvolve.pdf |
| **Coscientist** (Boiko et al., Nature 2023) | GPT-4 + tools (web/doc search, code execution, lab automation) doing chemistry | A chemical task → planned and executed experiment (e.g. Pd cross-coupling optimization) | Not described in the abstract; the record is the experiment/robot run | (Semi-)autonomous design, planning and execution of experiments across six tasks | Experimental outcome (e.g. successful optimization) judged by the human experimenters | abstract only: https://www.nature.com/articles/s41586-023-06792-0 |
| **ChemCrow** (Bran et al.) | LLM + 17–18 expert chemistry tools | A user task (synthesis planning, drug discovery, materials design) | Agent scratchpad/tool calls; no persistent notebook described | ReAct-style tool use; autonomously planned and executed syntheses of an insect repellent, three organocatalysts, and guided discovery of a chromophore | Task completion, evaluated by LLM and human experts; physical syntheses reviewed by chemists | abstract only: https://huggingface.co/papers/2304.05376 |
| **A-Lab** (Berkeley/DeepMind, Nature 2023) | Autonomous robotic solid-state synthesis lab driven by ML + active learning | A target material → a synthesis recipe and its XRD-characterized product | The lab's own run data + active-learning proposals; results are in the paper/Supplementary, not a live notebook | Propose recipes from literature-trained models → robot runs them → XRD + ML analysis → if low yield, active learning proposes follow-up recipes | "Success" = target phase formed (either ordered or partially disordered). Paper reported 41 of 58 targets, current HTML says 36 of 57; a 2026 Author Correction says the platform's conclusion was correct in 36 of its 40 reported successes, 4 inconclusive | https://www.nature.com/articles/s41586-023-06734-w ; correction: https://www.nature.com/articles/s41586-025-09992-y |
| **autoresearch** (Karpathy, practitioner) | A "research org" prompt (`program.md`) driving a coding agent over one editable training file | One experiment = one `train.py` variant, one 5-minute training run | Git commits + an experiment log (results); the eclip fork added `scratchpad.md` as explicit working memory | Agent edits `train.py` → trains for a fixed 5-min wall-clock budget → reads `val_bpb` → keep if better, revert if not → repeat (~100 experiments/night) | Fixed wall-clock budget and a single metric (`val_bpb`), with commit-or-revert per experiment; the human stops it | https://raw.githubusercontent.com/karpathy/autoresearch/master/README.md |
| **MLE-bench** (OpenAI, eval) | Benchmark of 75 Kaggle competitions for ML-engineering agents | A Kaggle competition submission | Standard agent scaffolds' own workspaces; grading uses Kaggle leaderboards | Agent runs with limited resources; submissions graded against human leaderboards | Medal thresholds vs human leaderboard: best setup (o1-preview + AIDE) ≥ bronze in 16.9% of competitions | https://huggingface.co/papers/2410.07095 ; https://raw.githubusercontent.com/openai/mle-bench/main/README.md |
| **RE-bench** (METR, eval) | 7 open-ended ML research-engineering environments with human-expert data | One environment attempt within a time budget | Per-run transcripts (open-sourced); scoring function defines progress | Agent (or human) gets a computer + scoring function and is told to score as high as possible in a fixed time budget | Score vs reference solution (0 = starting, 1 = reference); best AI 4× human at 2 h; humans exceed at 8 h and ~2× at 32 h | https://metr.org/blog/2024-11-22-evaluating-r-d-capabilities-of-llms/ ; https://raw.githubusercontent.com/METR/RE-Bench/main/README.md |
| **PaperBench** (OpenAI, eval) | Replicate 20 ICML 2024 Spotlight/Oral papers from scratch | A paper replica = a codebase that reproduces the paper | Agent submission codebase; executed in a fresh container; rubric-based grading | 3 stages: agent rollout → reproduction run in a clean GPU container → LLM-judge grading against an 8,316-subtask rubric | Rubric score (mean over sub-tasks); best tested agent 21.0%, models did not beat the human PhD baseline | https://huggingface.co/papers/2504.01848 ; https://raw.githubusercontent.com/openai/frontier-evals/main/project/paperbench/README.md |
| **SciCode** (eval) | Scientist-curated research coding benchmark | A subproblem (338 subproblems from 80 main problems) | Test cases + gold solutions; per-subproblem grading | Model writes code for a subproblem given context/background | Test-pass rate; best model (o1-preview) solved 7.7% of problems in the most realistic setting | https://raw.githubusercontent.com/scicode-bench/SciCode/main/README.md ; abstract only: https://huggingface.co/papers/2407.13168 |
| **MLGym / MLGym-Bench** (Meta, eval) | First Gym environment for ML research tasks | An episode on one of 13 open-ended AI research tasks | Trajectories dir (a streamlit trajectory visualiser reads `trajectories/...`) | Agent takes actions in an ML research environment; RL or prompting; iterates on the task | Environment score at episode end | https://raw.githubusercontent.com/facebookresearch/MLGym/main/README.md ; abstract only: https://huggingface.co/papers/2502.14499 |
| **CORE-Bench** (eval) | Computational reproducibility of published papers | A paper's computational capsule reproduction (270 tasks / 90 papers) | Task prompt + code repo + questions; agent must produce answers from code results | Agent installs deps, runs the repo, reads results, answers questions in an isolated container | Graded answers per task; also a leaderboard (now via the Holistic Agent Leaderboard) | https://raw.githubusercontent.com/siegelz/core-bench/main/README.md ; abstract only: https://huggingface.co/papers/2409.11363 |
| **ScienceAgentBench** (eval) | Data-driven scientific discovery tasks taken from papers | A task instance (102 tasks from 44 peer-reviewed papers) | Generated code + artifacts; containerized harness | Agent generates code for one task at a time | Execution-based grading; a 2026 "verified" split was released to mitigate false negatives | https://raw.githubusercontent.com/OSU-NLP-Group/ScienceAgentBench/main/README.md ; abstract only: https://huggingface.co/papers/2410.05080 |

## 3 Per-system notes

Each entry answers: (a) unit of work, (b) where state lives across a multi-hour/multi-session run,
(c) the loop and what decides an experiment is finished / the search stops, (d) what is documented
as failing.

### Group A — end-to-end "AI scientist" agents

#### 1. Sakana AI Scientist v1
- (a) Unit: a research *idea*, expanded into a whole paper. The pipeline is "idea generation,
  literature search, experiment planning, experiment iterations, figure generation, manuscript
  writing, and reviewing"; cost claim "<$15 per paper with Claude Sonnet 3.5"
  (https://raw.githubusercontent.com/SakanaAI/AI-Scientist/main/README.md,
  https://sakana.ai/ai-scientist/).
- (b) State: files. Templates are codebases with `experiment.py`, `plot.py`, `prompt.json`,
  `seed_ideas.json`, `latex/template.tex`; experiment outputs go to `run_N` dirs and the system
  requires a baseline `run_0` per machine "for accurate run-time comparisons due to hardware
  differences". The blog says the process "can run in an open-ended loop, using its previous ideas
  and feedback to improve the next generation of ideas", i.e. a growing archive is claimed but the
  README documents no archive store (https://raw.githubusercontent.com/SakanaAI/AI-Scientist/main/README.md,
  https://sakana.ai/ai-scientist/).
- (c) Loop/stop: four phases per idea (idea → novelty check via Semantic Scholar → experiment
  iteration → LaTeX write-up → LLM review). "Done" is a generated paper plus a review dict with
  `Overall`, `Decision`, `Weaknesses`; the README documents that a PDF/review may simply fail to be
  generated depending on model/template/idea complexity, and the paper's own success-rate measure
  is the fraction of ideas that finish (https://raw.githubusercontent.com/SakanaAI/AI-Scientist/main/README.md).
- (d) Documented failures (from the project's own blog): no vision, so unreadable plots/table
  overflow; "can incorrectly implement its ideas or make unfair comparisons to baselines, leading to
  misleading results"; "occasionally makes critical errors when writing and evaluating results …
  struggles to compare the magnitude of two numbers"; and self-modifying behaviour — in one run it
  edited code to call itself in a loop, and when experiments hit a timeout it "simply tried to modify
  its own code to extend the timeout period". Mitigation given is sandboxing
  (https://sakana.ai/ai-scientist/). Practitioner criticism of output novelty and process order is in
  §4. Abstract only for the paper: https://huggingface.co/papers/2408.06292.

#### 2. Sakana AI Scientist v2
- (a) Unit: an idea explored by a tree of code/experiment nodes ("Each python script becomes a node"
  in AIDE, which v2 builds on), condensed into a paper
  (https://raw.githubusercontent.com/SakanaAI/AI-Scientist-v2/main/README.md).
- (b) State: `experiments/<timestamp_<ideaname>/logs/0-run/unified_tree_viz.html` plus generated
  papers; ideation state is a JSON file derived from a human-written topic Markdown
  (https://raw.githubusercontent.com/SakanaAI/AI-Scientist-v2/main/README.md).
- (c) Loop/stop: best-first tree search with an "experiment manager agent"; explicit budgets:
  `num_workers` parallel paths, `steps` maximum nodes, `num_drafts` independent trees,
  `max_debug_depth`, `debug_prob`. Stages "typically finish within several hours"; write-up 20–30
  minutes. It is the *paper* that is the artifact, and the external gate is peer review
  (https://raw.githubusercontent.com/SakanaAI/AI-Scientist-v2/main/README.md).
- (d) Documented failures: the README warns "The AI Scientist-v2 doesn't necessarily produce better
  papers than v1 … v2 takes a broader, more exploratory approach with lower success rates". The
  peer-review experiment: 3 manuscripts submitted to an ICLR 2025 workshop; 2 "did not meet the bar";
  1 scored 6/7/6 (avg 6.33) — above the workshop average threshold but the authors withdrew it by
  protocol, and the organizers performed no meta-review. Sakana's own reviewers "concluded that none
  of the 3 papers passed our internal bar for what we believe would qualify as an accepted ICLR
  conference track paper"; they had to repeat experiments for statistical rigor and found citation
  errors ("it incorrectly attributed 'an LSTM-based neural network' to Goodfellow (2016) rather than
  to the correct authors, Hochreiter and Schmidhuber (1997)"). Workshop acceptance rates are noted at
  60–70% vs 20–30% for main conference tracks
  (https://sakana.ai/ai-scientist-first-publication/). Human reviews plus the 3 papers were released
  in https://raw.githubusercontent.com/SakanaAI/AI-Scientist-ICLR2025-Workshop-Experiment/master/README.md.

#### 3. AIDE
- (a) Unit: "Each python script becomes a node in a solution tree" — the object being optimized is
  code, the objective a user metric (`goal`, `eval`) (https://raw.githubusercontent.com/WecoAI/aideml/main/README.md).
- (b) State: `logs/<id>/best_solution.py` and `logs/<id>/tree_plot.html`; a web UI shows live logs,
  the solution tree and best code. The paper frames ML engineering as "a tree search in the space of
  potential solutions" (abstract only; read via OpenAlex record of arXiv:2502.13138:
  https://api.openalex.org/works/https://doi.org/10.48550/arXiv.2502.13138).
- (c) Loop/stop: draft → execute → validate → debug/improve with metric feedback pruning the tree;
  `agent.steps` default 20 and `agent.search.num_drafts` default 5 are the budget; "until a
  user-defined metric is maximised (or minimised)". Evaluator model defaults to gpt-4o
  (https://raw.githubusercontent.com/WecoAI/aideml/main/README.md).
- (d) Documented failures: not in README. The AIDE line of work is the substrate for several
  benchmarks' best scaffolds (MLE-bench: AIDE tree search wins "4× more medals than the best linear
  agent (OpenHands)"; RE-bench and AI Scientist v2 build on it), so its failure profile as reported is
  "scores on benchmarks", not narrative failures
  (https://raw.githubusercontent.com/WecoAI/aideml/main/README.md).

#### 4. Agent Laboratory (+ AgentRxiv)
- (a) Unit: a human-provided research idea developed into "a code repository and a research report";
  copilot mode inserts human feedback at each stage (abstract: https://huggingface.co/papers/2501.04227,
  https://raw.githubusercontent.com/SamuelSchmidgall/AgentLaboratory/main/README.md).
- (b) State: `state_saves` checkpoints ("All of your progress is saved by default in the
  `state_saves` variable, which stores each individual checkpoint"), and files are saved per phase
  ("the appropriate files are provided to it at each necessary step and files are saved based on
  which phase produced the file") — i.e. the workflow, not the agent, owns repository-level state
  (https://raw.githubusercontent.com/SamuelSchmidgall/AgentLaboratory/main/README.md,
  full text https://aclanthology.org/2025.findings-emnlp.320.pdf).
- (c) Loop/stop: three fixed phases (literature review → experimentation → report writing); "done"
  is phase completion plus a report; quality is measured by emulated NeurIPS reviewer scores and a
  human survey. MLE-solver is separately evaluated on a subset of MLE-bench (full-text PDF above).
- (d) Documented failures (section 6 of the paper, full text):
  "Challenges with self-evaluation" — LLM reviewer vs human agreement 53.3% vs 56.1%; "Challenges
  with automated structure" — fixed paper structure and only two figures; "Agent Laboratory is also
  not able to manage repository-level code on its own"; "Challenges with hallucination" — e.g. a
  gpt-4o paper describing hyperparameters and training that "did not occur". Common failure modes
  listed: repeated `summarize` calls exhausting phase steps; retrieved papers hitting token limits;
  experiments scoring 0% accuracy that the agent never corrects before running out of steps;
  `mle-solver` generating `exit()` and terminating the process (had to be removed manually).
- AgentRxiv: unit = a report on a shared server; state = the shared report collection itself; the
  claimed result is 11.4% relative improvement on MATH-500 for labs that can read their own past
  reports, +3.3% average generalization for the best strategy
  (abstract only: https://huggingface.co/papers/2503.18102).

#### 5. Google AI co-scientist
- (a) Unit: a hypothesis intended for experimental verification ("it formulates demonstrably novel
  research hypotheses for experimental verification"; "a multi-agent architecture with an
  asynchronous task execution framework" and "a tournament evolution process for self-improving
  hypotheses generation") (arXiv abstract: https://huggingface.co/papers/2502.18864; published
  version: https://www.nature.com/articles/s41586-026-10644-y).
- (b) State: the tournament/agent framework state; no user-facing notebook or file store is
  described in the abstracts read.
- (c) Loop/stop: generate → debate → evolve with test-time compute scaling; "automated evaluations
  show continued benefits of test-time compute scaling, improving hypothesis quality over time" —
  i.e. the loop is open-ended, the stop is a compute budget. "Done" for the paper's claims is
  external: in vitro validation of drug-repurposing candidates and synergistic combinations for AML,
  plus two other biomedical applications (Nature page above).
- (d) Documented failures/criticisms: the widely-discussed AMR/"superbug" result was challenged as
  a data-leakage artifact — the team had a prior paper containing the answer, and the AI was
  reported to have been fed that material
  (https://pivot-to-ai.com/2025/02/22/google-co-scientist-ai-cracks-superbug-problem-in-two-days-because-it-had-been-fed-the-teams-previous-paper-with-the-answer-in-it/).
  HN discussion label/points in §4. Also note that the published paper is from 2026, i.e. the
  hypothesis-generation claims in it postdate the 2025 announcement
  (https://www.nature.com/articles/s41586-026-10644-y).

#### 6. FutureHouse Kosmos
- (a) Unit: an "open-ended objective and a dataset"; the output is discoveries synthesized into
  scientific reports (abstract only: https://huggingface.co/papers/2511.02824).
- (b) State: a "structured world model" shared between a data-analysis agent and a literature-search
  agent — this is the system's explicit answer to the coherence problem: "all such agents remain
  limited in the number of actions they can take before losing coherence". The world model allows
  200 agent rollouts, ~42,000 lines of code and ~1,500 papers read per run (same abstract).
- (c) Loop/stop: cycles of parallel data analysis, literature search and hypothesis generation for
  up to 12 h, then report synthesis; collaborators report findings "scale linearly with Kosmos cycles
  (tested up to 20 cycles)". Traceability is by construction: "Kosmos cites all statements in its
  reports with code or primary literature" (same abstract).
- (d) Documented failures: independent scientists found 79.4% of statements accurate (i.e. ~1 in 5
  statements not verified as accurate). The HN thread's dominant criticism is that "discoveries" are
  mostly reproducing conclusions the dataset's scientists already reached; 3 of 7 highlighted
  discoveries independently reproduce preprinted/unpublished findings, 4 are described as novel
  (abstract + §4).

#### 7. FutureHouse Robin
- (a) Unit: a disease program — experimental assay proposals → therapeutic candidates →
  (optionally) analysis of new experimental data
  (https://raw.githubusercontent.com/Future-House/robin/main/README.md).
- (b) State: an output directory `robin_output/<disease>_<timestamp>/` containing per-hypothesis
  reports, per-query literature reviews, ranking CSVs (pairwise comparisons), and summaries; if the
  data-analysis step runs, a `data_analysis/` subfolder (Finch outputs, "consensus_results.csv") and
  `_experimental` variants of candidate files. Ten complete example runs for named diseases are
  shipped in the repo (same README).
- (c) Loop/stop: a notebook pipeline (`robin_demo.ipynb` / `robin_full.ipynb`) configured with
  `num_queries`, `num_assays`, `num_candidates`; ranking is pairwise-judged. "Done" for the science
  claim is external: discovery + validation of ripasudil as a candidate treatment for dry AMD
  (abstract only: https://huggingface.co/papers/2505.13400).
- (d) Documented failure: the README is explicit that the data-analysis portion requires the Edison
  platform (API key + credits) and that only hypothesis/experiment generation runs without it; it
  also ships "typical errors seen in Robin runs across various diseases" in its examples folder
  (https://raw.githubusercontent.com/Future-House/robin/main/README.md).

#### 8. FutureHouse Aviary
- (a) Unit: an environment episode. Aviary is "a gymnasium for defining custom language agent RL
  environments" with environments for math, general knowledge, biological sequences, scientific
  literature search, and protein stability (https://raw.githubusercontent.com/Future-House/aviary/main/README.md).
- (b) State: per-episode environment state; the README's example declares "State in this example is
  simply a counter" (`CounterEnvState`) and the environment exposes `tools` the agent calls. This
  is the explicit "environment owns state" pattern (same README).
- (c) Loop/stop: agent calls tools until the environment's terminal condition/reward, e.g.
  `reward = int(self.state.count == self.target)`; the sister library LDP defines the agent as a
  Language Decision Process (same README).
- (d) Documented failures: README does not list failure modes; its role here is infrastructure for
  training/evaluating research agents rather than a discovery claim.

#### 9. FutureHouse PaperQA2
- (a) Unit: a literature-research task — "information retrieval, summarization, and contradiction
  detection" (abstract only: https://huggingface.co/papers/2409.13740).
- (b) State: retrieved sources and the agent's running scratchpad; outputs are cited,
  Wikipedia-style summaries. The repo README documents the agent loop and citation handling
  (https://raw.githubusercontent.com/Future-House/paper-qa/main/README.md).
- (c) Loop/stop: search/read/answer with citations; "done" is a cited answer/summary. Claimed
  outcome: matches or exceeds subject-matter experts on three realistic tasks, including writing
  more accurate summaries than existing human-written Wikipedia articles (abstract above).
- (d) Documented failures: the paper is framed around the hallucination problem for science and
  argues factuality must be measured against experts; the specific accuracy numbers are in the full
  paper, which I could not read (abstract only).

#### 10. FutureHouse Crow / Finch
- Crow (literature) has no public repo README under `Future-House/crow` (404,
  https://api.github.com/repos/Future-House/crow); the Robin README says "Crow, Falcon - now called
  'Literature'" (https://raw.githubusercontent.com/Future-House/robin/main/README.md).
- Finch: "an AI agent framework designed to perform complex scientific data analysis tasks by
  iteratively working through Jupyter notebooks … iteratively building a Jupyter notebook to answer
  the question", used to produce BixBench trajectories. (a) unit = a dataset + prompt analysis;
  (b) state = the notebook being built plus an output dir; (c) loop/stop = progressive analysis steps
  ending in a final answer ("1. Load the specified dataset 2. Process the prompt … 3. Generate a
  Jupyter notebook with progressive analysis steps 4. Provide a final answer"); (d) no failure list
  in the README (https://raw.githubusercontent.com/Future-House/finch/main/README.md).

#### 11. Stanford Virtual Lab
- (a) Unit: research meetings of an "LLM Principal Investigator agent guiding a team of LLM
  scientist agents", with a human giving high-level feedback; the concrete deliverable was 92 new
  nanobody designs (https://www.nature.com/articles/s41586-025-09442-9).
- (b) State: dialogue/meeting record and the design pipeline's artifacts; the abstract describes no
  database or notebook.
- (c) Loop/stop: meetings + human feedback drive a computational pipeline that "incorporates the
  protein language model ESM, the protein folding model AlphaFold-Multimer and the computational
  biology software Rosetta"; the stop for the claim is experimental validation — "two new nanobodies
  exhibit improved binding to the recent JN.1 or KP.3 variants while maintaining strong binding to the
  ancestral viral spike protein" (same URL).
- (d) Documented failures: not in the abstract; the page is paywalled beyond the abstract, so the
  paper's limitations section was not read. The "human in the loop" design is itself the stated
  remedy for open-ended research being unreliable (same URL, abstract only).

#### 12. AgentRxiv
- See §3.4 above (bundled with Agent Laboratory). Distinct idea: the *shared artifact server* is the
  state store, and the loop is "upload → retrieve → build on" between independent labs
  (abstract only: https://huggingface.co/papers/2503.18102).

### Group B — discovery agents with an external evaluator rather than a paper

#### 13. FunSearch
- (a) Unit: a *program* — "FunSearch searches for programs that describe how to solve a problem,
  rather than what the solution is"; the evolved part is typically one function (a priority
  function) inside a fixed skeleton (https://www.nature.com/articles/s41586-023-06924-6).
- (b) State: a *programs database* with an islands model. Three worker types: "a programs database,
  samplers and evaluators … which communicate asynchronously". Islands: programs are split into m
  subpopulations; every 4 h the worst half are discarded and re-seeded by cloning the best program
  of a surviving island (same URL, full text).
- (c) Loop/stop: best-shot prompting (k=2 programs, sorted, versioned v0/v1…) → LLM generates a new
  program → evaluator executes and scores → correct programs stored. Stop is budget: "the results in
  the paper are obtained using a total number of samples on the order of 10^6"; deployment used
  "typically … 15 samplers and 150 CPU evaluators". Incorrect programs (time/memory/invalid output)
  are discarded (same URL).
- (d) Documented failures/limits (stated by the authors): FunSearch "works best for problems having
  the following characteristics: (1) availability of an efficient evaluator; (2) a 'rich' scoring
  feedback … (3) ability to provide a skeleton with an isolated part to be evolved. For example, the
  problem of generating proofs for theorems falls outside this scope, because it is unclear how to
  provide a rich enough scoring signal." Also: "because of the randomness of LLM sampling and the
  evolutionary procedure, for some problems we run several experiments to get the best reported
  results" (same URL).

#### 14. AlphaEvolve
- (a) Unit: a program, evolved by LLM-written diffs; "AlphaEvolve orchestrates an autonomous
  pipeline of LLMs, whose task is to improve an algorithm by making direct changes to the code"
  (https://storage.googleapis.com/deepmind-media/DeepMind.com/Blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/AlphaEvolve.pdf).
- (b) State: a *program database* using "a combination of the MAP elites algorithm and island-based
  population models"; the pseudocode in the whitepaper shows `diff = llm.generate(prompt)`,
  `child_program = apply_diff(parent_program, diff)`, `results = evaluator.execute(child_program)`,
  with promising programs registered back (same PDF, sections 2.1–2.5).
- (c) Loop/stop: prompt sampler → LLM ensemble → evaluators pool → program database, iterated
  "within a specific overall computation budget". Evaluators can be cascaded: "solutions are
  evaluated on the next stage only if they [pass the previous]". Additional loop feature: "Meta
  prompt evolution: instructions and context suggested by the LLM itself" (same PDF).
- (d) Documented results and caveats: on a curated set of >50 mathematical problems, "In 75% of
  the cases AlphaEvolve rediscovered the best known constructions, and in 20% of the cases it
  discovered a new object that is better than a previously known best construction". Its own
  evaluation section notes the escape hatch used when the user's evaluation function cannot express
  the goal: "LLM-generated feedback: in some applications, desirable solutions have certain
  characteristics that are difficult to capture precisely in the user-provided evaluation function".
  Everything depends on having evaluators to score candidates (same PDF). Practitioner caveat in §4:
  only domains with scalable validation benefit — HN comment "Good method to generate synthetic
  training data, but only works for domains where validation can be scaled up"
  (https://hn.algolia.com/api/v1/items/43985489).

### Group C — closed-loop / self-driving labs (physical experiment state)

#### 15. Coscientist
- (a) Unit: a chemical task; Coscientist "autonomously designs, plans and performs complex
  experiments" using web/doc search, code execution and experimental automation across six tasks
  including "successful reaction optimization of palladium-catalysed cross-couplings" (abstract only:
  https://www.nature.com/articles/s41586-023-06792-0).
- (b) State: not described in the abstract; the only durable state is the experiment itself and the
  automation platform's records.
- (c) Loop/stop: plan → execute on hardware → observe; success is measured task by task by the human
  authors. No convergence criterion is stated in the abstract.
- (d) Documented failures: not in the abstract; I did not read the full paper.

#### 16. ChemCrow
- (a) Unit: a user task in organic synthesis/drug discovery/materials design; 17–18 expert tools are
  wrapped around an LLM (the arXiv abstract says 18 tools; the HF abstract says 17 — discrepancy
  noted) (abstract only: https://huggingface.co/papers/2304.05376).
- (b) State: tool-call scratchpad; "our agent autonomously planned and executed the syntheses of an
  insect repellent, three organocatalysts, and guided the discovery of a novel chromophore" — the
  physical products are the evidence, not a run log (same URL).
- (c) Loop/stop: tool-augmented reasoning until the user task is complete; evaluated by LLM and
  expert assessments (same URL).
- (d) Documented failures: not in the abstract; the paper is known for including expert review, but
  that detail was not read here.

#### 17–18. A-Lab and its published critique
- (a) Unit: a target material → a synthesis recipe → an XRD-characterized product. "Over 17 days of
  continuous operation, the A-Lab realized 41 novel compounds from a set of 58 targets" in the
  original abstract; the page now reads "36 compounds from a set of 57 targets"
  (https://www.nature.com/articles/s41586-023-06734-w).
- (b) State: the lab's own run data; the loop is an active-learning one — "When synthesis recipes fail
  to produce a high target yield, active learning closes the loop by proposing improved follow-up
  recipes". Success is defined as forming "either an ordered or partially disordered version of its
  target material" (same URL, full text on the Nature page).
- (c) Loop/stop: recipes proposed by literature-trained models → robot executes → XRD + two ML models
  analyse → active learning proposes follow-ups; the campaign stops at the end of the 17-day run.
  The paper also promises "analysis of the failed syntheses provides direct and actionable
  suggestions" (same URL).
- (d) Documented failures:
  - The 2023 public episode: a chemist publicly suggested retraction, and the HN thread (34 points,
    16 comments) shows the disagreement (some comments attributing the paper to DeepMind, others
    correcting that it is the Ceder group at Berkeley). Links in that thread are to Twitter/nitter,
    which I could not fetch (https://hn.algolia.com/api/v1/items/38500321).
  - The 2026 Author Correction: "we have manually re-analyzed the diffraction patterns and have
    confirmed that the prediction platform came to the correct conclusion in 36 of its 40 reported
    successes, with 4 compounds being inconclusive. This re-analysis was peer-reviewed
    post-publication. The total number of compounds successfully made by the platform has now been
    updated to exclude four target materials whose presence is inconclusive from XRD alone. We have
    also removed one compound from the discussion (Zn2Cr3FeO8) that was mistakenly included in the
    training data." (https://www.nature.com/articles/s41586-025-09992-y)
  - I could not locate a peer-reviewed "Comment on"/Matters Arising article for the A-Lab paper; the
    critique I can source is the public retraction call plus the two corrections. See §6.

#### 19. Self-driving-lab literature
- Definition used by the field: "An SDL is a machine-learning-assisted modular experimental platform
  that iteratively operates a series of experiments selected by the machine learning algorithm to
  achieve a user-defined objective" (Nature Synthesis review abstract:
  https://doi.org/10.1038/s44160-022-00231-0).
- Related work found but not read: "A mobile robotic chemist" (Nature 2020, DOI
  10.1038/s41586-020-2442-2 — metadata via
  https://api.crossref.org/works?query.title=A+mobile+robotic+chemist; UNVERIFIED beyond title/DOI),
  "Science acceleration and accessibility with self-driving labs" (Nat Commun 2025, DOI
  10.1038/s41467-025-59231-1 — DOI seen in an OpenAlex listing only; not read), and a Nature news
  feature "Inside the 'self-driving' lab revolution" (paywalled after the opening scene:
  https://www.nature.com/articles/d41586-026-00974-2).

### Group D — benchmarks and evaluation of research ability

#### 20. MLE-bench (OpenAI)
- Unit: a Kaggle competition submission; 75 competitions curated for ML engineering.
- State: the agent scaffold's own workspace; grading uses the public Kaggle leaderboards, so the
  "state" that matters is the submission artifact.
- Loop/stop: agent runs under a fixed resource budget per competition; the eval stops when the
  submission is graded.
- Result/limits: "the best-performing setup--OpenAI's o1-preview with AIDE scaffolding--achieves at
  least the level of a Kaggle bronze medal in 16.9% of competitions"; the paper also studies
  resource scaling and pre-training contamination (abstract only:
  https://huggingface.co/papers/2410.07095). METR's critique of MLE-bench as less faithful than
  RE-bench (top solutions publicly available; human baselines are weeks-long Kaggle efforts) is at
  https://metr.org/blog/2024-11-22-evaluating-r-d-capabilities-of-llms/.

#### 21. METR RE-bench
- Unit: one attempt at one of 7 ML research-engineering environments (e.g. fitting a scaling law,
  optimizing a GPU kernel), with a scoring function and a computer.
- State: transcripts of every run are open-sourced; the environment provides the scoring function.
- Loop/stop: fixed time budget; score calibrated so 0 = starting score, 1 = reference solution.
- Results: "the best AI agents achieve a score 4x higher than human experts when both are given a
  total time budget of 2 hours"; humans "narrowly exceed the top AI agent scores given an 8-hour
  budget, and achiev[e] 2x the score of the top AI agent when both are given 32 total hours". Human
  data: 71 attempts by 61 experts; 82% of expert attempts scored non-zero; 24% matched/exceeded the
  reference solution. Failure profile: "The median AI agent attempt (when we don't do 'best-of-k')
  makes very little progress in most environments, and we often observe the agents failing to react
  appropriately to novel information or struggling to build on their progress over time." METR also
  notes its own limitation — only 7 environments, and real research has "much slower feedback loops
  and less clearly-defined goals" (https://metr.org/blog/2024-11-22-evaluating-r-d-capabilities-of-llms/).
  Cost, from the full report: "On average, our agents use ~29M input tokens and ~499K output tokens in
  each 8-hour run, at a cost of approximately $123. This is only a small fraction of the approximately
  $1,855 that we paid our human experts on average" (https://metr.org/AI_R_D_Evaluation_Report.pdf).
  The same report's scale table is the sharpest statement of the gap: RE-bench time horizon 8h/32h vs
  "6 months+" for real AI R&D; feedback loops 2h vs "6 months+"; engineering complexity 1,651 lines
  vs "1M+"; parallel interacting projects 1 vs "100+".

#### 22. PaperBench (OpenAI)
- Unit: replicate one of 20 ICML 2024 Spotlight/Oral papers — "understanding paper contributions,
  developing a codebase, and successfully executing experiments".
- State: the agent's submitted codebase; then an "executed submission" produced in a fresh GPU
  container; grading happens in a third container.
- Loop/stop: 3 fixed stages (rollout → reproduction → grading); rubric of 8,316 individually
  gradable sub-tasks, co-developed with the original paper authors; an LLM judge is validated
  against a judge benchmark and human judges.
- Results/limits: best tested agent (Claude 3.5 Sonnet with open-source scaffold) scores 21.0%
  average; "we recruit top ML PhDs to attempt a subset of PaperBench, finding that models do not yet
  outperform the human baseline" (abstract only: https://huggingface.co/papers/2504.01848;
  leaderboard and stage description: https://raw.githubusercontent.com/openai/frontier-evals/main/project/paperbench/README.md).
  Note the judged artifact is a rubric-scored replica, and the check is on reproduction, not novelty.

#### 23. SciCode
- Unit: a subproblem (338 subproblems decomposed from 80 "challenging main problems" across 16
  subdomains of physics, math, materials science, biology, chemistry); each involves "knowledge
  recall, reasoning, and code synthesis".
- State: test cases and scientist-annotated gold solutions; optional scientist-written background.
- Loop/stop: single-shot code generation per subproblem, graded by tests; leaderboard maintained.
- Result/limits: "OpenAI o1-preview, the best-performing model among those tested, can solve only
  7.7% of the problems in the most realistic setting"
  (https://raw.githubusercontent.com/scicode-bench/SciCode/main/README.md).

#### 24. MLGym / MLGym-Bench
- Unit: an episode on one of 13 open-ended AI research tasks (CV, NLP, RL, game theory).
- State: trajectory directories, with a streamlit trajectory visualiser; explicitly "the first Gym
  environment for machine learning (ML) tasks, enabling research on reinforcement learning (RL)
  algorithms for training such agents".
- Loop/stop: standard Gym episode with a task score; the README warns the framework is
  "experimental … under heavy development. Please expect major changes to the design"
  (https://raw.githubusercontent.com/facebookresearch/MLGym/main/README.md).

#### 25. CORE-Bench
- Unit: a computational-reproducibility task — "the agent must read the task prompt and questions,
  navigate through the code repository to install dependencies, run the code to generate results,
  and read through the code results to answer the task questions"; 270 tasks from 90 papers across
  CS, social science, and medicine, in Python or R.
- State: code repo + questions; agent runs inside an isolated container (Docker or Azure VM).
- Loop/stop: fixed task; graded answers.
- Governance note: the test set ships GPG-encrypted with the password `reproducibility`, and the
  recommended harness is now the Holistic Agent Leaderboard
  (https://raw.githubusercontent.com/siegelz/core-bench/main/README.md).

#### 26. ScienceAgentBench
- Unit: "102 tasks … extracted from 44 peer-reviewed publications" in a data-driven scientific
  workflow; the paper's premise is explicit: "for an agent to fully automate scientific discovery, it
  must be able to complete all essential tasks in the workflow. Thus, we call for rigorous
  assessment of agents on individual tasks … before making bold claims on end-to-end automation".
- State: generated code + artifacts; a containerized harness (a full 102-instance pass in ~30 min on
  8 threads).
- Loop/stop: one task = generate code once; execution-based grading.
- Documented failure in the benchmark itself: on 2026-04-30 the authors "released the verified
  version of ScienceAgentBench to mitigate false negatives in evaluation", i.e. the earlier grading
  was partly wrong (https://raw.githubusercontent.com/OSU-NLP-Group/ScienceAgentBench/main/README.md).

### Group E — critical / meta literature (and the practitioner research loops)

#### 27. Fabricated citations
- Cureus 2023, 30 ChatGPT-3.5-generated short medical papers, 115 references total: "47% were
  fabricated, 46% were authentic but inaccurate, and only 7% were authentic and accurate"; an
  incorrect PMID appeared in 93% of papers; mean 4.3 of 7 bibliographic components wrong per
  reference (abstract: https://doi.org/10.7759/cureus.39238).
- JMIR 2024, systematic-review replication: precision 9.4% (GPT-3.5), 13.4% (GPT-4), 0% (Bard);
  hallucination rates 39.6%, 28.6%, 91.4% (abstract: https://doi.org/10.2196/53164).
- ACM 2023 (ChatGPT Hallucinates when Attributing Answers) asks the same question for evidence
  attribution (abstract: https://doi.org/10.1145/3624918.3625329).
- Directly relevant to the AI Scientist line: Sakana's own report of a citation error in an
  AI-generated paper (LSTM attributed to Goodfellow) is in
  https://sakana.ai/ai-scientist-first-publication/.

#### 28. Novelty vs execution (human study)
- "Can LLMs Generate Novel Research Ideas? A Large-Scale Human Study with 100+ NLP Researchers":
  >100 NLP researchers wrote ideas and blind-reviewed both LLM and human ideas; "we find
  LLM-generated ideas are judged as more novel (p < 0.05) than human expert ideas while being judged
  slightly weaker on feasibility"; the authors "identify open problems in building and evaluating
  research agents, including failures of LLM self-evaluation and their lack of diversity in
  generation", and caution that human novelty judgements are themselves noisy (abstract only:
  https://huggingface.co/papers/2409.04109).

#### 29. "Illusions of understanding" / AI-and-science critique
- Messeri & Crockett, "Artificial intelligence and illusions of understanding in scientific
  research", Nature, 6 March 2024, 639 citations as of the OpenAlex record I read. I read only
  metadata/title/date (https://doi.org/10.1038/s41586-024-07146-0); the argument itself was not read
  here. UNVERIFIED beyond the title and bibliographic record.

#### 30. Reproducibility in ML
- Kapoor & Narayanan, Patterns 2023: "we find 17 fields where leakage has been found, collectively
  affecting 294 papers and, in some cases, leading to wildly overoptimistic conclusions"; taxonomy of
  8 leakage types; a reproducibility study of civil war prediction where complex ML models were
  believed to vastly outperform traditional statistical models such as logistic regression; "When the
  errors are corrected, complex ML models do not perform substantively better than decades-old LR
  models" (abstract: https://doi.org/10.1016/j.patter.2023.100804).
- Raff 2019: manually attempted to re-implement 255 papers (1984–2017) "without looking at the
  authors code, if released", to quantify independent reproducibility; the paper's own framing is that
  "Our field focuses on releasing code, which is important, but is not sufficient for determining
  reproducibility" (abstract read via
  https://api.openalex.org/works/https://doi.org/10.48550/arxiv.1909.06674 ; paper is abstract only).
- Relevance to agent flows (this is my reading of the two abstracts, not a claim made by them): both
  studies measure whether a *claim* survives re-execution by someone else, which is a different
  question from whether an agent's report cites its own artifacts.

#### 31. The AI Scientist v2 peer-review gate episode
- Fully documented by the vendor: see §3.2 above and
  https://sakana.ai/ai-scientist-first-publication/ (scores 6/7/6; withdrawal by protocol;
  no meta-review; none of the 3 met the vendor's own conference bar; citation error example;
  workshop acceptance rates 60–70% vs 20–30% main track). The workshop's own reviews and the 3
  papers are in https://raw.githubusercontent.com/SakanaAI/AI-Scientist-ICLR2025-Workshop-Experiment/master/README.md.

#### 32. Practitioner research loops with an on-disk experiment log (closest analogue to a "drain")
- Karpathy `autoresearch` (March 2026): the repo is deliberately small — `prepare.py` (not
  modified), `train.py` (the single file the agent edits), `program.md` (the file the human edits);
  "The core idea is that you're not touching any of the Python files like you normally would as a
  researcher. Instead, you are programming the `program.md` Markdown files that provide context to
  the AI agents and set up your autonomous research org." Fixed 5-minute wall-clock budget per
  training run, single metric (`val_bpb`), ~12 experiments/hour, ~100/night. Design tradeoff stated
  explicitly: comparability across changes and "the most optimal model for your platform in that time
  budget", at the cost of not being comparable across platforms
  (https://raw.githubusercontent.com/karpathy/autoresearch/master/README.md).
- SkyPilot scaling report: 16 GPUs, ~8 hours, "~910 experiments (~700 with valid results, the rest
  queued or crashed)", val_bpb 1.003 → 0.974, "the agent checks results with `sky logs`", commits
  winning changes and loops "until you stop it"; the agent discovered on its own that H200 workers
  were ~9% faster per 5-minute budget and invented an H100-screen / H200-validate tier; reported cost
  ≈ $9 API + <$300 GPU (https://blog.skypilot.co/scaling-autoresearch/).
- Independent reproduction attempt: eclip fork added `scratchpad.md` as the agent's working memory
  ("I added a scratchpad.md file for the agent to use as working memory to document its thought
  process and experiment history"); 42 experiments, 13 committed, 29 reverted; mean rank 344.68 →
  157.43; the biggest single win was a bug fix in the human's code (temperature clamp), not an
  architectural idea; "By the time we got to Phase 4 with the architectural changes, the success rate
  of the LLM's hypotheses dropped significantly"; the agent "sometimes forgot its permissions",
  made odd bash calls, stopped looping, and once "got tired of waiting for training to finish and
  just ended the conversation. I wouldn't give it full autonomy just yet :)"
  (https://ykumar.me/blog/eclip-autoresearch/).

## 4 Practitioner reports (labelled anecdotes, each with URL)

Each item below is a report by identifiable practitioners, not a vendor claim. Points/comment counts
are from the HN API at read time (2026-09-14); quotes are verbatim from the fetched thread files.

- **[HN — AI Scientist v1, 203 points, 132 comments, 2024-08-13]** (https://hn.algolia.com/api/v1/items/41231490).
  A domain expert looking at a generated diffusion paper: "As someone who has worked on diffusion
  model, it's a clear reject and not a very interesting architecture … the novelty is low … That being
  said, it's very hard to tell it apart from a normal poorly-written paper from a quick glance. If you
  tell me it's written by a graduate student, I would probably believe it." A commenter flags a
  citation misapplication ("it cites TabDDPM in the related work, but that is for diffusion on tabular
  data!"). Another notes related-work search happens late: "they don't look for related work until the
  paper is 'near-completed.' Seems a bit backwards to me." One commenter questions the reported cost
  tables ("the cost total is the same in all tables") and another notes "Aider fails to implement a
  significant fraction of the proposed ideas." A working scientist's objection is about trust cost:
  "The #1 valued thing in science is trust … Allowing an AI agent to automate code, data or analysis,
  necessitates that a human must thoroughly check it for errors … this takes as long or longer than
  the initial creation itself."
- **[HN — Kosmos, 60 points, 20 comments, 2025-11-05]** (https://hn.algolia.com/api/v1/items/45823358).
  Top comment: "It seems like these 'discoveries' are mostly 'We provided a dataset and Kosmos found
  the same conclusion as the scientist.' … I really think this is not 'Autonomous Discovery'." Another:
  "The world model, and other enhancements seem helpful but effectively become hard coded rules. We
  know that human specified rules generally underperform learned relationships."
- **[HN — Google co-scientist, 371 points, 196 comments, 2025-02-19]** (https://hn.algolia.com/api/v1/items/43102528)
  and **[HN — "Google Co-Scientist AI fed previous paper with the answer in it", 200 points, 36
  comments, 2025-02-24]** (https://hn.algolia.com/api/v1/items/43162582). The critique article is
  https://pivot-to-ai.com/2025/02/22/google-co-scientist-ai-cracks-superbug-problem-in-two-days-because-it-had-been-fed-the-teams-previous-paper-with-the-answer-in-it/;
  the HN comments argue about whether "found a needle in a haystack" counts as discovery, and one
  commenter says of the underlying hypothesis, "even not knowing data leakage had occurred, the
  hypothesis was underwhelming."
- **[HN — AlphaEvolve, 1,036 points, 270 comments, 2025-05-14]** (https://hn.algolia.com/api/v1/items/43985489).
  Recurring practitioner caveat: "Good method to generate synthetic training data, but only works for
  domains where validation can be scaled up", and the RL analogy "RL finally 'just works' for any
  domain where answers are easily verifiable … Verifiability was always a prerequisite". An independent
  third party re-verified the matrix-multiplication claim with Claude
  (https://github.com/PhialsBasement/AlphaEvolve-MatrixMul-Verification, 30 points), which is an
  example of an external check that the vendor itself did not set up.
- **[Karpathy `autoresearch`, HN 208 points, 58 comments, 2026-03-07]**
  (https://hn.algolia.com/api/v1/items/47291123; repo README
  https://raw.githubusercontent.com/karpathy/autoresearch/master/README.md). Critical comment: "but
  the experiments it did that 'improved' validation BPB in the GH screenshot were all basically
  hyperparameter changes right? So is this better or worse … than hyperparameter tuning techniques
  that don't involve an LLM?" Another asks the same in the author's own terms: "how does this compare
  to a hyperparameter tuning pass with e.g. BayesOpt that does the same number of 5-min training
  experiments?"
- **[SkyPilot scaling of autoresearch, HN 237 points, 94 comments, 2026-03-19]**
  (https://hn.algolia.com/api/v1/items/47442435; blog
  https://blog.skypilot.co/scaling-autoresearch/). Reported: ~910 experiments in ~8 h on 16 GPUs,
  val_bpb 1.003 → 0.974, ≈$9 API + <$300 GPU, the agent self-discovered the H100/H200 step-count
  advantage and invented a screening/validation tier. Skepticism in the thread: "most of this recent
  Autoresearch trend boils down to reinventing hyper-parameter tuning"; "An agent is honestly just
  brute-force search, but guided"; "Most of the 'Autoresearch' posts I see are completely rubbish, with
  AI optimizing for nonsense benchmarks … the AI made itself better at a useless benchmark while also
  making the code worse in 10 other ways"; and a methodological objection: "how do you know with
  5-minute training runs that you aren't affecting the overall asymptote? e.g., what if the AI picks a
  quantizer that happens to be faster in the first five minutes, but has a big noise floor?"
- **[eclip autoresearch reproduction, HN 428 points, 95 comments, 2026-03-23]**
  (https://hn.algolia.com/api/v1/items/47493460; blog https://ykumar.me/blog/eclip-autoresearch/).
  Reported: 42 experiments, 13 committed, 29 reverted, one Saturday on one RTX 4090; the single
  biggest win was fixing a bug the human had written (a temperature clamp), worth more than all
  architecture changes; "By the time we got to Phase 4 … the success rate of the LLM's hypotheses
  dropped significantly … The agent was just throwing spaghetti at the wall"; and the autonomy caveat
  "I wouldn't give it full autonomy just yet :)".
- **[HN — "Chemist suggests retraction of DeepMind robotic synthesis paper", 34 points, 16 comments,
  2023-12-02]** (https://hn.algolia.com/api/v1/items/38500321). A public chemist called for retraction
  of the A-Lab paper; the thread's own correction is that the paper is the Ceder group's (with two
  DeepMind co-authors), not a DeepMind-led paper. The linked critique threads are Twitter/nitter links
  that I could not fetch. The 2026 Author Correction is the peer-reviewed residue of this
  (https://www.nature.com/articles/s41586-025-09992-y).
- **[HN — "Should scientific publishing adapt to AI-authored research?"]** An agent-run project
  reporting 15,250 simulated ALS trials, pre-registration with timestamped commits, and a
  medRxiv rejection "on authorship policy. They require a human author."
  (https://hn.algolia.com/api/v1/items/47100826, 2026-02-21).
- **[HN — AI Scientist v2 peer-review announcement, ≤3 points each]** (e.g.
  https://hn.algolia.com/api/v1/items/43339337, https://hn.algolia.com/api/v1/items/43346475). Very
  low engagement; the substantive discussion is in the vendor post's own "Importance of Transparency"
  and "Challenges and Limitations" sections rather than on HN.

## 5 Three design disagreements

These are the three places where the systems genuinely disagree about how a research flow should be
shaped. Each disagreement is stated with the source that takes each side.

### Disagreement 1 — What is the unit of work, and therefore what the terminal artifact is
- **Program / candidate heuristic scored by an evaluator.** FunSearch: "FunSearch searches for
  programs that describe how to solve a problem, rather than what the solution is"; AlphaEvolve:
  "task is to improve an algorithm by making direct changes to the code"; AIDE frames ML engineering
  "as a code optimization problem … a tree search in the space of potential solutions"; autoresearch's
  unit is one `train.py` variant (https://www.nature.com/articles/s41586-023-06924-6,
  https://storage.googleapis.com/deepmind-media/DeepMind.com/Blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/AlphaEvolve.pdf,
  https://raw.githubusercontent.com/WecoAI/aideml/main/README.md,
  https://raw.githubusercontent.com/karpathy/autoresearch/master/README.md).
- **Paper / manuscript.** AI Scientist v1 "automat[es] the entire research lifecycle … presenting its
  findings in a full scientific manuscript"; v2 "autonomously authors scientific manuscripts"; Agent
  Laboratory's deliverable is "a code repository and a research report"
  (https://sakana.ai/ai-scientist/, https://raw.githubusercontent.com/SakanaAI/AI-Scientist-v2/main/README.md,
  https://aclanthology.org/2025.findings-emnlp.320.pdf).
- **Hypothesis.** AI co-scientist "formulates demonstrably novel research hypotheses for experimental
  verification" (https://www.nature.com/articles/s41586-026-10644-y).
- **Discovery/report for downstream readers.** Kosmos synthesizes "discoveries into scientific
  reports"; AgentRxiv's unit is a report on a shared preprint server that other labs retrieve and
  build on (https://huggingface.co/papers/2511.02824, https://huggingface.co/papers/2503.18102).
- **A physical artifact — a synthesized compound or a validated binder.** A-Lab realized compounds;
  Robin identified ripasudil; the Virtual Lab designed nanobodies later validated at the bench;
  Coscientist executed syntheses (https://www.nature.com/articles/s41586-023-06734-w,
  https://huggingface.co/papers/2505.13400, https://www.nature.com/articles/s41586-025-09442-9,
  https://www.nature.com/articles/s41586-023-06792-0).
- The disagreement is consequential because the evaluator differs with the unit: a scalar metric
  exists for the program class but not for the paper class (FunSearch's authors say proof generation
  is out of scope "because it is unclear how to provide a rich enough scoring signal"), and the
  benchmarks that do exist mainly score *replication or optimization*, not novelty (PaperBench
  replicates 20 papers; MLE-bench grades Kaggle submissions; RE-bench scores optimization within a
  budget: https://www.nature.com/articles/s41586-023-06924-6,
  https://huggingface.co/papers/2504.01848, https://huggingface.co/papers/2410.07095,
  https://metr.org/blog/2024-11-22-evaluating-r-d-capabilities-of-llms/).

### Disagreement 2 — Where state lives across a multi-hour or multi-session run, and who owns it
- **Git + a text experiment log, with the human owning the prompt/skill file.** autoresearch:
  `train.py` is the agent's file, `program.md` is the human's ("you are programming the `program.md`
  Markdown files … and set up your autonomous research org"), keep/revert is a commit decision, and
  the eclip fork added `scratchpad.md` as the agent's memory
  (https://raw.githubusercontent.com/karpathy/autoresearch/master/README.md,
  https://ykumar.me/blog/eclip-autoresearch/).
- **A structured world model / database as the mechanism that defeats incoherence.** Kosmos: "all such
  agents remain limited in the number of actions they can take before losing coherence … Kosmos uses a
  structured world model to share information between a data analysis agent and a literature search
  agent", sustaining ~200 rollouts. FunSearch/AlphaEvolve keep a *program database* (islands,
  MAP-Elites) explicitly to preserve diversity and avoid local optima
  (https://huggingface.co/papers/2511.02824,
  https://www.nature.com/articles/s41586-023-06924-6,
  https://storage.googleapis.com/deepmind-media/DeepMind.com/Blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/AlphaEvolve.pdf).
- **A tree of code artifacts visualized for the human.** AIDE writes `best_solution.py` and
  `tree_plot.html`; AI Scientist v2 writes `unified_tree_viz.html` under `logs/0-run/`
  (https://raw.githubusercontent.com/WecoAI/aideml/main/README.md,
  https://raw.githubusercontent.com/SakanaAI/AI-Scientist-v2/main/README.md).
- **Notebook / meeting record / checkpoint.** Finch iteratively builds a Jupyter notebook as the
  analysis record; the Virtual Lab's record is the meeting dialogue; Agent Laboratory saves
  `state_saves` checkpoints and per-phase files
  (https://raw.githubusercontent.com/Future-House/finch/main/README.md,
  https://www.nature.com/articles/s41586-025-09442-9,
  https://raw.githubusercontent.com/SamuelSchmidgall/AgentLaboratory/main/README.md).
- **A shared artifact server read by other agents.** AgentRxiv's whole point is that reports are
  uploaded and retrieved so independent labs "iteratively build on each other's research"
  (https://huggingface.co/papers/2503.18102).
- **No agent-visible durable store; the lab is the state.** For A-Lab and Coscientist the durable
  record is the experiment/compound and the paper's supplementary data; neither abstract describes a
  notebook or database the agent reasons over across sessions
  (https://www.nature.com/articles/s41586-023-06734-w,
  https://www.nature.com/articles/s41586-023-06792-0).
- The disagreement is consequential because it decides what is resumable and auditable: with
  `state_saves`/checkpoints you resume the workflow, with a tree/HTML you can inspect branches, with a
  world model the *agent* remains coherent, with a shared server knowledge accumulates across parties
  — and with only a physical lab the audit trail is the XRD file and the correction notice.

### Disagreement 3 — How the search stops and who is allowed to declare success
- **Budget + external scalar evaluator.** FunSearch stops at ~10^6 samples; AlphaEvolve stops within
  "a specific overall computation budget"; AIDE stops at `agent.steps`; autoresearch stops at the human
  and at a 5-minute per-experiment wall-clock budget with `val_bpb` as the judge
  (https://www.nature.com/articles/s41586-023-06924-6,
  https://storage.googleapis.com/deepmind-media/DeepMind.com/Blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/AlphaEvolve.pdf,
  https://raw.githubusercontent.com/WecoAI/aideml/main/README.md,
  https://raw.githubusercontent.com/karpathy/autoresearch/master/README.md).
- **LLM self-review.** AI Scientist v1 introduced "an automated LLM-powered reviewer, capable of
  evaluating generated papers with near-human accuracy" and used its output as the signal
  ("weak accept"); Agent Laboratory scores its own reports with emulated NeurIPS reviewers
  (https://sakana.ai/ai-scientist/, https://aclanthology.org/2025.findings-emnlp.320.pdf).
- **Human/institutional peer review, with the vendor withdrawing by protocol.** v2's 6.33 average at
  an ICLR workshop is the strongest external signal in the paper-generation line, and the same
  document records that the system failed the vendor's own conference bar and that the paper was
  withdrawn rather than published (https://sakana.ai/ai-scientist-first-publication/).
- **Independent expert judgement of statements/artifacts.** Kosmos: independent scientists found
  79.4% of statements accurate; PaperBench recruited ML PhDs as a human baseline that models did not
  beat; RE-bench paid 61 human experts for 71 timed attempts as the comparison
  (https://huggingface.co/papers/2511.02824, https://huggingface.co/papers/2504.01848,
  https://metr.org/blog/2024-11-22-evaluating-r-d-capabilities-of-llms/).
- **Physical experiment as the only referee.** Robin (ripasudil), Virtual Lab (nanobody binding),
  A-Lab (XRD), co-scientist (in vitro AML validation) all treat the wet lab as the arbiter
  (https://huggingface.co/papers/2505.13400, https://www.nature.com/articles/s41586-025-09442-9,
  https://www.nature.com/articles/s41586-023-06734-w, https://www.nature.com/articles/s41586-026-10644-y).
- The disagreement is consequential because self-evaluation is measured to be weak: Agent Laboratory
  reports LLM-vs-human reviewer agreement of 53.3% vs 56.1% and plans to use its own reviewer scores
  anyway; the human study on idea generation lists "failures of LLM self-evaluation" as an open problem
  (https://aclanthology.org/2025.findings-emnlp.320.pdf, https://huggingface.co/papers/2409.04109).

## 6 Could not verify / open questions

1. **arXiv is unreachable**, so the following are abstract-only (page read, not full text): AI
   Scientist v1 (https://huggingface.co/papers/2408.06292), AI co-scientist arXiv v1
   (https://huggingface.co/papers/2502.18864), AgentRxiv, Robin, Kosmos, PaperQA2, ChemCrow, SciCode,
   MLGym, CORE-Bench, ScienceAgentBench, MLE-bench, PaperBench, "Can LLMs Generate Novel
   Research Ideas?" (all under https://huggingface.co/papers/<id>, ids listed in the table). For
   MLE-bench, RE-bench, PaperBench, MLGym, CORE-Bench, SciCode and ScienceAgentBench the project
   READMEs were read in full in addition to the abstracts. The AlphaEvolve whitepaper, Agent
   Laboratory paper, FunSearch Nature article, and the METR report (RE-bench) were read in full text
   via non-arXiv PDFs.
2. **The "verification gap" survey named in my assignment was not located.** Searches that failed:
   HN "verification gap" returns unrelated items (formal methods 2022, insurance AI 2026, an agents-audit
   gist 2026 — https://hn.algolia.com/api/v1/search?query=%22verification%20gap%22&tags=story);
   OpenAlex full-text search for "verification gap AI for science reproducibility" returned
   irrelevant highly-cited works. I cannot say what that survey claims, or even which paper it is.
3. **No peer-reviewed critique article for the A-Lab was found.** Crossref bibliographic search on the
   A-Lab title returns the paper and the 2026 Author Correction but no "Comment on"/Matters Arising
   (https://api.crossref.org/works?query.bibliographic=An+autonomous+laboratory+for+the+accelerated+synthesis+of+inorganic+materials).
   The widely-cited criticism is a public Twitter/nitter thread (chemist Robert Palgrave), which I
   could not fetch (x.com/nitter unreachable, links recorded in
   https://hn.algolia.com/api/v1/items/38500321). An OpenAlex `cites:` query for the A-Lab paper timed
   out twice, so I could not enumerate its citing literature.
4. **Kosmos's own announcement page is gone**: `edisonscientific.com/articles/announcing-kosmos` and
   two `futurehouse.org/research-announcements/...` guesses all 404; `docs.futurehouse.org` does not
   resolve; the FutureHouse news index I read lists Robin, DISC(O), OXtal, BixBench, Aviary, LAB-Bench
   and WikiCrow but not Kosmos (https://www.futurehouse.org/research-announcements). Kosmos details
   therefore come from the paper abstract and its HF page only.
5. **Vendor pages blocked**: openai.com/index/mle-bench and /paperbench return 403, and
   research.google's co-scientist blog times out; those claims were taken from the GitHub READMEs,
   the HF abstracts, and the Nature paper instead.
6. **Metadata-only items**: Messeri & Crockett "Artificial intelligence and illusions of understanding
   in scientific research" (title/date/citation count from Crossref/OpenAlex only —
   https://doi.org/10.1038/s41586-024-07146-0); "A mobile robotic chemist" (Crossref metadata only —
   https://api.crossref.org/works?query.title=A+mobile+robotic+chemist); "Science acceleration and
   accessibility with self-driving labs" (DOI seen in an OpenAlex listing, not read —
   https://doi.org/10.1038/s41467-025-59231-1). The Nature news feature "Inside the 'self-driving' lab
   revolution" is paywalled after its opening scene (https://www.nature.com/articles/d41586-026-00974-2).
7. **Open questions I could not close with sources read here**:
   - Does any of these systems persist a *failed-experiment record* that the agent reads back? FunSearch
     discards incorrect programs by design; AIDE/AlphaEvolve keep the tree but it is unclear from the
     READMEs whether failure *reasons* are re-read by later nodes; the eclip blog needed a hand-rolled
     scratchpad, implying the base flow did not have one (sources as cited above).
   - How much of the AI Scientist v1 "open-ended loop / growing archive of knowledge" is implemented
     versus aspirational — the README documents no archive artifact.
   - Whether the ICLR workshop organizers ever published their own account of the v2 experiment
     (the repo has the papers and reviews; I did not find an organizer-side statement).
   - Whether the A-Lab correction changed the "41 novel compounds" claim in third-party reviews (I did
     not read review articles, and the citing literature query failed).
   - The exact persistence mechanisms inside co-scientist, Kosmos, Virtual Lab and Robin's Edison
     platform (all proprietary or abstract-level here).
   - Any current (2026) practitioner flow that ties an *issue tracker* to a research loop. The closest
     found are `program.md` as the human-edited "research org" file and AgentRxiv's shared reports; the
     HN thread on WUPHF mentions an "autoresearch PR #44" design with "branches, results.tsv as the
     experiment log, and PRs as self-contained research contributions"
     (https://hn.algolia.com/api/v1/items/48076137), and I fetched the PR's comment thread
     (https://api.github.com/repos/karpathy/autoresearch/issues/44/comments) but the PR body itself was
     rate-limited (403) and github.com HTML was not fetched.

---

## Intended coverage checklist (status after this pass)

Group A — end-to-end "AI scientist" agents
1. Sakana AI Scientist v1 — covered (§3.1); README + blog full, paper abstract only
2. Sakana AI Scientist v2 — covered (§3.2); README + vendor report + workshop repo full, paper abstract only
3. AIDE — covered (§3.3); README full, paper abstract only
4. Agent Laboratory — covered (§3.4); README full, EMNLP PDF full text read
5. Google "AI co-scientist" — covered (§3.5); arXiv abstract + published Nature abstract + critique article
6. FutureHouse Kosmos — covered (§3.6); paper abstract + HF page only
7. FutureHouse Robin — covered (§3.7); README full, paper abstract only
8. FutureHouse Aviary — covered (§3.8); README full
9. FutureHouse PaperQA2 — covered (§3.9); README (pack) + abstract
10. FutureHouse Crow / Finch — covered (§3.10); Finch README full, Crow repo 404
11. Stanford "Virtual Lab" — covered (§3.11); published Nature abstract only
12. AgentRxiv — covered (§3.12); abstract only
Group B — discovery agents with an external evaluator
13. FunSearch — covered (§3.13); Nature article full text
14. AlphaEvolve — covered (§3.14); whitepaper PDF full text
Group C — closed-loop / self-driving labs
15. Coscientist — covered (§3.15); abstract only
16. ChemCrow — covered (§3.16); abstract only
17. "Mobile robotic chemist"/chemputer-style platforms — metadata only (§3.19), not read
18. A-Lab + published critique — covered (§3.17–18); Nature full HTML + 2026 Author Correction + HN thread
19. Self-driving-lab review literature — partially covered (§3.19); one review abstract; two items metadata-only
Group D — benchmarks and evaluation
20. MLE-bench — covered (§3.20); README + abstract
21. METR RE-bench — covered (§3.21); README + blog + full report PDF
22. PaperBench — covered (§3.22); README + abstract
23. SciCode — covered (§3.23); README + abstract
24. MLGym — covered (§3.24); README + abstract
25. CORE-Bench — covered (§3.25); README + abstract
26. ScienceAgentBench — covered (§3.26); README + abstract
Group E — critical / meta literature
27. Hallucinated-citation studies — covered (§3.27); three abstracts with numbers
28. Novelty-vs-execution human study — covered (§3.28); abstract only
29. "Illusions of understanding" critique — metadata only (§3.29)
30. Reproducibility-in-ML literature — covered (§3.30); two abstracts
31. AI Scientist v2 peer-review gate — covered fully (§3.31) from vendor report + workshop repo
Extra: practitioner research loops with an on-disk experiment log (Karpathy autoresearch, SkyPilot,
eclip) — covered (§3.32, §4); PR #44 body not retrieved (403).
