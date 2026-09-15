# 10 — 历史会话接回 / 聊天记录回灌

> **ARCHIVED 2026-09-14** — 本 effort 判定失败，已归档（不再维护）。原因与复活方式见 [`../RETRO.md`](../RETRO.md)。

Status: RUNNING
Blocked by: 02 (done)

## 为什么

用户在实际使用时撞上"上下文丢了"：`recap 当前这个对话` → pi 回答"**这个 session 是新的**"。
根因有两个，都不是 pi 的错：

1. **会话身份绑在"项目名"上**：`sessionIdFor(project)` 用项目名生成 id，于是同一个目录以不同名字
   （`endo-label` vs `yangkunyi/endo-label`）绑定时会得到**两个不同的 session**，看起来就像被重置了。
2. 切换项目 / `/new` / 换 app 之后，旧上下文没有任何入口能找回来。

## 做成什么

- **会话身份改成按目录（cwd）记忆**：`state.sessions: {cwd → sessionId}`，绑定/默认项目/`/new` 都写这张表；
  首次缺失时从已有绑定继承（迁移无感）。同一个目录永远同一个 session，换名字不再开新的。
- **`/sessions` → 🕘 历史会话卡**：列这个 cwd 下 `~/.pi/agent/sessions/--<path>--/*.jsonl`
  （时间、KB、首条用户消息当标签、当前在用哪个、⚠️ 刚被写过＝可能有别的 pi 在用），每行一个「接回」按钮，可翻页。
- **`/resume <序号|id|last>`**：把绑定的 sessionId 换成那一段，`dropRpc` 掉常驻进程，下一条消息就接上旧上下文
  （不重开、不重跑）。文件 2 分钟内被写过会警告"另一个 pi 可能正在用"。
- **`/recap [条数]`**：把**飞书聊天**自己的历史（`im +chat-messages-list`）清洗后回灌给 pi
  （过滤 `⏳ …` 进度/催促类、已撤回、卡片占位、卡片型消息；单条截 700 字），并让 pi 回答
  "我们到哪一步了 / 下一步做什么"。适合 session 真没了、或想让它对齐你**看到过**的内容。
- 队列细节：`/recap` 需要在命令处理完之后再起一轮 pi，但命令本身跑在 per-chat 队列槽里，
  直接 `handleMessage` 会**自锁**。做法：`CommandResult` 增加 `{runTurn}`，job 把它返回给调用方，
  调用方在槽释放后再 `handleMessage` 一次（带 label，所以屏幕上还是一行进度→答案）。

## 证据

- 接回真的能想起上下文：把 endo-label 的会话文件复制成新 id 后 `pi --session-id` 起来问
  "我们之前聊了什么"，回答准确复述了内容（`你发了 手机端，我查了仓库…然后你要我 recap…`）✓（副本已删）。
- `/sessions` 卡片发出 ✓（`command_card messageId=om_…539a`）；`/resume 2` 在 sim 绑定上返回
  `⏪ 已接回 01a09f54-…` ✓。
- `/recap 12` 真跑：`rows=… skipped=5`（进度/卡片类被正确过滤）→ 一条进度消息原地长大（32→41→640 字）
  → 最后被 2383 字的答案替换 ✓，即 endo-label 会话现在已经有聊天记录的上下文了。
- 结论：**会话文件是 `<时间戳>_<session-id>.jsonl`，第 1 行带 `id`/`cwd`** —— 列表、标签、接回都靠它。

## 还欠

- `/export`（把当前会话导出成飞书文档）——见下一个 ticket 的候选清单，等用户挑。
