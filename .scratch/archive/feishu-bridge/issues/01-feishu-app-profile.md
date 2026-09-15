# 01 — 独立飞书应用（archon-bridge profile）

> **ARCHIVED 2026-09-14** — 本 effort 判定失败，已归档（不再维护）。原因与复活方式见 [`../RETRO.md`](../RETRO.md)。

Status: READY
Blocked by: none

## Goal

桥用的飞书机器人是**独立应用**，不复用 SIRIUS reminder 的 `cli_aa2bb91394781bd8`；lark-cli 侧以 profile
`archon-bridge` 存在，所有桥的调用显式 `--profile archon-bridge`。

## Why

现在桥和实验室提醒机器人共用一个应用：事件订阅、回调配置、scope、限流、误回消息的风险都互相牵连。

## Steps

1. `lark-cli config init --new --name archon-bridge` —— 已经起了（等待人类在浏览器完成）。
2. 控制台内开启：机器人能力；事件 `im.message.receive_v1`；回调 `card.action.trigger`。
3. bot scope：`im:message.p2p_msg:readonly`、`im:message:readonly`（card_content 自动抓取用）、发送消息所需 scope；
   `card.action.trigger` 的回调订阅必须点过，否则按钮无响应。
4. 授权：`lark-cli auth login --profile archon-bridge`（bot 身份就够；user 身份用于发消息给本人时可选）。
5. 验收：`lark-cli auth status --profile archon-bridge` bot ready；`lark-cli event consume card.action.trigger
   --as bot --profile archon-bridge --max-events 1 --timeout 5s` **不再**报 `requires callbacks not subscribed`。

## Acceptance

- `lark-cli whoami --profile archon-bridge` 显示新 appId 与 bot 身份。
- 给桥发一条私聊消息，桥的日志出现 `message_in`；点一张测试卡片，`card.action.trigger` 事件能在 consume 里看到。

## Notes

- 应用名建议 `archon-bridge`，头像随意；别勾任何人类可见的菜单/快捷方式。
- 旧应用（SIRIUS）里的 `sirius-lark.service` 保持不动。
