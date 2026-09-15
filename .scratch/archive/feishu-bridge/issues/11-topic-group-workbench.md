# 11 — 话题群工作台：一个话题＝一个项目

> **ARCHIVED 2026-09-14** — 本 effort 判定失败，已归档（不再维护）。原因与复活方式见 [`../RETRO.md`](../RETRO.md)。

Status: RUNNING（实现完成并验证，等你在群里跑一次真实的）
Blocked by: 无（群已建好）

## 为什么

用户的真实痛点第 3 条：**"多个 project 切换也有点麻烦"**。现在切项目＝在同一个 p2p 聊天里 `/use`
或点选择卡，上下文挤在一个会话里，切了就没法一眼看到"我在哪个项目里"。

飞书的话题群天然就是这个模型：**一个话题＝一条独立的线程**，点侧边栏的话题＝切项目，各话题互不干扰。
桥的绑定键本来就是 `chatId:threadId`（没有 thread 时退回 `chatId`），所以**底子是通的**。

## 已经验到的事实（探测，不是猜）

- **群已建好**：`pi 工作台`，`chat_id=oc_69bcb85781325420fd810a727a037faa`，`chat_type=private`，
  由 bot 创建并 `--users ou_4a6ab9ef70a87fbff1f978b8ab485693` 拉用户进群。建群**不需要额外 scope** ✓
- **普通发送在话题群里＝新开一个话题**：bot 直接 `+messages-send` 发的一条，`mget` 回来带
  `thread_id=omt_19c25997fccf1c80`。→ 如果桥照现在这样把进度消息直接发进群，**每轮都会新开一个话题**，
  必须改成"回进指定话题"。
- **线程内回复**：`+messages-reply --message-id <topic 内任意消息> --reply-in-thread`（底层 `reply_in_thread=true`）
  可用，但**响应里不带 thread_id**，落点待用 `+threads-messages-list` 或肉眼确认。
- **群消息读历史被拒**：`+chat-messages-list` 在这个新群上返回 `230027 access denied for this bot operation`
  → 桥不要依赖"读群历史"（`/recap` 在群里会失效，p2p 照旧）。
- **机器人接收范围**：默认只会收到 @它 或回复它的消息（与应用的事件订阅范围设置有关），
  与 p2p 全量接收不同 → 设计取 **"话题里 @一次激活"**，并在 ticket 里记可选放宽。

## 做成什么

1. **绑定键按话题**：`key = threadId ? \`${chatId}:${threadId}\` : chatId`（现有逻辑），
   群里的每个话题各自一个 pi 会话、各自一个项目、各自一条进度消息。
2. **所有出站消息回进话题**：`sendChat`/进度消息/卡片/答案，凡是在话题群里一律走
   `--reply-in-thread` 锚到该话题内的一条消息（用户那条 @消息或桥自己的首条），**绝不裸发**。
   `messages patch` 按 message_id 更新，天然留在话题内 ✓。
3. **话题激活**：话题里第一条 @机器人的消息 → 建绑定；`/use <项目>` 在话题内切项目；
   话题未绑定时回一条"这个项目叫啥？"的引导（或按消息里提到的项目名自动匹配已注册项目）。
4. **p2p 继续保留**：p2p = 随手问、临时活；群 = 长期工作台（多项目并排）。两边互不影响。
5. **通知就近**：run 完成/门/日报发到**该项目自己的话题**里，不再往 p2p 发。

## 实测（本次的验证证据）

- **事件带 thread_id**：你 12:33 那条 @ 进来时 `threadId=omt_19c26146454e1ce7` ✓（桥当时只记了 `group_ignored`）。
- **`--reply-in-thread` 落点**：裸发一条拿到话题 `omt_19c2623f760f1a76`，链式两条 in-thread 回复的 `thread_id` **完全相同** ✓
  → "回进指定话题"可靠（`mget` 逐条验的）。
- **实现已落地**（`bridge.ts`）：
  - 绑定键＝`chatId:threadId`，**常驻 pi 进程改成按 key**（`rpcByKey`）——同一仓库的两个话题不会共用一个进程/一个会话文件
    （话题的 session id 形如 `feishu-<项目>-<thread 尾6位>`）。
  - 所有出站（回复/进度/答案/卡片）在有话题时一律 `--reply-in-thread` 到锚消息；`state.topics[key]` 存话题，
    `state.topicMsgs`/`cardKeys` 记"我们发的消息属于哪个话题/哪个 key"。
  - 新话题第一句：发一张项目卡 + 一句引导；点卡片 = **绑这个话题**（合成点击验过：事件不带 thread_id 也能正确落到话题，`card_bind inTopic=true`）。
  - 群里自动剥掉开头的 @ 再解析命令。
- **端到端自测**（`--group-selftest <chatId> <anchor> <threadId> <文本>`，真发）：
  激活引导 ✅ 话题内 · `/use` 绑定 ✅ 话题内 · 一轮 pi：**进度消息在原地变成答案、只有一条**，且 ✅ 话题内 ·
  卡片点击绑定 ✅ 话题内。顺带修掉两个真 bug（激活路径 `ReferenceError: BT`；pi 太快时进度消息"发晚了"多出一条）。
- **p2p 无回归**：`/help` `/status` `/sessions` 走 `--simulate` 全通。

## 还欠 / 已知限制

- **群消息接收范围**：机器人默认只收到 @它 / 回复它的消息。话题里如果普通消息不进来，要么每条 @，要么在控制台放宽
  （待你实测确认；需要的话我去查确切开关位置）。
- **读不了群历史**：`chat-messages-list` / `threads-messages-list` 在这个群都是 `230027`
  → 群里 `/recap` 不可用（p2p 照旧），也**不能靠话题标题自动绑项目**（只能点卡片或 `/use`）。
- 你的第一条 @ 消息还留在群里（机器人删不掉别人的消息，你自己划掉即可）。

## 第一批任务（顺序就是风险顺序）

1. **验证接收端**：请用户在群里 @机器人 说一句 → 看 `im.message.receive_v1` 事件里有没有
   `thread_id`（`root_id`/`parent_id` 作兜底）。**没有 thread 标识则本设计不成立**，退回
   "群 + 话题名映射"方案（另写 ticket）。
2. 验证 `--reply-in-thread` 的落点：连发两条，用 `+threads-messages-list` 确认在同一 thread。
3. 桥改造：thread-aware send（`sendChat`/`sendCardJson`/进度消息）+ 每个 key 独立进度消息。
4. `/help`、README、`allowedChats` 加群 id（**注意**：加群前要确认不会把群里的杂音当指令）。
5. 删除探测消息（`DELETE /open-apis/im/v1/messages/{id}`，已验证对 bot 自己的消息有效）。

## 等用户的三个动作

- 在群里 @机器人 说一句（验证用，之后我会删掉那条）。
- 确认群在不在你的飞书里（不在的话把 `share_link` 点一下进群）。
- 若要"不 @ 也能说"：控制台把该应用的**群消息接收范围**放宽（可选，不做也能用，只是每条要 @）。

### 2026-09-14 21:36 — 群里的「输入栏按钮」：两条路都堵，改做「🧭 控制台」话题（agent）

**堵死的一条**：群菜单（`GET/POST /open-apis/im/v1/chats/{chat_id}/menu_tree`）在**话题群**上被飞书拒绝 ——
用户开通 `im:chat` / `im:chat:readonly` / `im:chat.menu_tree:read` 之后仍然报
`code 232001: Your request specifies a chat whose type is NOT supported currently, ext= type: Topic`。
同一时间对普通 chat 的读取不报错。→ 群菜单只能用在普通群，**话题群无解**。

**另一条本来就不存在**：机器人自定义菜单（输入栏上方浮窗）飞书只支持**单聊**，群里不显示。

**所以群里改用「控制台话题」**（卡片回调在话题群里是通的，早先的认领卡点击已验证）：

- 新建了一条话题 **🧭 控制台**（thread `omt_19c27f2a3dcf9c9e`，root `om_x100b654b30fc30a8b3245b0c519af89`），
  里面一张常驻控制卡，按钮：📁 项目 / 🧩 技能 / 📋 看板 / 🔄 同步票板 / ❓ 帮助。
- 这条话题自己绑一个项目（先绑 `beads-matt-dag`），卡片上的按钮都作用在**它**上面；
  点「📁 项目」换一个项目就等于把控制台指向别的项目。
- **置顶 API 在话题群里可用**（`POST /open-apis/im/v1/pins` 返回 ok），所以控制卡可以钉在群顶部。
- 生成方式：`bun bridge.ts --console <chatId> [projectCwd]`（发卡 → mget 读回 thread_id → 写
  `state.topics` / `state.cardKeys` / `state.topicMsgs`）；换话题后重启服务让它接管 state。

**顺带修掉一个真 bug**：`anchorOfMessage()` 只认 `state.topicMsgs`，而手工发的控制卡只写了
`cardKeys` → 从控制卡里发出的下一条消息**没有话题锚点**，在话题群里会**又开一个新话题**
（实测：点「📋 看板」多出一个话题 `omt_…`，已删）。修法两条：`anchorOfMessage` 兜底用
`state.topics[key].anchor`；`--console` 同时写 `topicMsgs[messageId] = messageId`（自锚点）。
复测：点「📋 看板」→ `card_sent inThread: true`，`mget` 确认 `thread_id` 与控制台话题一致 ✓。

**还没做的**：让每个新话题自动带一张自己的控制卡（现在只有控制台话题有）；把 `--console` 变成一个桥命令。

### 2026-09-14 21:45 — 设计修正：删掉「控制台话题」，改成每个话题自己的头卡（agent）

用户看了控制台话题说「有点丑陋了」——对。原因：它是**用话题假装按钮栏**，还多要一次绑定，
和「一个话题＝一个项目」的模型打架。先把设计空间用实名事实钉死：

| 通道 | 限制（实测/官方文档） | 能不能跑命令 |
|---|---|---|
| 机器人自定义菜单（输入栏浮窗/可切换） | **仅单聊** | ✅ 能（发送文本 / 回传事件 / 链接） |
| 群菜单 `chat_menu_tree` | **仅 `chat_mode=group`**；话题群报 `232001 … ext= type: Topic`；`action_type` 只有 `NONE`/`REDIRECT_LINK` | ❌ 只能放链接 |
| 斜杠命令面板 | 需客户端 ≥ 7.70（群里是否显示待用户确认） | ✅ |
| **卡片回调按钮** | 单聊 / 群 / 话题群都可以 | ✅ |

→ 结论：**话题群里"能点的东西"只有卡片**，这是飞书的规则。所以优雅的做法不是造一个假话题，
而是让**每个话题自带一张头卡**：

- 新话题的第一条消息 → 回项目卡（一次点击认领）；认领后**那张卡就地变成话题头卡**：
  `📌 <项目名>` + `📁 换项目` / `🧩 技能` / `📋 看板` / `🔄 同步`（都在这个话题内，属于这个话题）。
- **开话题时说的那句会被存下来，认领项目后自动跑掉**（`state.pending[key]`）——
  不用"认领完再重打一遍"。
- 已删除「🧭 控制台」话题及其卡片、state 痕迹；`--console` CLI 与 `consoleCard()` 一并删掉。

**顺带修掉一个真 bug**（话题里点「技能」）：卡片里起一轮对话时合成的事件**丢了 thread_id**，
于是 key 退化成裸 `chatId` → 解析成「还没绑项目」，而且它的进度消息没有话题锚点会**再开一个话题**。
现在合成事件带上 `thread_id`（`chat_type: group`），锚点由 `state.topics[key].anchor` 兜底。

**还没做/待确认**：群里斜杠面板是否弹（用户侧）；单聊那排浮窗为什么没了（用户侧）；
以及如果用户更想要"侧栏一眼看到项目"，可以再做「一项目一群」——普通群能建群菜单，**但群菜单也只能放链接**，
收益主要是群名/群公告显眼。

### 2026-09-14 21:55 — 定案 A：单聊＝控制台，话题群＝工作区（agent）

用户选 A。落地内容（bridge.ts，全部实名验证过）：

1. **单聊控制台卡片**（`deckCard` + `bun bridge.ts --deck [chatId]`）：一张常驻卡片，
   `📁 项目 / 🧩 技能 / 📋 看板 / 🔄 同步票板 / 📊 状态 / ❓ 帮助`，**点它不消失**（结果另发一条，
   所以点错了不用找回来）。已发到单聊并**置顶**（`POST /open-apis/im/v1/pins`，pinned true）。
   按钮全部实点验证：skills/board 各发一张卡，status 走 `/status` 并回到 112 字状态文本。
2. **话题头卡自愈**：`state.topicHeaders[key]` 记下话题的头卡；新话题在认领那一步、**老话题在下一句话时**
   自动补一张（`ensureTopicHeader`，in-thread ✓，日志 `topic_header_added`）；话题里 `/use` 换项目或
   卡片换项目时 `refreshTopicHeader` 就地更新。
3. **开话题的第一句会被记住并在认领后自动跑**（`state.pending`，日志 `pending_replayed`）——
   实测：认领 → 头卡 patch ok → pi 跑完 1380 字答案，进度与答案都落在话题内。
4. `menuChatId()` 改用显式 `consoleChat`（config 里＝单聊 id），不再靠 `allowedChats[0]` 的运气。

**踩到的坑（都已修）**：
- `--console` / `consoleCard()` 删除时，删除区间把刚插入的 `topicHeaderCard` 一起删了 →
  `ReferenceError: topicHeaderCard is not defined`（认领时必炸）。教训：删代码块要用符号级定位，
  不要用"从注释 X 到注释 Y"。
- 输入栏菜单事件的合成卡片把**事件 key**（`skills`/`projects`）当成会话归属写进 `cardKeys` →
  点那张卡会解析到不存在的会话（"还没绑项目"）。现在菜单卡片一律归属 `chatId`。
- 死绑定清理：删掉旧 app 的聊天（`oc_74e1487d…`，bot 不在里面 → 发送报 230002）和 `sim-chat` 残留。
- 顺手把 `--click` 的等待时间做成可配（`PI_BRIDGE_CLICK_WAIT_MS`），否则测"卡片点一下就跑一轮"时
  进程会提前退出把那一轮掐掉。

**结论**：群里的输入栏浮窗此路不通（自定义菜单仅单聊、群菜单仅普通群且只能放链接），
所以"控制台"落在单聊（卡片＋可选的自定义菜单），群里每个话题自带一张头卡。

### 2026-09-14 22:10 — 出口：前端的限制本身（见 13）

用户反馈「好像没有群命令，感觉飞书有点不方便」→ 群里的斜杠面板实测不弹。结合 21:55 的事实表
（自定义菜单仅单聊、群菜单仅普通群且只能放链接），结论是**飞书适合通知/审批/一句话指令，不适合当主工作界面**，
于是开了 **13-surface-options.md** 做前端调研（pi 原生 Web UI A/B/C、archon serve D、自建 E）。

