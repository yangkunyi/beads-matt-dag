# 04 — 批准/打回卡片（按钮 + 输入框）

> **ARCHIVED 2026-09-14** — 本 effort 判定失败，已归档（不再维护）。原因与复活方式见 [`../RETRO.md`](../RETRO.md)。

Status: RUNNING
Blocked by: 01(enabled), 02

## Goal

run 需要人决策时，飞书收到一张卡片：显示 run/workflow/门的问题原文，带 form 输入框 + 「批准」「打回」按钮。

## Shape

- 卡片：Card 2.0，`header` 用状态色（暂停=橙/失败=红/完成=绿），正文 markdown 放门的问题与 run id；
  `form` 内放 `input`（理由/原话）+ 两个 `form_action_type: "submit"` 按钮。
- 回调：`card.action.trigger`（`action_tag: "button"` 且 `form_value` 非空即表单提交）→ 取 `form_value[name]` 的文本，
  作为**用户原话**执行 `archon --cwd <repo> workflow approve <id> "<原话>"` 或 `reject <id> "<原因>"`；
  再用 `token`（30 分钟/2 次）把卡片改成"已决策 + 谁 + 何时"。
- 无回调能力的降级：卡片文案里写"回复 `approve <id> 原话`"，由文本通道处理。
- 发卡前按 lark-im 的卡片工作流读组件文档并过 P0–P7 自检。

## Acceptance

- 手机点「批准」并把输入框里的话带上 → run 继续，且 gate 的 feedback 是用户原话（不是摘要）。
- 卡片被更新成终态，第二次点击不会重复执行（token 用尽或幂等检查）。
- 未订阅回调时，文本降级路径可用。

## Notes

- 一次决策只发一次命令；重复点击用 `event_id`/`message_id` 去重。
- 门的问题原文来自 `archon workflow get <id> --json` 的 `metadata.approval`，不是 assistant 转录。

## Comments

- 2026-09-14 01 的阻塞已解除：新应用 `cli_aa2d7e0573789bd9`（profile `archon-bridge`）已建，
  `card.action.trigger` 订阅已生效（`[event] ready`），桥已带 `--profile archon-bridge` 运行。
- 真实回调已验证（三张卡，两次真实点击）：
  - 事件字段确认：`action_tag=button`、`action_name=approve|reject`、`form_value` 是 JSON 字符串、
    `operator_id`（新 app 的 open_id）、`token`、`message_id`、`chat_id`。
  - 输入框原话回传成功：`note="先补测试再继续"`，没有经过任何总结。
  - 卡片延迟更新成功（`{"ok": true, "data": {}}`），卡片原地变成 `<card title="已打回">`。
  - 幂等键 `message_id:operator:decision` 已实现（本次没有触发第二次点击，逻辑未实测）。
- 两个必须记住的坑（都写进了日志路径/注释）：
  1. lark-cli 的成功信封是 `{"ok": true}`，**不是** `{"code": 0}`；误判会把成功当失败并对用户说"卡片没更新"。
  2. 同一个 app + 同一个 event key，**本地 bus 只允许一个 consumer**；多开会直接失败退出
     （`consumer_died_early`），表现是永远收不到回调。
- 绑真 run 的路径（`state.cards[message_id] → {runId,cwd}` → `archon workflow approve/reject --detach`）
  代码已就绪，等 ticket 05 在真暂停 run 上发卡时验证。
- 仍欠：卡片 payload 里 `card_content`（userDSL）目前不用——判定卡是自建而不是解析原卡。
