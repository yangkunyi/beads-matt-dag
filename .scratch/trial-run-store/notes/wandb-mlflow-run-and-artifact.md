# What do W&B and MLflow each record a run and an artifact as, and which of it is visible through their own interfaces?

## Claims

- **c1** W&B's unit is the run: one unit of computation, treated as the atomic element of a project.
  Source: url:https://docs.wandb.ai/guides/runs (§What are runs? (first paragraph))
  > A run is a single unit of computation logged by W&B. You can think of a W&B Run as an atomic element of your whole project.

- **c2** A W&B run is addressed by id, name, configuration and state, and those are the fields the SDK hands back.
  Source: url:https://docs.wandb.ai/guides/runs (§What are runs? (paragraph after the init example))
  > wandb.init() returns a wandb.Run object that contains properties of the run, such as its ID, name, configuration, and state.

- **c3** W&B separates the metric series from the run's summary: final or aggregate values live somewhere else than the logged history.
  Source: url:https://docs.wandb.ai/guides/runs (§Run summary)
  > Unlike metrics that change over time, summary values typically represent a final or aggregate result.

- **c4** The W&B object that carries a version is the artifact, and it is defined by its relation to the runs that consumed or produced it.
  Source: url:https://docs.wandb.ai/guides/artifacts (intro)
  > Use W&B Artifacts to track and version data as the inputs and outputs of your W&B Runs

- **c5** An artifact's type is a label the logger chooses, and it defaults to unspecified — no taxonomy is imposed by the vendor.
  Source: url:https://docs.wandb.ai/guides/artifacts (§Create an artifact)
  > If you do not specify a type, it defaults to unspecified.

- **c6** MLflow's unit is also a run, and it means one execution of the training code.
  Source: url:https://mlflow.org/docs/latest/ml/tracking/ (§Concepts → Runs)
  > MLflow Tracking is organized around the concept of runs, which are executions of some piece of data science code, for example, a single python train.py execution.

- **c7** In MLflow one run holds both the metadata and the artifacts, so a result is reached through the run that made it.
  Source: url:https://mlflow.org/docs/latest/ml/tracking/ (§Concepts → Runs)
  > Each run records metadata (various information about your run such as metrics, parameters, start and end times) and artifacts (output files from the run such as model weights, images, etc).
  ⚠ challenged by c9

- **c8** The container above a run in MLflow is the experiment, and it holds runs and logged models together.
  Source: url:https://mlflow.org/docs/latest/ml/tracking/ (§Concepts → Experiments)
  > An experiment groups together runs and models for a specific task.

- **c9** MLflow 3 gave logged models an identity of their own: addressed by model id, no longer only through the run that produced them.
  Source: url:https://mlflow.org/docs/latest/ml/tracking/ (§Model URIs in MLflow 3)
  > MLflow 3 introduces a new model URI format that uses model IDs instead of run IDs, providing more direct model referencing
  Challenges c7.

- **c10** MLflow's artifact store is per-run file storage: an artifact there is a file, not an object with versions of its own.
  Source: url:https://mlflow.org/docs/latest/ml/tracking/ (§Components → Artifact Store)
  > Artifact store persists (typically large) artifacts for each run, such as model weights (e.g. a pickled scikit-learn model), images (e.g. PNGs), model and data files (e.g. Parquet file).

- **c11** Versions in MLflow come from the model registry, which is where a model name acquires a version number.
  Source: url:https://mlflow.org/docs/latest/ml/tracking/ (§Components → Artifact Store)
  > you can also refer to the model through a model URI of format: models:/<model-name>/<model-version>
