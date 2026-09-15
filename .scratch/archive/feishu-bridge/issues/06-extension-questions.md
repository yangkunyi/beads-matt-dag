# 06 — extension_ui_request → 飞书卡片（结构化提问）

> **ARCHIVED 2026-09-14** — 本 effort 判定失败，已归档（不再维护）。原因与复活方式见 [`../RETRO.md`](../RETRO.md)。

Status: RUNNING
Blocked by: 02(done), 04(done)

## Goal

pi（或扩展）通过 `ctx.ui.select/confirm/input/editor` 问问题时，问题出现在飞书，答案回填给 pi。

## Shape

- `extension_ui_request`（带 `id`）→ 发卡片：`select` → 按钮组/下拉；`confirm` → 是/否两个按钮；
  `input`/`editor` → form + 输入框 + 提交按钮。
- 点击 → 回 `{"type":"extension_ui_response","id":"<id>", "value"|"confirmed"|"cancelled": ...}` 到 RPC stdin。
- 超时：卡片 `timeout` 字段存在时按它的语义处理（agent 侧会自动用默认值解决）——但卡片也要写明超时后会发生什么。
- 幂等：同一 `id` 的答案只回一次；重复点击用事件去重。

## Acceptance

- 一个扩展调用 `ctx.ui.confirm` → 飞书卡片出现 → 点"是" → 扩展收到 `true`。
- 未订阅回调时，能否降级为"回复 1/2"的文本通道？（若不行，明确记录该限制）

## Notes

- 这是把 grill 搬到手机的正解：提问不必走 run 的门，而是走 pi 自己的 UI 协议。

## Comments

- 2026-09-14 实现。协议依据（`docs/rpc.md`）：对话框方法 `select/confirm/input/editor` 各带唯一 `id`；
  回答是 stdin 上的一条 `extension_ui_response`：`{value}` / `{confirmed}` / `{cancelled}`；
  带 `timeout` 的问题由 **agent 侧**自动用默认值解决（客户端不用管超时）。
- 卡片映射：`select` → 每个选项一个按钮（`behaviors:[{type:"callback", value:{ui:"<选项>"}}]`，超过 6 个只显示前 6 并说明）；
  `confirm` → 是/否两个按钮；`input`/`editor` → `form`（input + submit）+ 表单外的"取消"按钮。
  header 用方法对应的图标/配色（vote/approval/file-form），副标题写项目名，带 timeout 的会写"多少秒后用默认值"。
- 状态机：`state.ui[cardMessageId] = {requestId, method, cwd, chatId, options?, timeoutMs?}`；
  点击 → 反查 → `rpcByCwd.get(cwd).answerExtensionUi(requestId, payload)` → 卡片原地变成 `✅ … （已回填给 pi）`。
  超时 → 定时器把卡片改成 `⏰ 超时了，pi 用默认值继续跑`。
- 探针（测试夹具）：`~/.pi/agent/extensions/feishu-ui-probe.ts`，**用 `process.cwd()` 限定只在 `/tmp/pi-uiprobe` 生效**
  （项目内 `.pi/extensions/` 需要项目被信任才加载，所以放全局；用完应删除）。
  裸 RPC 验证通过：`DIALOG {"method":"select","options":["A 选项","B 选项","C 选项"],"timeout":120000}`。
- 仍欠：真飞书点击闭环（需要在 `/tmp/pi-uiprobe` 里发一条消息，让**服务**持有的 pi 进程问问题）。

- 2026-09-14 端到端验证（`--ui-selftest`，真发卡片 + 合成真实形状的点击事件）：
  select 卡 → 点击 → `card_patch ok:true` → `ui_card_answered` → pi 继续问 confirm 卡 → 再点击 →
  扩展自己的 `ui_notify: "probe answered: B 选项 / true"` —— **两个答案都真的落进了 pi 进程**。
- **重大发现（pi 侧行为，决定了卡片能不能用）**：`session_start` 阶段的对话框挂着时，pi 的 RPC **stdin 读取器还没启动**
  （实测：此时 `get_state` 也超时；回答写进去同样读不到）→ **启动期的提问远程无法作答，只能等超时**。
  因此：桥给 pi 传 `--approve`（配置 `trustProject`，默认真），从根上避免"新项目信任询问"这类启动期提问；
  并且 `PiRpc.ready`（收到过任意命令响应）为假时，桥不再发可点的按钮，而是发一张
  「⚠️ 启动期提问（答不了）」的说明卡，而不是留一个假按钮。
- 踩到的两个次序/形状坑（都已修，值得记）：
  1. `behaviors:[{type:"callback"}]` 的按钮飞书**不上报** `action_name`，值只在 `action_value`（JSON 字符串）里；
     而 form 提交的按钮上报 `action_name`。桥一开始用 `name` 判定，导致对话框按钮全被丢成 `card_action_ignored`。
  2. 处理顺序必须是 **先认"这是不是提问卡"**，再判"是不是批准/打回"，否则提问卡会被决策判定提前 return 掉。
