# 03 — Experiment state, reproducibility, and long-running jobs (DL / experimental-science axis)

Axis: what exists today for owning experiment state, reproducing runs, and launching/watching
long jobs — and which of those an agent can already drive. Report only; no design, no
recommendation. Claims are cited to the URL I actually read. Receipts for everything load-bearing
are under `raw/sources/03-*.md` (or the frozen pack file where noted; every receipt's line 1 is
`SOURCE-URL:`).

Marker convention:
- `UNVERIFIED:` = I did not read a source for it.
- `INFERENCE:` = this is my reading of the sources (including "I searched and found no official X"),
  not something a source states.

---

## 1. Scope and method

Question: for the DL/experimental-science half of a research flow — experiment trackers, data and
artifact versioning, config/sweeps, job launching and scheduling, reproducibility practice, and
long-run monitoring — what state does each tool own, what interface does it expose that an agent
can drive (MCP server? CLI? Python API? none?), and what does its own documentation say is the
limitation?

Method:
- Read the frozen pack first (`raw/sources/MANIFEST.txt`). Pack files read closely:
  `docs-mlflow-mcp.md`, `docs-wandb-mcp.md`, `docs-wandb-artifacts.md`, `docs-hydra.md`,
  `docs-slurm.md`, `repo-mle-bench.md`, `repo-ai-scientist.md`, `repo-ai-scientist-v2.md`,
  `repo-agent-laboratory.md`, `repo-frontier-evals.md`, plus the six `hn-*.md` story searches.
- Then fetched ~60 live pages/API payloads with `curl --max-time 25`, saved as `03-*.md` receipts.
  Discovery used `api.github.com/search/repositories`, `hn.algolia.com/api/v1/search` (stories and
  comments), `api.openalex.org` (paper metadata + abstracts), and project doc sites.
- Paper claims are abstract-level only. `arxiv.org` is unreachable from this machine and Semantic
  Scholar returned HTTP 429 for most queries; OpenAlex supplied DOI + abstract for the papers cited.
- Negative findings ("no official MCP server for X") are search results, not proofs of absence:
  GitHub repo search + reading the vendor's own doc nav/MCP pages. Marked `INFERENCE:` where used.
- Some doc sites are JS-rendered (SkyPilot agents pages, Comet pages, Modal docs). Where the body
  did not render I say so and rely on the non-JS page/README/llms.txt that did.
- Counts: 6 pack files read closely + ~55 distinct live sources read (docs pages, READMEs, HN
  threads, OpenAlex abstracts, HF pages). 106 `03-*.md` files exist, including a handful of failed
  fetches (404/redirect shells) that I did not cite.

---

## 2. Comparison table

### 2a. Experiment trackers

| Tool | State it owns | Agent interface | Documented limitation | Source |
|---|---|---|---|---|
| **MLflow Tracking** | Runs (params/metrics/tags/times), experiments, logged models/checkpoints, artifacts; backend store (SQLite/Postgres/…) + artifact store; MLflow 3 logged-model search | Python API (`mlflow.start_run`, `client.search_runs`), REST tracking server, CLI (`mlflow …`; `mlflow agent setup` is a prototype "coding-agent integration"), official **MCP server** (experimental, ≥3.5.1) | MCP server is "experimental", requires MLflow ≥3.5.1, and its tool list is **trace management only** (search/get/delete traces, tags, feedback/assessments — no runs, metrics, or job launch) | [mlflow.org/docs/latest/genai/mcp](https://mlflow.org/docs/latest/genai/mcp/) (pack `docs-mlflow-mcp.md`); [mlflow.org/docs/latest/ml/tracking](https://mlflow.org/docs/latest/ml/tracking/) (`03-mlflow-tracking.md`); [mlflow.org/docs/latest/cli.html](https://mlflow.org/docs/latest/cli.html) (`03-mlflow-cli.md`) |
| **Weights & Biases (Models)** | Hosted runs (metrics/config/ summary), sweeps, artifacts + registry, reports; hosted or self-managed server | Python SDK, CLI (`wandb sweep`, `wandb agent`), REST/GraphQL; official **MCP server** (hosted `https://mcp.withwandb.com/mcp` or local) with run/artifact/doc/report tools | MCP: hosted server "follows the main branch" (no pinning), responses truncated by token budget (default 30000), node-style SDK pin `mcp SDK 1.14.x`, Dedicated Cloud rate limits; MCP tools read/analyze + create report/log analysis — no sweep creation or job launch tools in the documented tool list | [docs.wandb.ai/platform/mcp-server](https://docs.wandb.ai/platform/mcp-server) (pack `docs-wandb-mcp.md`); [docs.wandb.ai/guides/sweeps](https://docs.wandb.ai/guides/sweeps/) (`03-wandb-sweeps.md`); [docs.wandb.ai/ref/cli/wandb-agent](https://docs.wandb.ai/ref/cli/wandb-agent/) (`03-wandb-cli-agent.md`) |
| **Comet (ML/Opik)** | Experiments (metrics/params/code/artifacts), Optimizer sweeps, Artifacts + model registry, production monitoring | Python SDK, REST API; vendor docs document an **MCP server** (`comet-mcp`, tools = list/get experiments, projects, metric data, session info) | Comet MCP tools documented are **read-only list/get** (plus session info); repo `comet-ml/comet-mcp` had 1 GitHub star at fetch time (early); a "Limits and performance" page exists in docs nav but my direct URL guess 404'd (see §7) | [comet.com/docs/v2/api-and-sdk/mcp-server/overview](https://www.comet.com/docs/v2/api-and-sdk/mcp-server/overview/) (`03-comet-mcp.md`); [comet.com/docs/v2](https://www.comet.com/docs/v2/) (`03-comet-docs.md`) |
| **Aim** | Self-hosted runs/metrics/params; remote tracking server; SDK query API; artifact storage "in progress" on roadmap | Python SDK, `aim up` UI, CLI | README: "Aim UI can handle several thousands of metrics… It may get shaky when you explore 1000s of metrics with 10000s of steps each"; "Aim is focused on training tracking"; roadmap lists Kubeflow/Slurm integrations as **next-up** (i.e. not shipped); no MCP found | [github.com/aimhubio/aim README](https://raw.githubusercontent.com/aimhubio/aim/main/README.md) (`03-aim-readme.md`) |
| **Sacred** | Config scopes, captured dependencies/host info, auto-seeding, observer records (MongoDB/File/SQL) | Python API + CLI; no MCP found | Docs are for 0.8.4; observability is via observers you run/configure; no server-side run search UI; (INFERENCE: maintenance appears low — docs page shows 0.8.4 and GitHub API lookups were rate-limited) | [sacred.readthedocs.io/en/stable](https://sacred.readthedocs.io/en/stable/) (`03-sacred-docs.md`) |
| **TensorBoard** | Event files (scalars/images/graphs/hparams) in a local `logdir` | CLI (`tensorboard --logdir …`), Python summary-writing APIs; no MCP found | "TensorBoard is designed to run entirely offline"; requires a logdir; competitor claim (Aim README): TensorBoard "doesn't have features to group, aggregate the metrics" and becomes slow at a few hundred runs | [github.com/tensorflow/tensorboard README](https://raw.githubusercontent.com/tensorflow/tensorboard/master/README.md) (`03-tensorboard-readme.md`); comparison claim: `03-aim-readme.md` |

### 2b. Data / artifact versioning and science provenance

| Tool | State it owns | Agent interface | Documented limitation | Source |
|---|---|---|---|---|
| **DVC** | Data/ model versions (hash + `.dvc` files), pipelines (`dvc.yaml`), experiment queue (`dvc exp run --queue`, `dvc queue start|stop|status|logs|remove|kill`), run cache, DVC Studio | CLI, Python API; no official MCP found (search shows tiny community projects only) | Data lives outside Git in caches/remotes; queue commands manage the experiment queue, not a cluster/job scheduler; no live-tracking of a running job documented on the queue page | [dvc.org/doc/command-reference/queue](https://dvc.org/doc/command-reference/queue) (`03-dvc-queue.md`); [dvc.org/doc/start](https://dvc.org/doc/start) (`03-dvc-start.md`) |
| **Git LFS** | Large-file blobs tracked via Git pointers + transfer protocol | CLI extension (`git lfs …`); no MCP found | README documents install/spec only — no experiment/metric semantics; INFERENCE: it owns bytes, not runs | [git-lfs/git-lfs README](https://raw.githubusercontent.com/git-lfs/git-lfs/main/README.md) (`03-git-lfs-readme.md`) |
| **W&B Artifacts** | Versioned datasets/models as run inputs/outputs, aliases, lineage (use/log edges), registry collections | Python SDK (`wandb.Artifact`, `run.use_artifact`), plus W&B MCP artifact tools (list versions, details, compare versions) | Artifacts are attached to runs; versioning semantics are W&B's (aliases/digests); docs are W&B-server bound | [docs.wandb.ai/guides/artifacts](https://docs.wandb.ai/guides/artifacts) (pack `docs-wandb-artifacts.md`) |
| **HF dataset cards** | Dataset documentation + YAML metadata in repo `README.md` (license, size, modality, tags) rendered/searchable on the Hub | None specific to agents (Hub tooling reads the YAML; docs list `mlcroissant` as a supported library tag) | Documentation, not versioning — the card describes a dataset; it does not pin data bytes | [huggingface.co/docs/hub/datasets-cards](https://huggingface.co/docs/hub/datasets-cards) (`03-hf-datasets-cards.md`) |
| **RO-Crate / PROV-O (science, non-DL)** | RO-Crate: packaging of data+metadata (+ provenance) for research objects; PROV-O: W3C provenance ontology; e.g. Nextflow's `nf-prov` emits Workflow Run RO-Crate | None found (standards/formats, not servers) | Formats need tooling adoption; the pages I read describe profiles/implementations, not run-time state | [researchobject.org/ro-crate](https://www.researchobject.org/ro-crate/) (`03-ro-crate-home.md`); [w3.org/TR/prov-o](https://www.w3.org/TR/prov-o/) (`03-prov-o.md`) |
| **Snakemake / Nextflow (workflow engines, science)** | Pipeline run state, output files, caches/resume (Nextflow: "All the intermediate results… automatically tracked… resume… from the last successfully executed step"); executors incl. SLURM | CLI + config files; no MCP found | These are workflow engines: they own step execution/dependencies; not interactive experiment tracking or agent tooling | [snakemake.readthedocs.io](https://snakemake.readthedocs.io/en/stable/) (`03-snakemake-docs.md`); [nextflow.io](https://nextflow.io/) (`03-nextflow-home.md`) |

### 2c. Config and sweeps

| Tool | State it owns | Agent interface | Documented limitation | Source |
|---|---|---|---|---|
| **Hydra / OmegaConf** | Composed config per run (`outputs/…` run dir), `--multirun` sweeps, launcher/sweeper plugins | CLI (`--multirun`, overrides), Python API | "Hydra composes configs lazily at job launching time. If you change code or configs after launching a job/sweep, the final composed configs might be impacted." Default multirun is **local and serial**; parallelism requires plugins | [hydra.cc/docs/tutorials/basic/running_your_app/multi-run](https://hydra.cc/docs/tutorials/basic/running_your_app/multi-run/) (`03-hydra-multirun.md`) |
| **Hydra + Submitit launcher** | Same, plus SLURM submission per swept job | Plugin config `hydra/launcher=submitit_slurm`, CLI overrides | "This plugin expects a valid environment in the target host. Usually this means a shared file system between…"; requires `--multirun` | [hydra.cc/docs/plugins/submitit_launcher](https://hydra.cc/docs/plugins/submitit_launcher/) (`03-hydra-submitit-launcher.md`) |
| **Optuna** | Studies/trials in storage (in-memory, SQLite, RDB/Redis); samplers/pruners | Python API, `optuna` CLI module, Optuna Dashboard | Docs FAQ flags parallel optimization with SQLite3 as an error case; parallel + distributed requires RDB storage | [optuna.readthedocs.io/en/stable](https://optuna.readthedocs.io/en/stable/) (`03-optuna-docs.md`); [optuna.cli reference](https://optuna.readthedocs.io/en/stable/reference/cli.html) (`03-optuna-cli.md`) |
| **Ax (Adaptive Experimentation)** | Experiments/trials with "industry-grade experimentation management, including MySQL storage"; Client API for configure/get_next_trials/complete_trial | Python Client API; no CLI/MCP found | Heavier adaptive-experimentation platform (MySQL storage implied for management); no agent-facing interface documented on the site I read | [ax.dev](https://ax.dev/) (`03-ax-dev.md`) |
| **W&B Sweeps** | Sweep controller state + per-run assignments | CLI `wandb sweep` (create/stop/cancel/pause/resume), `wandb agent <sweep-ID>` workers | Sweep runs are W&B runs; agents parallelize by running more `wandb agent` processes; MCP server does not expose sweep creation | [docs.wandb.ai/guides/sweeps](https://docs.wandb.ai/guides/sweeps/) (`03-wandb-sweeps.md`); [docs.wandb.ai/ref/cli/wandb-sweep](https://docs.wandb.ai/ref/cli/wandb-sweep/) (`03-wandb-cli-sweep.md`) |

### 2d. Job launching, scheduling, long-run state

| Tool | State it owns | Agent interface | Documented limitation | Source |
|---|---|---|---|---|
| **Slurm** | Job queue + allocations + accounting (jobs, steps, states, reason codes) | CLI (`sbatch`, `squeue`, `squeue --json`, `sacct`, `scontrol`), REST API (`slurmrestd`) | No official MCP found; only community MCP wrappers (e.g. `yidong72/slurm_mcp`, 18 stars, SSH-based job submit/monitor/cancel). AOBench (see §4) evaluates HPC agents against **mock** SLURM snapshots, not live clusters | [slurm.schedmd.com/squeue.html](https://slurm.schedmd.com/squeue.html) (`03-slurm-squeue.md`), [sacct.html](https://slurm.schedmd.com/sacct.html) (`03-slurm-sacct.md`), [rest_api.html](https://slurm.schedmd.com/rest_api.html) (`03-slurm-rest-api.md`), [documentation.html](https://slurm.schedmd.com/documentation.html) (pack `docs-slurm.md`) |
| **submitit** | Python-side job handles wrapping SLURM (`AutoExecutor`, `job.result()`, `job.stdout()/stderr()`), local↔SLURM switch, checkpointing helpers | Python API; Hydra launcher plugin | "lightweight tool… basically wraps submission"; preemption/timeout handling requires configuring checkpointing | [facebookincubator/submitit README](https://raw.githubusercontent.com/facebookincubator/submitit/main/README.md) (`03-submitit-readme.md`) |
| **Ray** | Ray cluster, jobs submitted via Jobs API, runtime env, dashboard | CLI (`ray job submit/status/logs/stop`), Python `JobSubmissionClient`, REST | "Jobs are bound to the lifetime of a Ray cluster, so if the cluster goes down, all running jobs on that cluster will be terminated." Jobs started outside the Jobs API "are not managed by the Ray Jobs API" (not visible/interactable except list) | [docs.ray.io job submission](https://docs.ray.io/en/latest/cluster/running-applications/job-submission/index.html) (`03-ray-jobs.md`); [CLI page](https://docs.ray.io/en/latest/cluster/running-applications/job-submission/cli.html) (`03-ray-jobs-cli.md`) |
| **SkyPilot** | Clusters + managed jobs (`sky jobs`) across clouds/K8s/Slurm; auto-recovery/retries; job groups; API server; publishes an **agent skill** | CLI (`sky launch`, `sky exec`, `sky jobs launch`, `sky logs`, `-d` detached), skill for coding agents, API server | Managed jobs are "on either reserved clusters or elastic instances"; auto-recovery covers preemptions/GPU/NCCL/hardware and configurable app-error retries — i.e. you get recovery by buying managed-job semantics; cost/heterogeneity effects shown in the vendor blog (H100 vs H200, §4) | [docs.skypilot.co docs index](https://docs.skypilot.co/en/latest/docs/index.html) (`03-skypilot-docs.md`), [managed jobs](https://docs.skypilot.co/en/latest/examples/managed-jobs.html) (`03-skypilot-managed-jobs.md`), [blog](https://blog.skypilot.co/scaling-autoresearch/) (`03-skypilot-scaling-autoresearch-blog.md`) |
| **Modal** | Serverless functions/sandboxes/GPU jobs on Modal infra | Python/JS/Go SDKs, `modal` CLI, official **agent skill** (`modal skills install`) | Vendor cloud: SDK/CLI assume Modal account/GPU types; docs page is JS-rendered, no MCP mention found in `modal.com/llms.txt` (INFERENCE based on that file) | [modal.com/docs/guide](https://modal.com/docs/guide) (`03-modal-guide.md`), [modal.com/llms.txt](https://modal.com/llms.txt) (`03-modal-llms.md`), [modal-client README](https://raw.githubusercontent.com/modal-labs/modal-client/main/README.md) (`03-modal-readme.md`) |
| **Kubernetes / Kubeflow** | K8s: cluster objects, pods, logs, events; Kubeflow: Notebooks, Pipelines (KFP: components → DAG → IR YAML → backend), Katib (HPO), training operator, model registry | KFP Python SDK → IR YAML → submit to backend (REST); Kubernetes via kubectl and **third-party MCP servers** (`containers/kubernetes-mcp-server` 2085★, `Flux159/mcp-server-kubernetes` 1579★ — at fetch time) | Kubeflow is a platform on K8s (containers per component, DAG semantics); the MCP servers are community/3rd-party, not K8s/Kubeflow-official | [kubeflow.org/docs](https://www.kubeflow.org/docs/) (`03-kubeflow-docs.md`), [KFP overview](https://www.kubeflow.org/docs/components/pipelines/overview/) (`03-kubeflow-pipelines.md`), [kubernetes-mcp-server README](https://raw.githubusercontent.com/containers/kubernetes-mcp-server/main/README.md) (`03-gh-kubernetes-mcp.md`) |
| **torchrun (torch.distributed elastic)** | Rendezvous/process-group state for one distributed job; restarts on membership change | CLI (`torchrun --nproc-per-node … --rdzv…`) | "On failures or membership changes ALL surviving workers are killed immediately. Make sure to checkpoint your progress." No MCP found | [pytorch.org/docs/2.14/elastic/run.html](https://pytorch.org/docs/2.14/elastic/run.html) (`03-torchrun-elastic.md`) |
| **Hugging Face Jobs** | Jobs on HF infra: command + Docker image + hardware flavor, logs, metrics, volumes | CLI (`hf jobs run/uv run/ps/logs/inspect/wait/cancel`, `--detach`), Python (`run_job`, `fetch_job_logs`, `fetch_job_metrics`, `wait_for_job`, `cancel_job`) | Vendor infra + account; jobs are containerized commands (INFERENCE: no experiment-tracking semantics of its own) | [huggingface.co/docs/huggingface_hub/guides/jobs](https://huggingface.co/docs/huggingface_hub/guides/jobs) (`03-hf-jobs.md`), [CLI guide](https://huggingface.co/docs/huggingface_hub/en/guides/cli) (`03-hf-jobs-cli.md`) |
| **W&B Launch** | Jobs/queues/agents with target compute (Docker, Kubernetes, SageMaker, Vertex AI) | CLI (`wandb launch`, job create/deploy) + UI; queue/agent configs | Docs describe jobs, queues, agents, target resources; setup is per-target (Docker registry, Helm/Kaniko, IAM…); no MCP launch tools documented | [docs.wandb.ai/guides/launch](https://docs.wandb.ai/guides/launch/) (`03-wandb-launch.md`), [docs.wandb.ai/llms.txt](https://docs.wandb.ai/llms.txt) (`03-wandb-llms-txt.md`) |
| **Cluster schedulers research (context)** | — | — | Pollux/Sia ("goodput-optimized" DL cluster schedulers) show that resource-adaptivity/goodput are **research scheduler** concerns, not features of the mainstream trackers above | [Pollux DOI](https://doi.org/10.48550/arxiv.2008.12260) (`03-oa-pollux-scheduling.md`) |

### 2e. Bridges aimed at agents (as opposed to human UIs)

| Bridge | What it wraps | Interface | Limitation | Source |
|---|---|---|---|---|
| W&B MCP server (official) | W&B Models + Weave traces | MCP tools (query runs/sweeps via GraphQL, run history, compare runs, diagnose run, artifact versions, create report, log analysis) | Read/analyze oriented; no sweep/job launch; token budget; hosted server follows main branch | pack `docs-wandb-mcp.md`, `03-gh-wandb-mcp-readme.md` |
| MLflow MCP server (official, experimental) | MLflow traces (GenAI) | MCP tools for traces/feedback/assessments | Experimental; trace-only (no runs/metrics/jobs) | pack `docs-mlflow-mcp.md` |
| Comet MCP server (vendor-documented) | Comet experiments/projects/metrics | MCP list/get tools | Read-only tools; early repo | `03-comet-mcp.md` |
| Community MLflow MCP (`kkruglik/mlflow-mcp`) | MLflow tracking | MCP: experiments/runs/metrics/registry + write & delete actions | Community project (15★); not the vendor's server | `03-gh-mlflow-mcp-community.md` |
| Community SLURM MCP (`yidong72/slurm_mcp`) | Remote SLURM over SSH | MCP: submit/monitor/cancel jobs, GPU query, interactive sessions, file ops | Community (18★); SSH-based; needs credentials/partitions config | `03-gh-slurm-mcp.md` |
| Kubernetes MCP (`containers/kubernetes-mcp-server`) | K8s/OpenShift API | MCP: pods/logs/top/events, Helm, Tekton pipelines | Community (CNCF-adjacent but 3rd-party); focuses K8s not ML | `03-gh-kubernetes-mcp.md` |
| LabBook MCP | Agent memory of trials in a repo | MCP: trial/decision logging, briefings, semantic code search (Kuzu + LanceDB) | Community (14★); logging/memory, not job control | `03-gh-labbook-mcp.md` |
| SkyPilot agent skill + Modal skill | GPU job launcher / serverless | Agent skill files + CLI | Vendor-authored; requires CLI access and credentials | `03-skypilot-scaling-autoresearch-blog.md`, `03-modal-readme.md` |
| karpathy/autoresearch `program.md` | The DL experiment loop itself | "program.md is essentially a super lightweight skill" the agent edits around; agent edits `train.py` only | One repo's convention (95,752★ at fetch time); single GPU, one file, fixed 5-minute budget | `03-gh-autoresearch-readme.md` |
| MLflow CLI `mlflow agent setup` | Repo instrumentation | CLI (prototype): "Install MLflow skills and launch a coding agent to instrument this repo" | Prototype/experimental | `03-mlflow-cli.md` |

---

## 3. Per-tool notes

### MLflow
- State: runs (metadata + metrics + params + tags), experiments, logged models/checkpoints, artifacts;
  backend store can be local `mlruns/`, a SQLAlchemy DB, or a remote REST tracking server; artifact
  store local or S3/Azure; MLflow 3 adds `search_logged_models` and model IDs (URL:
  https://mlflow.org/docs/latest/ml/tracking/, receipt `03-mlflow-tracking.md`).
- Agent interface: Python tracking APIs, REST tracking server, CLI (`mlflow …`) and — importantly —
  the official **MCP server**, which the docs describe as: "The MLflow MCP server exposes all MLflow
  trace management operations through the MCP protocol". Its documented tool table is only
  `search_traces`, `get_trace`, `delete_traces`, `set_trace_tag`, `delete_trace_tag`, `log_feedback`,
  `log_expectation`, `get_assessment`, `update_assessment`, `delete_assessment` (URL:
  https://mlflow.org/docs/latest/genai/mcp/, pack `docs-mlflow-mcp.md`).
- Documented limitation: the MCP feature is "experimental and may change in future releases",
  requires "MLflow 3.5.1 or newer"; and the exposed surface is LLM tracing, not experiment
  runs or job control. CLI docs also carry a prototype `mlflow agent setup` command ("[Experimental]
  Install MLflow skills and launch a coding agent to instrument this repo") (URL:
  https://mlflow.org/docs/latest/cli.html, `03-mlflow-cli.md`).

### Weights & Biases (Models/Weave)
- State: hosted runs (config/summary/metrics), sweeps, artifacts + registry, reports; hosted MCP
  server for the W&B deployment; local install optional (URL:
  https://docs.wandb.ai/platform/mcp-server, pack `docs-wandb-mcp.md`).
- Agent interface: Python SDK; CLI (`wandb sweep` create/stop/cancel/pause/resume; `wandb agent`
  workers; `wandb launch` for queue/agent-based job launching); official MCP server with documented
  tool groups: Discovery (`list_entities_tool`, `probe_project_tool`, `infer_trace_schema_tool`),
  runs (`query_wandb_tool` GraphQL, `get_run_history_tool`, `compare_runs_tool`,
  `diagnose_run_tool`), traces (`query_weave_traces_tool`, …), reports
  (`create_wandb_report_tool`), artifacts (`list_artifact_versions_tool`,
  `compare_artifact_versions_tool`), docs (`search_wandb_docs_tool`) (URLs above; also
  https://raw.githubusercontent.com/wandb/wandb-mcp-server/main/README.md,
  `03-gh-wandb-mcp-readme.md`).
- Documented limitation: hosted server "follows the main branch" (pin by installing locally);
  response token budget default 30000; `mcp SDK 1.14.x` pin; Dedicated Cloud rate limits; local
  install required for STDIO-only clients / air-gapped operation. The documented MCP tool list
  contains no sweep creation and no job launching (that remains CLI/UI).
- Monitoring docs (relevant to "how a group watches a run"): W&B Alerts — run finished/crashed
  toggles (no code change) plus `run.alert()` for scriptable alerts to Slack/email; Automations —
  event→action rules ("When a run fails (event), notify a Slack channel (action)", metric
  thresholds such as NaN loss) and a webhook action (URLs:
  https://docs.wandb.ai/guides/runs/alert, https://docs.wandb.ai/guides/automations/;
  `03-wandb-alerts.md`, `03-wandb-automations.md`).

### Comet
- State: experiments (metrics/params/code/assets), Optimizer sweeps, Artifacts + model registry,
  production monitoring (docs nav, https://www.comet.com/docs/v2/, `03-comet-docs.md`).
- Agent interface: documented MCP server page on comet.com — tools are grouped as Experiment
  Management (`list_experiments`, `get_experiment_details`, `get_experiment_code`,
  `get_experiment_metric_data`), Project Management (`get_default_workspace`, `list_projects`, …),
  Session Management (`get_session_info`); installed via `pip install comet-mcp` or Docker; transports
  stdio/sse (URL: https://www.comet.com/docs/v2/api-and-sdk/mcp-server/overview/, `03-comet-mcp.md`).
- Limitation: the documented tool set is read-only analysis; the backing repo `comet-ml/comet-mcp`
  showed 1 star / last push 2026-06-01 at fetch time (GitHub API call in transcript; not saved as a
  receipt — treat as weak).

### Aim
- State: self-hosted training-run tracking: Python SDK query, remote tracking server, `aim up` UI;
  artifact storage/CLI manipulation listed on the roadmap as not-yet-done (URL:
  https://raw.githubusercontent.com/aimhubio/aim/main/README.md, `03-aim-readme.md`).
- Agent interface: Python SDK + CLI; no MCP found.
- Documented limitation: UI scalability caveat; "Aim is focused on training tracking"; roadmap lists
  Slurm/Kubeflow as "Shortlist" under "Next-up" resource-management integrations (i.e. no scheduler
  integration shipped). GitHub API showed the repo actively pushed (2026-09-13) — activity is not
  the issue; scope is.

### Sacred
- State: config scopes, captured functions, command-line overrides, observers that log run info to a
  DB/file, automatic seeding for reproducibility (URL: https://sacred.readthedocs.io/en/stable/,
  `03-sacred-docs.md`).
- Agent interface: Python API + CLI; no MCP found.
- Documented limitation: the docs are versioned 0.8.4; "Observing an Experiment" is observer-based
  (you supply MongoDB/File/etc.). No hosted server UI is described on the page I read.
  INFERENCE: looks like a legacy layer in 2026 stacks rather than an integration surface.

### TensorBoard
- State: event files in a `logdir`; scalars/images/audio/text/histograms written by summary ops;
  TensorBoard reads the logdir (URL:
  https://raw.githubusercontent.com/tensorflow/tensorboard/master/README.md,
  `03-tensorboard-readme.md`).
- Agent interface: CLI + summary-writing Python APIs; no MCP found.
- Documented limitation: "designed to run entirely offline"; logdir-centric; no remote tracking
  server concept in the README. Aim's comparison (competitor claim) says TensorBoard has no
  grouping/aggregation and slows at hundreds of runs (`03-aim-readme.md`).

### DVC
- State: git-adjacent data/model versioning (`.dvc` pointer files + cache + remotes), pipelines,
  `dvc exp` experiments, run cache, and an experiments **task queue** with
  `dvc queue start|stop|status|logs|remove|kill` after `dvc exp run --queue` (URLs:
  https://dvc.org/doc/start, https://dvc.org/doc/command-reference/queue; `03-dvc-start.md`,
  `03-dvc-queue.md`).
- Agent interface: CLI (`dvc …`), Python API; no official MCP found (GitHub search for "dvc mcp"
  returned only toy/unrelated repos, `03-dvc-mcp-search.md`).
- Documented limitation: queue manages experiment tasks, not cluster scheduling; sharing requires
  configuring remotes; tracking moves data out of Git by design.

### Git LFS
- State: large binary files stored in an LFS server with Git pointers/spec (`03-git-lfs-readme.md`).
- Agent interface: CLI extension only.
- Limitation: no experiment/metric/lineage semantics documented; it owns bytes.

### Hydra / OmegaConf
- State: the composed config for each run (saved under the run's output dir), `--multirun` sweeps,
  plugin launchers/sweepers (URL:
  https://hydra.cc/docs/tutorials/basic/running_your_app/multi-run/, `03-hydra-multirun.md`).
- Agent interface: CLI (`--multirun`, `key=value`, `hydra/launcher=…`), Python.
- Documented limitation: lazy composition at launch time (configs changed after launch may affect
  the composed config); default multirun is local + serial; cluster parallelism comes from plugins.
  The Submitit launcher requires a shared filesystem and the plugin environment on the target host
  (`03-hydra-submitit-launcher.md`).

### Optuna
- State: studies/trials + storage backends; samplers/pruners; dashboard (URL:
  https://optuna.readthedocs.io/en/stable/, `03-optuna-docs.md`).
- Agent interface: Python API, `optuna` CLI module (a thin wrapper; URL:
  https://optuna.readthedocs.io/en/stable/reference/cli.html), dashboard; no MCP found.
- Documented limitation: SQLite concurrency FAQ; RDB storage needed for distributed/parallel.

### Ax
- State: adaptive experimentation experiments/trials; "MySQL storage" for management (URL:
  https://ax.dev/, `03-ax-dev.md`).
- Agent interface: Python `Client` API shown on the landing page; no CLI/MCP found in what I read.
- Limitation: oriented to adaptive experimentation with a storage backend; no agent surface
  documented on the page read.

### Slurm
- State: the job queue and its lifecycle: `squeue` shows jobs with compact/extended state and
  reason codes, `--json` dumps machine-readable output; `sacct` reports accounting data (and notes
  accounting data can be incomplete, printing 0s for missing data); `slurmrestd` exposes a REST API
  (URLs: https://slurm.schedmd.com/squeue.html, https://slurm.schedmd.com/sacct.html,
  https://slurm.schedmd.com/rest_api.html; `03-slurm-squeue.md`, `03-slurm-sacct.md`,
  `03-slurm-rest-api.md`; pack `docs-slurm.md`).
- Agent interface: CLI + REST + optional JSON output. No official MCP found; community MCP exists
  (`03-gh-slurm-mcp.md` shows SSH-based submit/monitor/cancel; 18★).
- Documented limitation: none stated as an "agent interface"; the practical constraint is that a
  cluster is a shared, permissioned system — AOBench explicitly evaluates agents on mock SLURM
  rather than live clusters (`03-gh-aobench.md`).

### submitit
- State: SLURM job handles from Python, with logs/results; local fallback; checkpointing config
  (URL: https://raw.githubusercontent.com/facebookincubator/submitit/main/README.md,
  `03-submitit-readme.md`).
- Agent interface: Python API; Hydra plugin (`hydra/launcher=submitit_slurm`).
- Documented limitation: it "basically wraps submission"; checkpointing is the user's job.

### Ray
- State: cluster lifetime + jobs submitted through the Jobs API (URL:
  https://docs.ray.io/en/latest/cluster/running-applications/job-submission/index.html,
  `03-ray-jobs.md`).
- Agent interface: `ray job submit/status/logs/stop` CLI, `JobSubmissionClient` Python SDK, REST
  (URL: .../cli.html, `03-ray-jobs-cli.md`), dashboard.
- Documented limitation: jobs die with the cluster; jobs started outside the Jobs API are not
  managed/visible to it.

### SkyPilot
- State: clusters and managed jobs across 20+ clouds/K8s/Slurm; "manage the full lifecycle…" with
  auto-recovery from preemptions/GPU errors/node crashes and configurable app-error retries
  (URLs: https://docs.skypilot.co/en/latest/examples/managed-jobs.html,
  https://docs.skypilot.co/en/latest/docs/index.html; `03-skypilot-managed-jobs.md`,
  `03-skypilot-docs.md`).
- Agent interface: CLI (`sky launch`, `sky exec`, `sky jobs`, `sky logs`, `-d`), API server, and a
  published agent skill; the docs nav includes "Agents" with example pages ("GPU Job Management for
  Agents — SkyPilot Docs", "Parallel Autoresearch with SkyPilot") — page bodies are JS-rendered, so I
  verified titles/nav only (`03-skypilot-agents-index.md`, `03-skypilot-gpu-jobs.md`).
- Documented limitation: you supply/rent the infra; managed-job recovery is the SkyPilot-managed
  path (`sky jobs`) rather than plain `sky launch`; the vendor blog shows hardware heterogeneity
  effects the agent must discover itself (§4).

### Modal
- State: serverless GPU functions/sandboxes; Python/JS/Go SDKs (URL:
  https://raw.githubusercontent.com/modal-labs/modal-client/main/README.md, `03-modal-readme.md`).
- Agent interface: SDK + CLI + "official skill" for coding agents (`modal skills install`); no MCP
  found in `modal.com/llms.txt` (INFERENCE from that page; Modal docs body is JS-rendered).
- Documented limitation: Modal-cloud execution model (functions/sandboxes), account required.

### Kubernetes / Kubeflow
- State: K8s cluster objects (pods/logs/events); Kubeflow = platform with Pipelines (KFP), Notebooks,
  Katib (HPO), training operator, model registry; KFP pipelines are container DAGs compiled to IR
  YAML and submitted to a backend (URLs: https://www.kubeflow.org/docs/,
  https://www.kubeflow.org/docs/components/pipelines/overview/; `03-kubeflow-docs.md`,
  `03-kubeflow-pipelines.md`).
- Agent interface: KFP Python SDK → IR YAML → backend REST; K8s via kubectl or third-party MCP
  servers (`containers/kubernetes-mcp-server` documents pods/logs/top/events/Helm/Tekton tools
  (URL: https://raw.githubusercontent.com/containers/kubernetes-mcp-server/main/README.md,
  `03-gh-kubernetes-mcp.md`); GitHub search showed 2k+★ servers, `03-gh-search-mcp-kubernetes.md`).
- Documented limitation: KFP is container-per-component on Kubernetes; the MCP bridges are
  community, not vendor-official.

### torchrun (torch.distributed elastic)
- State: process group/rendezvous for one distributed job; restarts on failure/membership change
  (URL: https://pytorch.org/docs/2.14/elastic/run.html, `03-torchrun-elastic.md`).
- Agent interface: CLI only (no MCP found).
- Documented limitation: "On failures or membership changes ALL surviving workers are killed
  immediately. Make sure to checkpoint your progress." — i.e. the durable state is whatever you
  checkpoint.

### Hugging Face Jobs
- State: jobs on HF infra (command + image + flavor), logs, metrics, volumes; scheduling
  (`hf jobs scheduled …` per docs nav) (URL:
  https://huggingface.co/docs/huggingface_hub/guides/jobs, `03-hf-jobs.md`).
- Agent interface: `hf jobs run/uv run/ps/logs/inspect/wait/cancel` CLI and Python APIs
  (`run_job`, `fetch_job_logs`, `fetch_job_metrics`, `wait_for_job`, `cancel_job`) — scriptable
  enough for an agent (URL above; CLI guide `03-hf-jobs-cli.md`).
- Documented limitation: HF account/infra; a job is a container command, not a tracked experiment.

### W&B Launch
- State: launch jobs, queues, agents, and target resources (Docker, Kubernetes, SageMaker, Vertex)
  (URLs: https://docs.wandb.ai/guides/launch/ and the llms.txt index of Launch pages:
  https://docs.wandb.ai/llms.txt; `03-wandb-launch.md`, `03-wandb-llms-txt.md`).
- Agent interface: CLI (`wandb launch`, job create/deploy) and UI; the MCP server's documented tools
  do not include launch.
- Documented limitation: per-target setup complexity (registry/Helm/Kaniko/IAM); queue/agent model
  must be configured before jobs run (llms.txt page titles/summaries).

### Reproducibility practice (literature, abstract-level)
- Gundersen & Kjensmo, "State of the Art: Reproducibility in Artificial Intelligence" (AAAI 2018,
  DOI 10.1609/aaai.v32i1.11503): surveyed 400 IJCAI/AAAI papers against metrics for Experiment,
  Data, Method; "None of the papers document all of the variables"; 20–30% of variables per factor
  documented; "reproducibility scores decrease with increased documentation requirements"
  (`03-oa-gundersen.md`, abstract only).
- Raff, "A Step Toward Quantifying Independently Reproducible Machine Learning Research" (2019,
  DOI 10.48550/arxiv.1909.06674): manually attempted 255 papers (1984–2017); "focuses on releasing
  code… is not sufficient for determining reproducibility" (`03-oa-raff-independent-repro.md`,
  abstract only).
- Dodge et al., "Show Your Work" (2019, DOI 10.18653/v1/d19-1224): test-set scores alone are
  insufficient; report per-run distributions/expected max (`03-oa-show-your-work.md`, abstract).
- Pineau et al., NeurIPS 2019 Reproducibility Program report (DOI 10.48550/arxiv.2003.12206):
  checklist + code submission policy as the intervention (`03-oa-pineau-checklist.md`, abstract).
- Bouthillier et al., "Accounting for Variance in Machine Learning Benchmarks" (2021, DOI
  10.48550/arxiv.2103.03098): multiple trials over data sampling/init/hyperparameters needed;
  "prohibitively expensive, and corners are cut" (`03-oa-variance-bouthillier.md`, abstract).
- Kapoor & Narayanan, "Leakage and the reproducibility crisis in machine-learning-based science"
  (Patterns 2023, DOI 10.1016/j.patter.2023.100804): 17 fields, 294 papers affected; taxonomy of
  eight leakage types (`03-oa-leakage-kapoor.md`, abstract).
- MLOps framing: Kreuzberger et al., "Machine Learning Operations (MLOps): Overview, Definition,
  and Architecture" (IEEE Access 2023, DOI 10.1109/access.2023.3262138) (`03-oa-mlops-kreuzberger.md`,
  abstract); Sculley et al., "Hidden Technical Debt in Machine Learning Systems" (2015) — boundary
  erosion, entanglement, undeclared consumers, data dependencies, configuration issues
  (`03-oa-hidden-technical-debt.md`, abstract).
- Documentation standards: "Datasheets for Datasets" (DOI 10.1145/3458723,
  `03-oa-datasheets.md`), "Model Cards for Model Reporting" record fetched
  (`03-oa-model-cards.md`) — model cards appeared in the OpenAlex results but I did not extract its
  abstract text; treat as metadata-only.
- Science-side automation: A-Lab ran "17 days of continuous operation" (`03-oa-self-driving-lab.md`,
  abstract); RO-Crate/PROV-O are packaging/provenance standards with no agent interface
  (`03-ro-crate-home.md`, `03-prov-o.md`).

---

## 4. Practitioner reports (labelled)

**V1. Vendor first-hand report — SkyPilot, "Scaling Karpathy's Autoresearch" (March 2026).** Claude
Code was given 16 GPUs on two Kubernetes clusters via SkyPilot and left to run: over ~8 hours it
submitted ~910 experiments (≈700 valid), ~90/hour, and drove val_bpb 1.003 → 0.974. Mechanics it
documents: experiments as YAML launched with `sky launch`/`-d` detached, pipelining on one cluster
with `sky exec`, checking results with `sky logs`, a skill file teaching the agent the loop; the
agent independently discovered H100/H200 step-time differences and invented a two-tier
screen-then-validate strategy. Cost reported: ~$9 of LLM API + <$300 of GPU time. This is vendor
material (SkyPilot), so read it as a marketing-grade case study, but it is the most concrete
published account I found of an agent *launching and monitoring* many real GPU jobs unattended
(URL: https://blog.skypilot.co/scaling-autoresearch/, `03-skypilot-scaling-autoresearch-blog.md`).

**V2. Open-source project first-hand — karpathy/autoresearch (repo, 95,752★ at fetch; HN threads
March 2026).** The README describes the loop as: agent edits `train.py` only, trains for a *fixed
5-minute wall-clock budget*, checks `val_bpb`, keeps/discards, repeats — "approx 12
experiments/hour and approx 100 experiments while you sleep"; the human edits `program.md` ("a super
lightweight 'skill'"); results are explicitly *not comparable across platforms* because of the fixed
time budget. Limitations stated by the author: single NVIDIA GPU only, no distributed training, no
complex configs, one file (URL:
https://raw.githubusercontent.com/karpathy/autoresearch/master/README.md,
`03-gh-autoresearch-readme.md`; HN story https://news.ycombinator.com/item?id=47442435 via
`03-hn-autoresearch-gpu-thread.md`).

**H1. HN thread on the SkyPilot report (237 points, 94 comments).** Critical practitioner comments,
verbatim excerpts: "Who's got a cluster of H100s and H200s just lying around?"; "It's really just
saying that having a bigger credit card gets you shit faster, but it's actually worse in terms of
GPU utilization and efficiency" (arguing the 8h/16-GPU comparison should match GPU-hours, not
wall-clock); "Feels like we've solved how to run agents anywhere, but not yet how to trust them
anywhere."; one commenter ("ordinarily") claims they had been running "wildly complicated ML
pipelines working similarly in parallel" for about a month before Karpathy's repo. These are
unverified individual opinions but they are the practitioner counterweight to V1 (receipt:
`03-hn-autoresearch-gpu-thread.md`).

**H2. HN comment on watching long runs (March 2026, PulseLog thread).** "I built this after a
training run crashed at 3am and I had no idea until morning. Every existing tool either blocks the
main thread, requires a cloud account, or has no visual UI." — first-hand statement of the
overnight-monitoring gap from a solo researcher (receipt: `03-hn-training-run-comments.md`;
the HN search hit is the story/comment JSON for https://pypi.org/project/pulselog/).

**P1. Published agent benchmarks with explicit long-run budgets.**
- MLE-bench (OpenAI; repo README): agent *defaults* documented as "Runtime: 24 hours; Compute: 36
  vCPUs with 440GB RAM and one 24GB A10 GPU", with grading via `mlebench grade`
  (https://raw.githubusercontent.com/openai/mle-bench/main/README.md, pack `repo-mle-bench.md`).
- RE-Bench (abstract): 7 ML research-engineering environments; "71 8-hour attempts by 61 distinct
  human experts"; best AI agents score 4x human at a 2-hour total budget, humans narrowly exceed at
  8 hours and reach 2x the top agent at 32 hours; "modern AI agents… can generate and test solutions
  over ten times faster than humans, at much lower cost" (DOI 10.48550/arxiv.2411.15114,
  `03-oa-rebench.md`).
- MLAgentBench (abstract): 13 ML experimentation tasks; agent actions are "reading/writing files,
  executing code, and inspecting outputs" (DOI 10.48550/arxiv.2310.03302, `03-oa-mlagentbench2.md`).
- MLGym (abstract): "first Gym environment for machine learning (ML) tasks" with 13 open-ended
  research tasks (DOI 10.48550/arxiv.2502.14499, `03-oa-mlgym.md`).
- Kosmos (abstract): "runs for up to 12 hours performing cycles of parallel data analysis,
  literature search, and hypothesis generation"; motivated by agents "los[ing] coherence" after
  limited actions (DOI 10.48550/arxiv.2511.02824, `03-oa-kosmos.md`).
- The AI Scientist (v1/v2 repos): v1 runs a full idea→experiment→paper pipeline on NVIDIA GPUs with
  a `--parallel` option across GPUs; v2 runs "several hours", uses agentic best-first tree search
  with `num_workers` parallel exploration paths, and has an explicit GPU-memory troubleshooting
  entry (pack `repo-ai-scientist.md`, `repo-ai-scientist-v2.md`).
- Agent Laboratory: "Co-Pilot mode" asks the human to tell the agent "what compute resources it has
  access to, e.g. GPUs (how many, what type of GPU, how many GBs), CPUs…, storage limitations"
  (pack `repo-agent-laboratory.md`).
- AOBench (repo, 8★, DOI on README): a benchmark for "AI agents that operate HPC systems — job
  scheduling, telemetry interpretation, energy reasoning, policy enforcement"; runs against
  "deterministic environment snapshot[s] with mock HPC tools (SLURM, telemetry, RBAC…)" rather than
  live clusters, "so results are reproducible, portable, and safe to publish"
  (https://raw.githubusercontent.com/MSKazemi/aobench/main/README.md, `03-gh-aobench.md`).

**P2. A contrarian first-hand critique of AI-Scientist-style loops.** Sam Rodriques (FutureHouse),
responding to Sakana's AI Scientist: "it's chatGPT or Claude writing code, making some plots, and
then writing papers. It's a nice demo, but not a major technical breakthrough", in a post about
"What does it take to build an AI Scientist?" (HN comment linking
https://www.sam-rodriques.com/post/what-does-it-take-to-build-an-ai-scientist; page fetched but its
body did not render into my strip — cite as comment + link, `03-hn-ai-scientist-comments.md` /
`03-bh-rodriques-ai-scientist.md`).

**C1. Community MCP bridges (small, first-hand projects; stars at fetch time).**
`yidong72/slurm_mcp` (18★; SSH job submit/monitor/cancel/GPU query/interactive sessions),
`kkruglik/mlflow-mcp` (15★; MLflow runs + registry + write/delete actions),
`anthonylee991/claude-labbook` (14★; persistent trial/decision log as agent memory),
`containers/kubernetes-mcp-server` (2,085★; K8s/OpenShift + Helm + Tekton),
`Flux159/mcp-server-kubernetes` (1,579★). Receipts: `03-gh-slurm-mcp.md`,
`03-gh-mlflow-mcp-community.md`, `03-gh-labbook-mcp.md`, `03-gh-kubernetes-mcp.md`,
`03-gh-search-mcp-kubernetes.md`.

**C2. Other community agent-research projects found (not individually read beyond descriptions).**
`microsoft/RD-Agent` (14,609★), `eimenhmdt/autoresearcher` (443★), `autoresearcherUI` (252★),
"awesome-autoresearch" list (156★) — GitHub search receipts
`03-gh-search-agent-autonomous-research.md`, `03-gh-rd-agent-readme.md`,
`03-gh-autoresearcher-readme.md`.

---

## 5. Three design disagreements

**D1. What is the unit of research work: a short fixed-budget experiment, or a long multi-hour job?**
- Short-loop side: autoresearch is built around a fixed 5-minute budget so that runs stay comparable
  and ~100 can run overnight (README, `03-gh-autoresearch-readme.md`); Hydra's default multirun is
  serial/local (`03-hydra-multirun.md`); W&B sweeps parallelize by adding `wandb agent` workers
  (`03-wandb-sweeps.md`); DVC's queue processes queued `dvc exp run`s (`03-dvc-queue.md`).
- Long-job side: MLE-bench gives agents 24 hours + a GPU by default (`repo-mle-bench.md`); RE-Bench
  measures 8-hour human attempts and shows humans' relative advantage *grows* with time budget
  (`03-oa-rebench.md`); Kosmos runs up to 12 hours (`03-oa-kosmos.md`); SkyPilot's whole value
  proposition is managing long-lived jobs with recovery (`03-skypilot-managed-jobs.md`); torchrun's
  restart semantics force checkpointing for multi-hour jobs (`03-torchrun-elastic.md`).
- The disagreement is live and measurable: RE-Bench's agent-vs-human crossover by time budget
  (`03-oa-rebench.md`) is the closest thing to evidence about which unit favors agents.

**D2. How much authority should an agent have: read/analyze, or submit/cancel?**
- Read/analyze: the two vendor MCP servers that actually ship are read-oriented. MLflow's MCP is
  traces-only (pack `docs-mlflow-mcp.md`); W&B's MCP documents query/compare/diagnose plus report
  creation, not launching (pack `docs-wandb-mcp.md`); Comet's MCP is list/get
  (`03-comet-mcp.md`).
- Submit/cancel: SkyPilot publishes a skill and a blog post where the agent provisions clusters,
  submits jobs detached, and reads logs (V1); Modal ships an official skill
  (`03-modal-readme.md`); `hf jobs` CLI/Python gives run/cancel/wait (`03-hf-jobs.md`); community
  MCP servers exist precisely to give agents submit/monitor/cancel on SLURM and K8s
  (`03-gh-slurm-mcp.md`, `03-gh-kubernetes-mcp.md`); W&B Launch documents jobs/queues/agents and a `wandb launch` command to create/deploy jobs
  (`03-wandb-launch.md`, `03-wandb-llms-txt.md`).
- Practitioner unease is explicit: "solved how to run agents anywhere, but not yet how to trust
  them anywhere" (`03-hn-autoresearch-gpu-thread.md`). Nobody in my sources documents a
  permission/approval model for agent job submission beyond SSH keys/API tokens and Slurm's own
  accounts/partitions (INFERENCE).

**D3. Where is the source of truth for an experiment: a tracking server/database, or files in Git?**
- Server/DB side: MLflow backend store + REST tracking server, W&B hosted runs/artifacts,
  Comet experiments, Optuna RDB storage, Ax MySQL storage (`03-mlflow-tracking.md`,
  pack `docs-wandb-artifacts.md`, `03-comet-docs.md`, `03-optuna-docs.md`, `03-ax-dev.md`).
- Git-native side: DVC ("DVC is your 'Git for data'… metadata about your data is versioned alongside
  your source code", `03-dvc-start.md`), git-lfs for bytes (`03-git-lfs-readme.md`), Hydra's
  composed config in per-run output dirs (`03-hydra-multirun.md`), Sacred's file observer
  (`03-sacred-docs.md`), and autoresearch where the human edits `program.md` and the agent edits
  `train.py` under Git (V2).
- The split shows up operationally: DVC needs a remote configured to share data
  (`03-dvc-start.md`); W&B artifacts are lineage edges attached to runs (pack
  `docs-wandb-artifacts.md`); the two worlds have separate search UIs. No source I read reconciles
  them; the closest bridge found is `aimlflow` mentioned in Aim's README
  (`03-aim-readme.md`).
- (Runner-up disagreement, not expanded: documentation standards for datasets/models — dataset
  cards, Datasheets, Model Cards, RO-Crate (`03-hf-datasets-cards.md`, `03-oa-datasheets.md`,
  `03-oa-model-cards.md`, `03-ro-crate-home.md`) — versus artifact versioning systems that pin bytes
  but say little about intended use.)

---

## 6. Gap list

Each gap: what is missing, evidence I have, and whether it is source-stated or my inference.

1. **No mainstream "research issue/task graph" that is also the experiment record.** The issue
   trackers in the pack (beads, spec-kit, etc.) are software-dev artifacts; experiment trackers own
   runs but have no notion of a task with blocking edges or a "what may start" gate; the
   agent-research projects (AI Scientist, Agent Laboratory, autoresearch) each invent their own
   pipeline/tree-search state and it dies with the run. Evidence: pack `repo-ai-scientist.md`,
   `repo-ai-scientist-v2.md`, `repo-agent-laboratory.md`; `03-gh-autoresearch-readme.md`;
   tracker docs above. INFERENCE.

2. **No cross-scheduler standard for "job state" that an agent can query once.** Slurm (CLI/REST),
   Ray Jobs API, SkyPilot managed jobs, HF Jobs, Modal, and K8s each have their own verbs and
   state vocabularies; there is no common schema, and MCP coverage is partial and mostly
   community-built (`03-slurm-rest-api.md`, `03-ray-jobs.md`, `03-skypilot-managed-jobs.md`,
   `03-hf-jobs.md`, `03-gh-slurm-mcp.md`, `03-gh-kubernetes-mcp.md`). INFERENCE.

3. **No standard mid-run checkpoint contract between trainers and agents.** torchrun documents
   "ALL surviving workers are killed immediately… Make sure to checkpoint your progress"
   (`03-torchrun-elastic.md`); submitit points to its checkpointing docs for preemption/timeouts
   (`03-submitit-readme.md`); nothing in MLflow/W&B/Comet docs I read describes resuming from a
   checkpoint as a first-class experiment state (they log models/artifacts). INFERENCE from those
   docs.

4. **No budget/permission layer for agent-submitted jobs.** W&B Launch documents queues and
   agents with target resources, and Slurm has accounts/partitions/QOS, but no source I read shows
   a queue/priority/quota model designed for *agents* (as opposed to users). Evidence for the
   absence: no such feature appears in the MCP tool lists (`docs-wandb-mcp.md`,
   `docs-mlflow-mcp.md`, `03-comet-mcp.md`), in SkyPilot's managed-jobs page
   (`03-skypilot-managed-jobs.md`), or in HF Jobs docs (`03-hf-jobs.md`); the HN thread flags trust
   as unsolved (`03-hn-autoresearch-gpu-thread.md`). INFERENCE.

5. **No convention for "why this config" (decision rationale) attached to a run.** Trackers store
   params; Hydra stores the composed config (`03-hydra-multirun.md`); none stores the reasoning or
   the rejected alternatives. The only tool found that targets this is a 14★ community MCP
   (LabBook: "trial logging… decision logging with rationale", `03-gh-labbook-mcp.md`). INFERENCE.

6. **Seeds and variance are documented in the literature, not enforced by tools at run level.**
   Auto-seeding exists in Sacred (`03-sacred-docs.md`); Hydra/Optuna expose config/storage; but the
   reproducibility literature says most papers under-document variables (Gundersen: 20–30% per
   factor, `03-oa-gundersen.md`) and that variance needs multiple trials (Bouthillier,
   `03-oa-variance-bouthillier.md`), while the checkpoint/description conventions live in paper
   checklists, not run metadata (Pineau, `03-oa-pineau-checklist.md`; Dodge,
   `03-oa-show-your-work.md`). INFERENCE that no mainstream tool enforces it.

7. **Dataset *change* tracking during a project has a tool (DVC) but no visible convention.**
   Dataset cards document a dataset (`03-hf-datasets-cards.md`); DVC versions it
   (`03-dvc-start.md`); W&B artifacts version it inside W&B (pack `docs-wandb-artifacts.md`). None
   of these is referenced by the agent-research repos I read (MLE-bench, AI Scientist,
   autoresearch), which pin data by download scripts/constant. INFERENCE.

8. **Watching a multi-hour run is still mostly alerts + polling, and the agent story is thin.**
   Documented human-oriented mechanisms: W&B Alerts/Automations (Slack/email, run failed/crashed,
   metric thresholds; `03-wandb-alerts.md`, `03-wandb-automations.md`), Slurm queue/accounting
   (`03-slurm-squeue.md`, `03-slurm-sacct.md`), Ray dashboard (`03-ray-jobs.md`), TensorBoard logdir
   (`03-tensorboard-readme.md`). The only agent-side watchers found are the SkyPilot blog loop
   (`sky logs`; vendor) and community MCPs that wrap SLURM status. A first-hand practitioner note
   says the failure mode is "a training run crashed at 3am and I had no idea until morning"
   (`03-hn-training-run-comments.md`). No published work was found on an agent *supervising* a
   single multi-hour training run; the closest published budgets are MLE-bench 24h, RE-Bench 8h,
   Kosmos 12h (`repo-mle-bench.md`, `03-oa-rebench.md`, `03-oa-kosmos.md`). INFERENCE + absence of
   found sources.

9. **Science (non-DL) experiment state has packaging standards but no agent interface.**
   RO-Crate/PROV-O/Workflow Run RO-Crate exist and Nextflow can emit provenance
   (`03-ro-crate-home.md`, `03-prov-o.md`, `03-nextflow-home.md`), but I found no MCP/agent bridge
   for any of them (search results only). INFERENCE.

10. **Long-run cost/efficiency is a research topic, not a product feature.** Pollux/Sia treat
    goodput-optimized scheduling as a systems research problem (DOI 10.48550/arxiv.2008.12260,
    `03-oa-pollux-scheduling.md`); the HN critique of the SkyPilot run argues the 16-GPU result is
    worse in GPU-hours (`03-hn-autoresearch-gpu-thread.md`); no tracker/launcher doc I read exposes
    a standard "budget in GPU-hours" gate. INFERENCE.

---

## 7. Could not verify / open questions

- **`arxiv.org` and full texts.** All paper claims above are abstract-level from OpenAlex
  (`abstract_inverted_index`), except the repo READMEs. Full-text claims (e.g. exact per-task
  budgets, failure-mode taxonomies) are out of reach here. Semantic Scholar API returned 429 for
  most queries (manifest + my fetches).
- **Gundersen 2018**: found via a quoted OpenAlex search (`03-oa-gundersen.md`); DOI
  10.1609/aaai.v32i1.11503. Abstract only.
- **MLflow MCP scope**: verified from the vendor page that the tool list is traces-only and the
  feature is experimental (pack `docs-mlflow-mcp.md`). I did **not** find a second official MLflow
  MCP surface for runs.
- **W&B Launch details**: the Launch page body did not render; I verified page titles/summaries via
  `docs.wandb.ai/llms.txt` (`03-wandb-llms-txt.md`) and the FAQ headings in the page HTML
  (`03-wandb-launch.md`). Exact `wandb launch` CLI flags were not read from a rendered page.
- **SkyPilot agent pages**: `docs/agents/*` and `examples/agents/*` bodies are JS-rendered; I
  verified only nav titles and the `sky jobs`/blog content that did render
  (`03-skypilot-agents-index.md`, `03-skypilot-gpu-jobs.md`, `03-skypilot-docs.md`,
  `03-skypilot-scaling-autoresearch-blog.md`).
- **Comet limits page**: my guessed URL
  (`…/guides/experiment-management/troubleshooting-faq/limits/`) returned 404
  (`03-comet-limits.md`); Comet's documented limits were therefore not read.
- **Comet MCP ownership**: docs page is on comet.com; the GitHub repo `comet-ml/comet-mcp` had 1
  star (GitHub API call in transcript, not saved as a receipt). Treat "official" as
  vendor-documented, not vendor-maintained-with-a-team.
- **Negative MCP findings** (Aim, Sacred, TensorBoard, DVC, Optuna, Ax, Slurm-official, Ray,
  SkyPilot, Modal, Kubeflow, torchrun, HF Jobs): these are results of GitHub repo search + reading
  vendor pages/nav/llms.txt at one point in time. Absence of an official MCP server elsewhere is
  possible.
- **Seeds/limits of the docs fetch**: several vendor doc sites are aggressively JS-rendered
  (Modal, Comet, SkyPilot, parts of W&B); text extraction may have missed content even when HTTP
  200. Files in `raw/sources/03-*.md` are the raw HTML/JSON, so a human can re-check.
- **HN queries**: Algolia's `wandb` query matched "wandboard"/"wandbox" noise
  (`03-hn-wandb-comments.md`); precision was low for "experiment tracking"
  (`03-hn-experiment-tracking.md`). The useful threads were found via `autoresearch`, `mlflow`,
  `slurm`, `"gpu cluster"`, `"training run"` and the story_id comment query.
- **No published work found specifically on agents supervising multi-hour runs** (as opposed to
  running their own experiment loops). Open questions I could not close: is there any system that
  parses training logs for anomalies and intervenes (as opposed to alerting)? Does any lab publish
  its agent job-submission permission model? Are there *research-science* (non-DL) issue
  trackers/ELNs with agent interfaces — my search only surfaced DL/software-side projects.
