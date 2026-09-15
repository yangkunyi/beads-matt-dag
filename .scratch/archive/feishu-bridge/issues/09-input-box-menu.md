# 09 — 输入栏常驻菜单 + 降噪 + 清理

> **ARCHIVED 2026-09-14** — 本 effort 判定失败，已归档（不再维护）。原因与复活方式见 [`../RETRO.md`](../RETRO.md)。

Status: RUNNING
Blocked by: 04 (done), 08 (done)

## 为什么

"手打 skill 麻烦"用选择卡解决了，但卡片要先进聊天、还要往上翻；用户要的是**钉在输入框旁边**的按钮。
另外测试期在聊天里堆了 20+ 条卡片和测试回复，看着乱。

## 做成什么

### 1) 输入栏菜单（飞书「机器人自定义菜单」）

- 桥侧已实现：消费 `application.bot.menu_v6` 事件（菜单点击），`event_key` → 动作：
  `skills`/`projects` 开对应选择卡；`skill_<名字>` 直接跑 `/skill:<名字>`（走同一条管线并带 label）；
  其余走 `handleCommand`（`new`/`status`/`runs`/`watching`/`help`/`watch_last`）。
- 菜单项定义是代码里的单一事实源 `MENU_PLAN`（3 主菜单 × 5 子菜单，飞书上限就是 3×5「可切换菜单」/5×10「悬浮菜单」）：
  - 🧩 技能：选技能卡 · grill-me · grill-with-docs · to-spec · to-tickets
  - 📁 项目：选项目卡 · 新建会话 · 项目状态 · 最近 run · 盯最近 run
  - ⚡ 干活：implement · drain · 代码审查 · 在盯的 run · 帮助
- `bun bridge.ts --menu-plan` 打印控制台要填的表；`--menu-fire <event_key>` 可在控制台配好之前先自测整条链路。
- 菜单只能在开发者后台配（无 OpenAPI），且**仅单聊**、需发版、发布后约 5 分钟生效；
  另一条路是「群菜单」API（`im/v1/chats/{chat_id}/menu_tree`），但要额外申请 scope（实测 `99991672` 缺
  `im:chat.menu_tree:read`），也要发版，所以没用它。
- 关键实现细节：消费者**自动重试**（90s），所以用户在控制台点订阅/发版之后**不需要重启桥**。

### 2) 降噪

- 点技能原来发两条消息（"▶️ 开始…" + 进度消息）→ 现在只有**一条**：进度消息直接用
  `/skill:<名字>` 当标题（`Turn.label`），最后原地变成答案。项目切换的确认从一整段缩成一行。
- `reply()` 对合成 id（`menu_*` / `card_*`）不再先试 `+messages-reply` 再回退发送，直接发。

### 3) 清扫

- 用户驱动的清扫能力：`lark-cli api DELETE /open-apis/im/v1/messages/<om_id> --as bot` 可以撤回
  **机器人自己发的**消息（返回 ok:true，之后 `deleted: true`；`+chat-messages-list` 仍返回墓碑行，属正常）。
- 本轮实际撤回 26 条测试残留（测试卡片、`路径不存在`、`已绑到`、`▶️ 开始`、pi-uiprobe 的进度/答案、
  对话测试卡），并清掉 `state.json` 里的 `cards`(1→0)、`ui`(6→0) 测试项。

### 4) 顺手加固

- SIGTERM 时**连事件消费者一起停**（原来只停 pi 子进程）：残留消费者会占着 per-key 事件总线，
  导致新进程的消费者 `consumer_died_early`。

## 证据

- `--menu-fire status` → `menu_click key=status` → `chat_send 120 chars` ✓（自测消息已撤回）。
- 消费者：`consumer_ready im.message.receive_v1` / `card.action.trigger`，
  `application.bot.menu_v6` → `consumer_retry_scheduled retryMs=90000`（控制台订阅前必然如此）。
- 待用户：点订阅链接 + 配菜单 + 发版（见 `--menu-plan`）。
