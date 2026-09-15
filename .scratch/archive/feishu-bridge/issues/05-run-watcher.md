# 05 — archon run watcher

> **ARCHIVED 2026-09-14** — 本 effort 判定失败，已归档（不再维护）。原因与复活方式见 [`../RETRO.md`](../RETRO.md)。

Status: RUNNING
Blocked by: none

## Goal

一个常驻 watcher：pi（或人）起了 run 之后，run 的**终态/暂停/失败**会主动推到飞书，不需要谁去轮询。

## Shape

- 登记：桥在起 run 时把 `{runId, projectCwd, chatKey, messageId}` 写进 state（`archon workflow run ... --detach` 的输出里拿 run id）。
- 轮询（10–20 秒）：`archon --cwd <repo> workflow get <id> --json`（**必须在 git 仓库里跑**）；
  状态变化 → 推消息/卡片；终态后停止跟踪。
- 事件优于轮询：`archon serve` 的 `/api/stream/...` 或 `remote_agent_workflow_events` 表可做推送源，作为后续优化。
- 已有孤儿 run 检测：`archon workflow runs --open`。
- 与 drain 的关系：`beads-dag-drain` 没有门，只会跑到终态；它的"需要人"只有失败/锁冲突，卡片要给"重跑/放弃"。

## Acceptance

- 起一个 run，watcher 在它结束时 30 秒内推出终态（含 status/outcome/artifacts 路径）。
- 桥重启后仍能继续跟踪已登记的 run。
- 同一个 run 不会重复推送终态。

## Notes

- `get --json` 返回的是 run 对象本身（`id`/`status`/`outcome`/`working_path`/`leave_behind`），不是 `{run:{...}}`。
- run id 全局可寻址，但命令需要在仓库里执行 → 每条跟踪记录都要带 `cwd`。

## Comments

- 2026-09-14 实现进 `bridge.ts`：`state.runs` 跟踪表 + 15 秒轮询（`watchIntervalMs`）+ 状态变化才推送，
  暂停 → 直接发**绑定 run 的批准卡片**（复用 ticket 04 的 `sendApprovalCard`），终态 → 推一条总结并自动 unwatch。
- 通道命令：`/watch <run-id|last>`、`/watching`、`/unwatch <id>`；CLI：`--watch <runId> <cwd> <chatId>`、
  `--poll-once`（确定性单次轮询，便于测试）。
- 实测：注册一个已 cancelled 的 run（`2f34e30b-b90c-4e6f-ad3d-d124d59c77a5`）→ `--poll-once` →
  `before "2f34e30b:unknown" / after ""`，飞书收到 `chat_send code:0`（72 字符），跟踪表清空 ✓。
- 已把**在跑的** run `4f12ad1e`（→ /data3/yky/endo_label）挂进服务：它结束时会推给你（这也是首个真终态推送）。
- 自动发现：每轮 pi 对话结束后按 `working_path` + `started_at` 扫最近 20 个 run 并登记（`discoverRuns`）——
  代码就位，**尚未**在真 drain 上端到端验证。
- 仍欠：`paused` 分支只在合成数据上走过（真门要等一个带门的 run）。
