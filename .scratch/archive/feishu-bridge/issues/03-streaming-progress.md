# 03 — 把进度流式写回飞书

> **ARCHIVED 2026-09-14** — 本 effort 判定失败，已归档（不再维护）。原因与复活方式见 [`../RETRO.md`](../RETRO.md)。

Status: RUNNING
Blocked by: 02(done)

## Goal

pi 在跑的时候，飞书这边看得到进度，而不是"⏳ 处理中"然后干等。

## Shape

- 收到一条消息 → 立刻回一条"占位"消息（或首条进度），拿到 `message_id`；
- `message_update` 累积文本 → 以 2–5 秒的节流用 `lark-cli im messages.patch` 原地更新那条消息；
- 工具事件折叠成一行（"正在 `bash: bun test`"），不要每行 delta 都刷屏；
- `agent_settled` → 最终文本一次性 patch 成完整回复；超长按行分片再补发。
- 失败降级：patch 失败（频控/权限）→ 退回"只在结束时回一条 + 一条进度"的保守模式。

## Acceptance

- 一次 60 秒的 pi 任务里，飞书那条消息至少被原地更新 5 次，且没有重复消息。
- 频控下不出现失败重试风暴（失败即降到保守模式）。

## Notes

- 不要用卡片延迟更新 token 做进度：`token` 只有 30 分钟 / 2 次。
- `im messages.patch` 的具体参数先 `lark-cli schema im.<resource>.<method>` 查。

## Comments

- 2026-09-14 实现。做法与初版设想不同：**不用卡片、也不删除重建消息**，而是
  1. 第一帧进度用 `im +messages-send --markdown` 建一条 post 消息（拿到 `message_id`）；
  2. 之后用 `im +messages-edit --message-id <id> --markdown` **原地改写**（默认 3 秒节流，`progressIntervalMs`）；
  3. 收尾时：答案能塞进一条消息（≤ `maxReplyChars-400`）就**把进度消息改成答案本身**，否则改成 `✅ 项目 · 用时 · 用过哪些工具` 再正常分片回。
- 进度正文 = `⏳ 项目 · \`当前工具\` · 秒数` + 累积输出的尾部预览（`progressPreviewChars`）。
- 降级：新建进度消息失败 → 关掉该进程的 progress（`progress_degraded`）回到"只在结束时回一条"；编辑失败只记 warn，绝不影响回复路径。
- 同步删掉了旧的"首个工具调用单独发一条 `🔧 正在 X…`"——它和进度消息重复。
- 实测（`--simulate`，send/edit 被打印而不是真发）：
  `--> ⏳ beads-matt-dag · bash · 4s` → `--> ⏳ … · 7s`（原地改写）→ `--> <最终答案>`（收尾改写成答案）。
- 仍欠：真飞书一次长任务（频控/编辑权限只在真发时才暴露）。

- 2026-09-14 真飞书验证（`--ask` 走真发送）：`chat_send` 30 字符建进度消息 → 回合 4.5 秒结束 →
  `message_edit` 62 字符 ok:true 把那条消息改成答案本身。**没有**出现"进度一条 + 答案一条"的重复。
- 关键教训：`im +messages-edit` **只能改 text/post 消息，改不了卡片**；改卡片要用
  `im messages patch --message-id <id> --data '{"content":"<卡片JSON字符串>"}'`（14 天内、30KB、不吃延迟 token）。
