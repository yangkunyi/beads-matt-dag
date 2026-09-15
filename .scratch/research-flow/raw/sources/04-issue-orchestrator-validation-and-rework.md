SOURCE-URL: https://github.com/issue-orchestrator/issue-orchestrator/blob/49f596b8f92a98d842c26334960e909a5bce56d9/docs/architecture/validation.md
FETCHED: 2026-09-14 (local shallow clone, research agent 04)
CLONE: /tmp/steal-research/issue-orchestrator
CLONE-SHA: 49f596b8f92a98d842c26334960e909a5bce56d9

# Files: docs/architecture/validation.md (complete); docs/user/configuration_reference.md excerpt (review.max_rework_cycles, 80-100); src/issue_orchestrator/control/validation.py head 1-100 (the validation record store).

# Validation System

Validation is a **local lifecycle gate**, not a CI system.

## Model

- Run one quick local command while the coding/review loop is active
- Run one deeper publish command before push/publish
- Cache passing results by worktree + commit SHA + command
- Reuse passing publish records across pre-publish and pre-push hooks
- Observe GitHub CI rather than reproducing it locally

## Configuration (YAML)

```yaml
validation:
  quick:
    # Fast feedback for coding-done and local coder/reviewer exchanges.
    # Put cheap repo policy scans here too, for example rejecting new
    # test skips such as assumeTrue/assumeFalse/@Disabled/@Ignore.
    cmd: "make validate-quick"
    timeout_seconds: 300
  publish:
    # Authoritative local PR/pre-push gate.
    cmd: "make validate-pr-raw"
    timeout_seconds: 1800
    dirty_check: tracked

execution:
  isolation:
    mode: "standard"   # or "hardened"
```

`validation.quick.cmd` should be fast enough to run whenever an agent reports
`coding-done completed` and between local coder/reviewer rounds. It should catch
cheap correctness and policy failures early while the coding agent can still
respond immediately.

`validation.publish.cmd` should be the same command your repository treats as
its authoritative pre-push / pre-publish gate.

Keep quick and publish commands configured separately so active review loops can
stay responsive while push/publish actions still run the deeper repository gate.

If the user-facing gate command itself calls the cache-aware pre-push wrapper,
configure `validation.publish.cmd` to the underlying raw command instead. For
example, this repository exposes `make validate-pr` as the cache-aware entry
point and configures `validation.publish.cmd: make validate-pr-raw`, a public
non-recursive target that runs the same required suite without re-entering
`scripts/verify-pr.sh`, so the wrapper can seed and reuse the cache without
re-entering itself.

The old single-command shape (`validation.cmd`,
`validation.timeout_seconds`, and `validation.pre_push_dirty_check`) is rejected
at config load time. That keeps upgrades visible instead of silently disabling
both lifecycle gates.

When you install repo guardrails with `issue-orchestrator setup-guardrails`, the
generated `scripts/verify-pr.sh` captures the selected config filename. If you
switch the repo to a different `.issue-orchestrator/config/modes/<mode>/*.yaml`, rerun
`setup-guardrails` so pre-push validation and cache lookups continue to use the
same config.

The canonical **pre-publish** gate is the worktree's effective `pre-push` hook:

- project hook first (`make validate-pr`, `scripts/verify-pr.sh`, etc.)
- orchestrator hook second (Agent-Status trailer + dirty-tree policy)

The orchestrator runs that hook chain before the authenticated push so
push-time policy failures are discovered before publish. The real push still
keeps hooks enabled; when the commit and configured command match, the later
hook pass reuses the cached publish validation record instead of rerunning the
command. CI still mirrors the repo's required PR coverage in a clean
environment.

## Runtime Artifact Ignores

Dirty-tree guards ignore orchestrator-managed runtime files so agents are not
blocked by session state, local tool caches, or Claude Code scheduling locks.
Built-in ignores cover `.issue-orchestrator/` runtime state and
`.claude/scheduled_tasks.lock`.

Target repositories can add repo-local runtime artifacts in
`.issue-orchestrator/runtime-ignore`. See
[`docs/user/configuration.md`](../user/configuration.md#ignore-repo-local-runtime-artifacts)
for the supported format and operator guidance.

## Record Format

Location: `.issue-orchestrator/validation/<suite>/<HEAD_SHA>.json`

Record fields:
- `schema_version`
- `suite`
- `head_sha`
- `passed` + `exit_code`
- `command`
- `started_at` / `ended_at`
- `stdout`/`stderr` paths (optional but recommended)

===== configuration_reference.md 80-100 =====

| `milestones.order` | string | `` | Explicit ordered list of milestone titles. Does not filter; unlisted milestones are appended using the milestone sort strategy. | `M1, M2` | Use to override the default sort order without filtering. |

## Review

| Field | Type | Default | Description | Examples | Notes |
|-------|------|---------|-------------|----------|-------|
| `review.enabled` | boolean | `False` | Enable automated code review workflow | `true`, `false` | When enabled, a reviewer agent validates work agent PRs. |
| `review.default` | string (optional) | `None` | Agent label for code reviews (e.g., agent:reviewer) | `agent:reviewer` | Must match a label defined under agents. |
| `review.max_rework_cycles` | integer | `5` | Max times to re-queue work agent before escalating | `0`, `2`, `5` | Set to 0 to disable rework cycles (immediate escalation). |
| `review.internal.enabled` | boolean | `False` | Require each coder turn to iterate with an internally spawned reviewer before reporting successful completion | `true`, `false` | This lightweight coder-owned loop runs before the independent review exchange and does not replace it. |
| `review.internal.max_rounds` | integer | `5` | Maximum internal reviewer verdicts before the coder must report blocked | `3`, `5`, `10` | Reaching the limit never permits successful completion; the coder reports the turn as blocked. |
| `review.internal.instructions` | string | `.io/internal-review.md` | Repo-relative coder instructions for the internal review loop | `.io/internal-review.md` | The file is appended to coder prompts when internal review is enabled. Doctor verifies that it exists. |
| `review.max_consecutive_publish_failures` | integer | `3` | Escalate to needs-human after this many consecutive push/PR creation failures | `2`, `3`, `5` | After N consecutive publish failures for the same issue, escalate to needs-human instead of publish-failed. |
| `review.keep_current_approach_label` | string | `reviewer-keep-current-approach` | Label that tells reviewer to avoid alternative approaches | `reviewer-keep-current-approach` | Applied to issues where stability is preferred over refactors. |
| `review.retrospective.enabled` | boolean | `False` | Enable review-first audits for existing implementations | `true`, `false` | When enabled, issues carrying the retrospective trigger label are reviewed before any coder rework is launched. |
| `review.retrospective.trigger_label` | string | `retrospective-review` | Issue label that queues review of an existing implementation | `retrospective-review`, `lack-of-review-redo` | This label is the source of truth for review-first reruns. It may be applied to open or closed issues. |
| `review.retrospective.reviewed_label` | string | `retrospective-reviewed` | Issue label added after retrospective review approval | `retrospective-reviewed` | Added to the issue when the reviewer approves the existing implementation. |
| `review.retrospective.changes_requested_label` | string | `retrospective-changes-requested` | Issue label added when retrospective review asks for coder rework | `retrospective-changes-requested` | Added before the issue enters the normal coder rework and PR review lifecycle. |
| `review.run_audit.min_runtime_minutes` | integer | `20` | Automatically capture a run audit when runtime meets or exceeds this threshold (0 = disable) | `0`, `20`, `60` | Long runs get a persisted audit automatically; set to 0 to keep audits label-driven only. |
| `review.run_audit.on_timeout` | boolean | `True` | Automatically capture a run audit when a session times out | `true`, `false` | Keep enabled to preserve diagnostics for timed-out sessions even when they did not exceed the slow-run threshold cleanly. |
| `review.nits.default_policy` | string | `surface` | Default policy for reviewer nits before PR creation | `surface`, `address`, `ignore` | Nits are non-blocking review items. surface records and shows them without rework; address includes them in the normal coder rework loop before PR creation; ignore records them only in review artifacts. |

===== validation.py 1-110 =====

"""Validation module - record format, storage, runner, and cache.

This module handles validation gates for the orchestrator:
- ValidationRecord: Dataclass for validation results (imported from ports)
- ValidationRecordStore: Read/write validation records to disk
- ValidationRunner: Execute validation commands
- ValidationCache: Cache lookup for validation results

Storage location: .issue-orchestrator/validation/<suite>/<HEAD_SHA>.json
"""

import json
import logging
import time
from dataclasses import dataclass, replace
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from ..domain.attempt import Attempt, AttemptKey
from ..infra import validation_timings as timings
from ..infra.atomic_json import atomic_write_json
from ..infra.emit import emit_event
from ..ports import CommandRunner, CommandResult, WorkingCopy
from ..ports.attempt_store import AttemptStore
from ..ports.session_output import ValidationRecord
from .isolation import build_runtime_tool_env
from .validation_record_store import ValidationRecordStore as ValidationRecordStore

logger = logging.getLogger(__name__)

# Schema version for validation records
VALIDATION_SCHEMA_VERSION = 1


def _normalize_head_sha(head_sha: str | None) -> str | None:
    if not head_sha:
        return None
    normalized = head_sha.strip().lower()
    return normalized or None


def _is_session_run_dir(path: Path, worktree: Path) -> bool:
    """Return True when path is under .issue-orchestrator/sessions/ in this worktree."""
    try:
        rel = path.resolve().relative_to(worktree.resolve())
    except ValueError:
        return False
    parts = rel.parts
    return len(parts) >= 3 and parts[:2] == (".issue-orchestrator", "sessions")


@dataclass
class ValidationResult:
    """Result of running a validation command."""

    exit_code: int
    passed: bool
    timed_out: bool
    stdout: str
    stderr: str
    started_at: datetime
    ended_at: datetime
    command: str


class ValidationRunner:
    """Runs validation commands and produces records."""

    def __init__(self, store: ValidationRecordStore, command_runner: CommandRunner):
        """Initialize runner with a record store.

        Args:
            store: Store for writing validation records
            command_runner: Adapter for running commands
        """
        self.store = store
        self.command_runner = command_runner

    def run(
        self,
        suite: str,
        head_sha: str,
        command: str,
        timeout_seconds: int = 1800,
        cwd: Optional[Path] = None,
        session_output_dir: Optional[Path] = None,
    ) -> ValidationRecord:
        """Run a validation command and return a record.

        Args:
            suite: The validation suite name (e.g., "publish_gate")
            head_sha: The HEAD SHA to record
            command: The command to run
            timeout_seconds: Timeout in seconds
            cwd: Working directory (defaults to store's worktree)
            session_output_dir: Directory to write stdout/stderr (required)

        Returns:
            ValidationRecord with results

        Raises:
            ValueError: If session_output_dir is not provided
        """
        if session_output_dir is None:
            raise ValueError("session_output_dir is required")
        cwd = cwd or self.store.worktree
        started_at = datetime.now(timezone.utc)

        logger.info("Running validation suite '%s': %s", suite, command)
