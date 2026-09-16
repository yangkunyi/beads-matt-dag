# Which facts belong to DVC and which to the flow: what dvc.yaml and dvc.lock hold, what dvc exp records and where, whether DVC's experiment/run concept doubles a ticket, and what an outside reference to a DVC-tracked artifact looks like

## Claims

- **c1** dvc.yaml is where a project is configured: its stages, and also artifacts, metrics, params and plots, either per stage or on their own; the stages list is typically its most important part.
  Source: url:https://dvc.org/doc/user-guide/project-structure/dvcyaml-files (dvc.yaml — opening paragraph)
  > You can configure machine learning projects in one or more dvc.yaml files. The list of stages is typically the most important part of a dvc.yaml file, though the file can also be used to configure artifacts, metrics, params, and plots, either as part of a stage definition or on their own.

- **c2** Parameters are declared per stage in the params field of dvc.yaml by key (name, or params-file path plus names) — the pin is the key; the values themselves are consumed from a structured params file.
  Source: url:https://dvc.org/doc/user-guide/project-structure/dvcyaml-files (Parameters)
  > Parameters are simple key/value pairs consumed by the command code from a structured parameters file. They are defined per-stage in the params field of dvc.yaml and should contain one of these: A param name that can be found in params.yaml (default params file); A dictionary named by the file path to a custom params file, and with a list of param key/value pairs to find in it;

- **c3** DVC maintains dvc.lock itself; the docs say not to edit it.
  Source: url:https://dvc.org/doc/user-guide/project-structure/dvcyaml-files (dvc.lock file)
  > Avoid editing these files. DVC will create and update them for you.

- **c4** dvc.lock restates the stage definitions, lists every dependency and all forms of output (including metrics and plots files) with a content hash (md5, etag or checksum), and lists full parameter dependencies — key and value — under each parameters file name; templated values are resolved there.
  Source: url:https://dvc.org/doc/user-guide/project-structure/dvcyaml-files (dvc.lock file)
  > Stages are listed again in dvc.lock, in order to know if their definitions change in dvc.yaml. Regular dependency entries and all forms of output entries (including metrics and plots files) are also listed (per stage) in dvc.lock, including a content hash field (md5, etag, or checksum). Full parameter dependencies (both key and value) are listed too (under params), under each parameters file name.

- **c5** dvc.lock tracks intermediate and final pipeline outputs like .dvc files, and several commands need it (dvc checkout, dvc get).
  Source: url:https://dvc.org/doc/user-guide/project-structure/dvcyaml-files (dvc.lock file)
  > Tracking of intermediate and final outputs of a pipeline — similar to.dvc files. Needed for several DVC commands to operate, such as dvc checkout or dvc get.

- **c6** The lock is a state file created by reproduction, capturing the reproduction's results.
  Source: url:https://dvc.org/doc/start/data-pipelines/data-pipelines (Reproducing)
  > You'll notice a dvc.lock (a "state file") was created to capture the reproduction's results.

- **c7** dvc.lock captures hashes of the dependencies and values of the parameters that were used; it is the state of the pipeline.
  Source: url:https://dvc.org/doc/start/data-pipelines/data-pipelines (Reproducing)
  > The dvc.lock file is similar to a.dvc file — it captures hashes (in most cases md5 s) of the dependencies and values of the parameters that were used. It can be considered a state of the pipeline

- **c8** The Git commit of the lock is the reader's act, not DVC's: the docs call it good practice to commit dvc.lock immediately after it is created or modified, to record the state and results.
  Source: url:https://dvc.org/doc/start/data-pipelines/data-pipelines (Reproducing)
  > It's good practice to immediately commit dvc.lock to Git after its creation or modification, to record the current state & results

- **c9** dvc.yaml and dvc.lock in Git are what version a pipeline: they describe the data to use and the commands that generate the results, and storing them in Git is what makes the pipeline easy to version and share.
  Source: url:https://dvc.org/doc/start/data-pipelines/data-pipelines (Summary)
  > Reproducibility: dvc.yaml and dvc.lock files describe what data to use and which commands will generate the pipeline results (such as an ML model). Storing these files in Git makes it easy to version and share.

- **c10** DVC's glossary groups dvc.yaml, dvc.lock and .dvc files as 'DVC files' — created in the workspace by DVC commands to codify pipelines and/or track data.
  Source: url:https://dvc.org/doc/user-guide/glossary (DVC File)
  > DVC File: dvc.yaml, dvc.lock, or.dvc files. DVC commands create these in the workspace to codify pipelines and/or to track data for versioning.

- **c11** DVC's glossary defines an experiment as a versioned iteration of ML model development: Git commits DVC can find that don't clutter the Git history or branches, possibly carrying code, metrics, parameters, plots, and data and model artifacts.
  Source: url:https://dvc.org/doc/user-guide/glossary (Experiment)
  > Experiment: A versioned iteration of ML model development. DVC tracks experiments as Git commits that DVC can find but that don't clutter your Git history or branches. Experiments may include code, metrics, parameters, plots, and data and model artifacts.

- **c12** Experiments are stored as custom Git references under .git/refs/exps — one or more commits based on HEAD; they are hidden, not checked out, and not pushed to Git remotes by default.
  Source: url:https://dvc.org/doc/user-guide/experiment-management (How does DVC track experiments?)
  > Experiments are custom Git references (found in.git/refs/exps) with one or more commits based on HEAD. These commits are hidden and not checked out by DVC. Note that these are not pushed to Git remotes by default either (see dvc exp push).

- **c13** An experiment is a variation of the project connected to HEAD as its parent/baseline; it does not form part of the regular Git tree, which is what keeps temporary commits and branches out of the repo.
  Source: url:https://dvc.org/doc/user-guide/experiment-management (DVC Experiments Overview)
  > Experiments preserve a connection to the latest commit in the current branch (Git HEAD) as their parent or baseline, but do not form part of the regular Git tree. This prevents bloating your repo with temporary commits and branches.

- **c14** An experiment is identified by a unique name — auto-generated by default (e.g. puffy-daks) unless set with --name/-n — and that name is exposed as the DVC_EXP_NAME environment variable.
  Source: url:https://dvc.org/doc/command-reference/exp/run (Options -n <name>)
  > -n <name>, --name <name> - specify a unique name for this experiment. A default one will be generated otherwise, such as puffy-daks. The name of the experiment is exposed in env var DVC_EXP_NAME.

- **c15** dvc exp run with no arguments is equivalent to dvc repro followed by dvc exp save.
  Source: url:https://dvc.org/doc/command-reference/exp/run (Description)
  > When called with no arguments, this is equivalent to dvc repro followed by dvc exp save.

- **c16** dvc exp run executes and tracks an experiment without extra Git commits, branches or directories; dvc exp save captures the current workspace as an experiment the same way.
  Source: url:https://dvc.org/doc/command-reference/exp/save (Description)
  > Saves a snapshot of your project project as an experiment experiment, without polluting your Git repository with unnecessary commits, branches, directories, etc.

- **c17** The experiment's results are stored and tracked internally by DVC and can be seen in the workspace; dvc exp show is what displays and compares multiple experiments with their params and metrics.
  Source: url:https://dvc.org/doc/user-guide/experiment-management/running-experiments (Experiment results)
  > The results of the last dvc exp run can be seen in the workspace workspace. They are stored and tracked internally by DVC. To display and compare multiple experiments along with their parameters parameters and metrics metrics, use dvc exp show.

- **c18** Only files tracked by Git or DVC are saved to an experiment; untracked files cannot be restored (except via --include-untracked).
  Source: url:https://dvc.org/doc/user-guide/experiment-management/running-experiments (Experiment results)
  > Only files tracked by either Git or DVC are saved to the experiment. Untracked files cannot be restored.

- **c19** A queued or temp experiment is run in a copy of the workspace under .dvc/tmp/exps, so it does not run in place.
  Source: url:https://dvc.org/doc/user-guide/experiment-management/running-experiments (How are experiments isolated?)
  > DVC creates a copy of the experiment's original workspace in.dvc/tmp/exps/ and runs it there.

- **c20** .dvc/tmp/exps is the documented home of workspace copies used for temporary or queued experiments.
  Source: url:https://dvc.org/doc/user-guide/project-structure/internal-files (Internal Directories and Files)
  > .dvc/tmp/exps: This directory will contain workspace copies used for temporary or queued experiments.

- **c21** dvc exp list prints the experiments found in the repository together with the branch/tag or commit they are based on — name plus baseline is the listing.
  Source: url:https://dvc.org/doc/command-reference/exp/list (Description)
  > Prints a list of experiments found in the current repository, and the branch/tag or commit they're based on.

- **c22** dvc exp show's table has columns for all metrics, parameters and dependencies of the project by default.
  Source: url:https://dvc.org/doc/command-reference/exp/show (Description)
  > By default, the printed experiments table will include columns for all metrics, parameters and dependencies from the entire project.

- **c23** By default dvc exp show only shows experiments derived from Git HEAD; --all-commits includes all experiments.
  Source: url:https://dvc.org/doc/command-reference/exp/show (Description)
  > Only the experiments derived from the Git HEAD are shown by default but all experiments can be included with the --all-commits option.

- **c24** The exp family is DVC's whole lifecycle for an experiment: run, show, diff, apply, branch, remove, push, pull, list and clean.
  Source: url:https://dvc.org/doc/command-reference/exp (Description)
  > A set of commands to generate and manage experiments experiments: run, show, diff, apply, branch, remove, push, pull, list, and clean.

- **c25** Experiments are tied to the Git repo but ignored by normal Git operations: git push, git pull and git clone.
  Source: url:https://dvc.org/doc/user-guide/experiment-management/sharing-experiments (Push experiments)
  > DVC experiments experiments are tied to your Git repo, but they are ignored by normal Git operations like git push, git pull, and git clone.

- **c26** By default an experiment is stored only where it was run.
  Source: url:https://dvc.org/doc/user-guide/experiment-management/sharing-experiments (Sharing Experiments)
  > By default, your experiments are stored only where they were run.

- **c27** Persisting an experiment means restoring its results (dvc exp branch / dvc exp apply) and committing with standard Git commands; DVC-tracked data and artifacts already sit in the DVC cache and need dvc push to be shared.
  Source: url:https://dvc.org/doc/user-guide/experiment-management/comparing-experiments (Bring experiment results to your workspace)
  > You can use standard Git commands (e.g. git add/commit/push) to persist this experiment directly in the repository repository. DVC-tracked data and artifacts are already in the DVC cache, and the rest (params, code and config files, etc.) can be stored in Git.

- **c28** Successful experiments become persistent by restoring via dvc exp branch or dvc exp apply and committing them to the Git repo — the commit is the act that makes an experiment permanent.
  Source: url:https://dvc.org/doc/command-reference/exp/run (Description)
  > Successful ones can be made persistent by restoring them via dvc exp branch or dvc exp apply and committing them to the Git repo.

- **c29** Every pipeline run logs the unique signature of each stage run under .dvc/cache/runs — that is the run cache.
  Source: url:https://dvc.org/doc/user-guide/pipelines/run-cache (Run Cache: Automatic Log of Stage Runs)
  > Every time you run a pipeline with DVC, it logs the unique signature of each stage run (in.dvc/cache/runs).

- **c30** The run cache is also populated by dvc exp run, not only by dvc repro.
  Source: url:https://dvc.org/doc/user-guide/pipelines/run-cache (Run Cache: Automatic Log of Stage Runs)
  > The run cache is also enabled when you use dvc exp run (see DVC Experiments).

- **c31** A run in DVC is identified by a content signature: the combination of exact dependency contents (or parameter values) and the literal command(s) — not by a name or an id.
  Source: url:https://dvc.org/doc/user-guide/project-structure/internal-files (Run cache)
  > Runs are identified as combinations of exact dependency dependency contents (or parameter values), and the literal command(s) to execute.

- **c32** What the run cache stores is copies of the dvc.lock file that resulted from each run; the run's outputs are in the regular cache.
  Source: url:https://dvc.org/doc/user-guide/project-structure/internal-files (Run cache)
  > The files themselves are backups of the dvc.lock file that resulted from that run.

- **c33** The glossary's run cache is a log of stages that have been run, made of dvc.lock backups identified as combinations of dependencies, commands and outputs.
  Source: url:https://dvc.org/doc/user-guide/glossary (Run cache)
  > Run cache: A log of stages that have been run in the project. It's comprised of dvc.lock file backups, identified as combinations of dependencies, commands, and outputs that correspond to each other.

- **c34** dvc exp run and dvc repro populate and reutilize a log of the stages that have been run in the project; it lives in the runs/ directory inside the cache (or remote storage).
  Source: url:https://dvc.org/doc/user-guide/project-structure/internal-files (Run cache)
  > dvc exp run and dvc repro by default populate and reutilize a log of stages that have been run in the project.

- **c35** Metrics are key/value pairs in structured files (JSON, TOML 1.0, YAML 1.2) mapping a metric name to a numeric value; declaring metrics files in dvc.yaml is what lets DVC compare them among experiments.
  Source: url:https://dvc.org/doc/user-guide/glossary (Metrics)
  > Metrics: Key/value pairs saved in structured files (JSON, TOML 1.0, or YAML 1.2) that map a metric name (AUC, ROC, etc.) to a numeric value.

- **c36** A metric in DVC is a project-specific floating-point, integer or string value (e.g. AUC, ROC, false positives).
  Source: url:https://dvc.org/doc/command-reference/metrics (Description)
  > These metrics are project-specific floating-point, integer, or string values e.g. AUC, ROC, false positives, etc.

- **c37** DVC ascribes no meaning to those numbers: they are produced by the project's training/evaluation code and used to compare and pick experiments.
  Source: url:https://dvc.org/doc/command-reference/metrics (Description)
  > DVC itself does not ascribe any specific meaning for these numbers. Usually they are produced by the model training or model evaluation code and serve as a way to compare and pick the best performing experiment.

- **c38** dvc metrics show finds and prints all metrics in the project by examining all of its dvc.yaml files (by default).
  Source: url:https://dvc.org/doc/command-reference/metrics/show (Description)
  > Finds and prints all metrics in the project project by examining all of its dvc.yaml files (by default).

- **c39** By default the metrics subcommands use the metrics files specified in dvc.yaml, including any added automatically by DVCLive.
  Source: url:https://dvc.org/doc/command-reference/metrics (Description)
  > By default they use the ones specified in dvc.yaml (if any), including those added automatically by DVCLive.

- **c40** Metric values can be read across versions: dvc metrics show can print metrics file contents in all Git branches as well as the workspace.
  Source: url:https://dvc.org/doc/command-reference/metrics/show (Options -a, --all-branches)
  > print metrics file contents in all Git branches, as well as in the workspace.

- **c41** A metrics or plots file may be a stage output, or declared in dvc.yaml with cache: false, since these files are often small enough to be stored in Git.
  Source: url:https://dvc.org/doc/user-guide/pipelines/defining-pipelines (Outputs)
  > DVC can also track metrics and plots files, which can optionally be added as stage outputs, or even added with cache: false in dvc.yaml since they are often small enough to store in Git.

- **c42** A .dvc file is a small human-readable metadata file created by dvc add/import as a placeholder for the tracked data, versioned with Git, containing what is needed to track the target over time.
  Source: url:https://dvc.org/doc/user-guide/project-structure/dvc-files (.dvc Files)
  > Files ending with the.dvc extension ("dot DVC file") are created by these commands as data placeholders that can be versioned with Git. They contain the information needed to track the target data over time.

- **c43** The .dvc file's payload is an outs entry: the artifact's path plus a content hash (and optionally size/nfiles, remote, etc.).
  Source: url:https://dvc.org/doc/start/data-management/data-versioning (Tracking data — peek under the hood)
  > outs: - md5: 22a1a2931c8370d3aeedd7183606fd7f path: data.xml

- **c44** The small human-readable .dvc metadata file is what stands in for the original data for the purpose of Git tracking.
  Source: url:https://dvc.org/doc/start/data-management/data-versioning (Tracking data)
  > This small, human-readable metadata file acts as a placeholder for the original data for the purpose of Git tracking.

- **c45** An outside reader locates a tracked artifact by reading the project's remote configuration plus the outs field of the dvc.yaml or .dvc file where the path is found — dvc.api.get_url returns that storage URL.
  Source: url:https://dvc.org/doc/api-reference/get_url (Description)
  > The URL is formed by reading the project's remote configuration and the dvc.yaml or.dvc file where the given path is found (outs field).

- **c46** dvc.api.get_url does not check that the file or directory actually exists in the remote storage.
  Source: url:https://dvc.org/doc/api-reference/get_url (Description)
  > This function does not check for the actual existence of the file or directory in the remote storage.

- **c47** Only the DVC files needed to download or reproduce data are pushed to Git; no data tracked by DVC belongs in the Git repository.
  Source: url:https://dvc.org/doc/user-guide/project-structure/internal-files (Internal Directories and Files)
  > No data tracked by DVC should ever be pushed to the Git repository, only the DVC files DVC files that are needed to download or reproduce that data.

- **c48** An artifact is a model or other file or directory whose structured metadata (name, type, description, labels) may be stored in dvc.yaml files; the model registry uses that metadata.
  Source: url:https://dvc.org/doc/user-guide/glossary (Artifact)
  > Artifact: An artifact is a model or other file or directory for which structured metadata (name, type, description, and one or more labels) may be stored in dvc.yaml files. Model artifact metadata is used in the model registry.

- **c49** The artifacts section of dvc.yaml declares structured metadata for each artifact ID; only path is mandatory.
  Source: url:https://dvc.org/doc/user-guide/project-structure/dvcyaml-files (Artifacts)
  > For every artifact ID you can specify the following elements (only path is mandatory):

- **c50** The DVC cache is content-addressable (by default .dvc/cache), a layer of indirection between code and data.
  Source: url:https://dvc.org/doc/user-guide/project-structure/internal-files (Structure of the cache directory)
  > The DVC cache is a content-addressable storage (by default in.dvc/cache), which adds a layer of indirection between code and data.
