# 07 — 运维面：服务、配置、日志、重启

> **ARCHIVED 2026-09-14** — 本 effort 判定失败，已归档（不再维护）。原因与复活方式见 [`../RETRO.md`](../RETRO.md)。

Status: RUNNING
Blocked by: 02(done)

## Goal

桥和它的常驻 pi 子进程能自己活着，坏了能看出来，配置改完不用读代码。

## Shape

- systemd --user：`feishu-pi-bridge.service`（已有）+ 可能的 `feishu-run-watcher.service`；`Restart=always`。
- 配置：`~/.local/share/feishu-pi-bridge/config.json` —— profile/appId、白名单、默认项目、节流间隔、卡片开关。
- 日志：`bridge.log` JSONL（已有）；补 `--check` 覆盖新依赖（RPC 可启动、回调订阅、archon CLI、profile 就绪）。
- 重启语义：桥重启后从 state 恢复绑定 + 重启 pi RPC 进程 + 继续跟踪 run。
- 关闭语义：SIGTERM → 关掉子进程（先 SIGTERM 后 SIGKILL）、写一条 `shutdown`。

## Acceptance

- `systemctl --user restart feishu-pi-bridge` 后，同一会话再发消息仍落在同一个 pi session（上下文没丢）。
- `bun bridge.ts --check` 全 PASS。
- 杀掉一个 pi RPC 子进程，桥自动拉起且 session 可继续。

## Comments

- 2026-09-14 一个真实 bug（已修）：`/status` 在没有绑定的会话里用桥自身目录当 cwd 调 archon CLI，
  而 archon **拒绝在非 git 仓库里跑** → 永远回"0 个在跑的 run"。现在回退到"被跟踪 run 的仓库 → 任一已注册项目"。
  修完 `--simulate /status` 能正确列出 `4f12ad1e beads-dag-drain running`。

## Comments

- 2026-09-14 已做：
  - **SIGTERM 语义**：`shutdown` 会把所有常驻 pi 子进程一起停掉（否则它们变孤儿、占着 session 文件）；
    日志带上 `rpcProcesses` 数量。
  - **重启后的提问卡**：启动时扫 `state.ui` 里未回答的，改成「♻️ 已作废（桥重启了…）」并标记，不留死按钮。
  - **卡片更新**：统一走 `updateCardMessage` = `im messages patch`（不吃 token）→ 失败才回退延迟更新 token。
  - `--check` 仍未升级（新依赖：profile、slash 命令、卡片回调、`--approve`）。
  - watcher 的跟踪表在重启后从 state.json 恢复 ✓（本轮实测：drain run 结束后自动 unwatch，tracking 归零）。
