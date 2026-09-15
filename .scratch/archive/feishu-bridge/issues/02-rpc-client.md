# 02 — pi RPC 常驻客户端

> **ARCHIVED 2026-09-14** — 本 effort 判定失败，已归档（不再维护）。原因与复活方式见 [`../RETRO.md`](../RETRO.md)。

Status: RUNNING
Blocked by: none

## Goal

把 `piAsk`（每消息 `pi -p` 一次性进程）换成一个常驻 `pi --mode rpc` 子进程，**每个绑定项目一个**。

## Why

`-p` 模式买不到：流式进度、排队/打断（`steer`/`abort`）、结构化提问（`extension_ui_request`）、
会话成本与上下文占用（`get_session_stats`）、增量镜像（`get_entries`）。grill 这种多轮交互在手机上的体验全靠这些。

## Shape

- `PiRpc` 类：`spawn(["pi","--mode","rpc","--session-id",sid,"--name",name], {cwd: projectDir})`；
  严格 JSONL（只按 `\n` 切，容忍结尾 `\r`）；命令带 `id` 关联响应。
- 事件分发：`message_update.text_delta` → 进度缓冲；`tool_execution_start` → "正在 <tool>"；
  `agent_settled` → 一轮结束（回复收尾）；`compaction_start/end` → 通知一次；`auto_retry_*` → 通知一次；
  `extension_ui_request` → 交给 ticket 06。
- 输入：空闲时 `prompt`，忙时 `steer`（默认）——用户"改主意/别干了"不用等它跑完。
- 生命周期：进程退出 → 指数退避重启并 `switch_session` 回原 session 文件；被 systemd 杀的桥重启后要能恢复绑定。
- 一个项目一个进程：`Map<projectDir, PiRpc>`；绑定切换（`/use`）只是选不同的进程。

## Acceptance

- 同一条消息在 `-p` 与 RPC 两种模式下得到同样的回答，且 RPC 模式下 `get_state.isStreaming` 能正确反映忙闲。
- 连发两条：第二条不会因为第一条在跑而被拒（走 `steer`，在 `queue_update` 里可见）。
- `abort` 能在 2 秒内停下正在执行的工具。

## Notes

- 文档：`.../pi-coding-agent/docs/rpc.md`；类型参考 `src/modes/rpc/rpc-types.ts`。
- 另一条路是直接 `import { AgentSession }` 在桥进程内跑；先不选，保留崩溃隔离。

## Comments

- 2026-09-14 实现 `~/.local/share/feishu-pi-bridge/pi-rpc.ts`（`PiRpc` 类）+ 接进 `bridge.ts`。
  `bun pi-rpc.ts --selftest /tmp` 实测：首次 delta 6.6s、settle 6.8s、16 个 text_delta；
  `get_state` 拿到 `sessionId/isStreaming/model`；`get_session_stats` 拿到 messages/tokens/cost/contextUsage；
  `abort` 在 12–14ms 内返回；忙时第二条消息走 `steer` 且 `queue_update` 事件出现（2 次）。
- 桥里 `piAsk` 现在是"常驻进程 + turn 状态机"：一个项目一个 `PiRpc`，事件驱动进度（首个工具调用发一条
  `🔧 正在 <tool>`，8 秒节流），`agent_settled` 收尾后用累积的 text_delta（或 `get_last_assistant_text`）回飞书。
- `/new` 必须 `dropRpc()` 重启子进程——常驻进程被 spawn 时的 session id 钉住。
- `extension_ui_request` 的对话框方法（select/confirm/input/editor）**只上报不代答**（auto-answer 一个 confirm
  等于替用户签字），真正接线在 ticket 06；现在若出现对话框会回一条"桥还不能代答"。
- 待补：`-p` 与 RPC 的等价性对照测试（同一条消息两边比回答）——目前只跑了 RPC 侧。

- 2026-09-14 桥已全面切到 RPC 路径（`-p` 分支已死），并通过 `--simulate` 跑通真实往返：
  进度条（`🔧 正在 bash…`）+ 最终回答。`--simulate "<chatKey>" "<text>"` 是新的回归入口（跑完整管线、不碰飞书）。
- 技能调用链实测：`/skill:<name>` 由 pi 展开，桥必须把不认识的 `/xxx` 透传（已实现）。
- 仍欠：`-p` vs RPC 等价性对照（低优先级，RPC 已是唯一路径）。
