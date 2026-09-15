# feishu-bridge（已归档，判定失败）

> **ARCHIVED 2026-09-14** — 停止投入。为什么停 / 保住了什么 / 怎么复活：[`RETRO.md`](./RETRO.md)。
> 工作台改用 `agegr/pi-web`（`pi-web.service`，<http://127.0.0.1:30141>）。下面是当时的记录，含「关键事实」段。


把 Archon 的 run 和 pi 的会话搬到飞书（手机上可读、可批、可打断）。

- 代码位置：`~/.local/share/feishu-pi-bridge/`（本机部署；是否收进仓库待定）
- 服务：`feishu-pi-bridge.service`（systemd --user，桥本身）+ 每个项目一个常驻 pi RPC 子进程
- 新应用：`Archon-Bridge` / `cli_aa2d7e0573789bd9`，lark-cli profile `archon-bridge`（与 SIRIUS 完全隔离）。
  **open_id 是按应用隔离的**——换 app 必须换白名单（旧 open_id 会 `99992361 open_id cross app`）。
- 现状：01–12 已落地（RPC 常驻、流式进度、批准卡、run watcher、agent 提问卡、技能/项目选择卡、输入栏菜单、
  历史会话接回、话题群工作台、多维表格票板+run 台账）。13 是**换/加前端的调研**（飞书群里给不了按钮 →
  考虑 pi 原生 Web UI / archon serve）。
- 本effort 由人直接实现（不走 drain），因此 ticket 不用 `MERGED` 生命周期，只用 `READY`/`RUNNING`/`BLOCKED`。
- **技能调用必须显式**：`disable-model-invocation: true` 的技能（grill-me / grill-with-docs / to-spec /
  to-tickets / drain …）不会进 system prompt，只能由人打 `/skill:<name>`；RPC 在发送前展开这类命令。
  桥因此**必须把不认识的 `/xxx` 转发给 pi**，不能吞掉。

## 飞书斜杠命令面板（为什么 `/` 什么都不弹）

- 那个面板是飞书原生能力 **Slash Command**，要在应用上**注册命令**才会有内容——之前一个都没注册。
- 注册用 `lark-cli application +slash-command-create --command <名> --description <默认> --description-i18n zh_cn=<中文>`
  （还有 `+slash-command-list` / `+slash-command-update` / `+slash-command-delete`；`--force` 让重跑变成幂等更新）。
- 已注册 10 个：`/help /use /projects /new /status /runs /watch /watching /unwatch /skills`。
- 客户端缓存约 5 分钟才出现；要求飞书桌面 ≥ 7.70、移动端 ≥ 7.71。
- 桥的 `/skills` 会列出可用技能，并用 ⚠️ 标出带 `disable-model-invocation` 的（那些**只能人显式打** `/skill:名`）。

## 调试入口（不需要人操作）

```bash
cd ~/.local/share/feishu-pi-bridge
bun bridge.ts --simulate <chatKey> "<文本>"      # 跑完整管线但不发飞书（打印将要发的）
bun bridge.ts --ask      <chatId>  "<文本>"      # 真发真收（自测进度/回复用）
bun bridge.ts --card-demo <chatId> [文案]        # 发一张演示批准卡
bun bridge.ts --ui-selftest <chatId> [选项]      # 起 pi 探针 → 发提问卡 → 合成点击 → 验证答案回到 pi
bun bridge.ts --watch <runId> <cwd> <chatId>     # 登记要盯的 run
bun bridge.ts --poll-once                        # 确定性单次轮询（测 watcher 推送）
bun bridge.ts --group-selftest <chatId> <anchorMsgId> <threadId> "<文本>"  # 合成一次"群里话题内说话"，真发真收
bun bridge.ts --recap-dry <chatId> [n]            # 看 /recap 到底会把什么内容喂给 pi
bun bridge.ts --menu-plan                        # 打印输入栏菜单要填的表（控制台用）
bun bridge.ts --menu-fire <event_key>            # 模拟一次菜单点击（控制台配好前后都能测）
bun bridge.ts --dump-card skills|projects        # 打印选择卡 JSON（调试卡片报错用）
bun bridge.ts --card-skills|--card-projects <chatId>   # 真发一张选择卡
bun bridge.ts --click <messageId> <chatId> <actionName> ['{"form":...}'] ['{"value":...}']  # 合成一次点击
bun bridge.ts --picker-selftest <chatId>         # 发选择卡 + 把所有点击路径走一遍
bun bridge.ts --check                            # 环境自检（待升级）
```

## 关键事实（已核实，实现时别重新发现）

- **pi 的启动期提问无法远程作答**：`session_start` 阶段的对话框挂着时 pi 还没开始读 stdin（`get_state` 也超时），
  答案写进去读不到 → 桥只在 `PiRpc.ready` 为真时给可点按钮，并给 pi 传 `--approve` 从根上避开信任询问。
- **飞书按钮回调字段**：`behaviors:[{type:"callback"}]` 的按钮 → `action_name` 为空、值在 `action_value`（JSON 字符串）；
  `form` 里的 submit 按钮 → 有 `action_name`、值在 `form_value`。判定"点了哪个"必须两者都看。
- **改卡片**用 `im messages patch --message-id <id> --data '{"content":"<JSON字符串>"}'`；
  `im +messages-edit` 只能改 text/post，**改不了卡片**。

- **一个 app + 一个 event key 只能有一个 consumer**：桥的 `card.action.trigger` consumer 曾被一个遗留探测进程
  顶掉，报 JSON error 后静默退出（`consumer_died_early`），症状是"按钮点了没反应"。
- lark-cli 写操作的成功信封是 `{"ok": true, "data": {}}`；用 `"code": 0` 判定会得出相反的结论。
- 卡片延迟更新：`POST /open-apis/interactive/v1/card/update`，body `{token, card:<对象>}`（对象形状才对；字符串形状报 200621）。
  token 30 分钟 / 2 次 —— 只够一次状态变更，进度必须走 `im messages.patch`。

- pi RPC：`pi --mode rpc`，stdin/stdout JSONL；命令 `prompt`/`steer`/`follow_up`/`abort`/`clear_queue`/
  `get_state`/`get_session_stats`/`new_session`/`switch_session`/`set_model`/`set_thinking_level`/`get_commands`/
  `get_entries`；事件 `agent_start`/`message_update`(text_delta|thinking_delta|toolcall_start)/`tool_execution_*`/
  `turn_*`/`queue_update`/`compaction_*`/`auto_retry_*`/`agent_settled`；文档 `pi-coding-agent/docs/rpc.md`。
- RPC 没有 cd：cwd 在进程启动时定死 → **一个项目一个常驻进程**。
- `extension_ui_request`（select/confirm/input/editor，回 `extension_ui_response` 带 `id`）是"agent 主动问人"
  的协议；`notify`/`setStatus`/`setWidget` 是 fire-and-forget。
- 飞书：`card.action.trigger` 必须在开发者后台订阅回调，否则卡片按钮点了没反应（lark-cli 会直接拒绝并给出订阅链接）；
  `im.message.receive_v1` 只要求控制台已开启该事件。
- 卡片延迟更新 token：30 分钟、最多 2 次 —— 只够一次性状态变更，进度条要用 `messages.patch`。
- **话题群（实测）**：在话题群里 `+messages-send` 裸发一条 → 它自带 `thread_id`（`omt_…`）＝**每条裸发都新开一个话题**；
  要发进指定话题必须 `+messages-reply --message-id <话题内消息> --reply-in-thread`（响应里**不带** thread_id，落点要用
  `+threads-messages-list` 或肉眼确认）。桥的绑定键本来就支持 `chatId:threadId`。
- **话题群实测补充**：`thread_id` 在**消息对象**和**事件**里都有（`mget` 里是 `thread_id`，
  事件里也是 `thread_id`）；桥的键＝`chatId:threadId`，**常驻 pi 进程按 key 而不是 cwd**（两个话题两个会话）；
  出站一律 `+messages-reply --reply-in-thread`（锚＝该话题内任意消息）。`+threads-messages-list --thread <omt_…>` 存在，
  但对本 app 在自建群里也是 `230027`（读群历史整体不可用）。
- **群里的机器人接收范围**：与 p2p（全量）不同，默认只收到 @它 / 回复它的消息；`+chat-messages-list` 对
  bot 新建的群直接 `230027 access denied for this bot operation`（所以 `/recap` 在群里会失效）。
- **Base 需要先申请 scope**（当前 app 一个都没有，`99991672`）：`base:app:create` / `base:table:read|create` /
  `base:field:read` / `base:view:read` / `base:record:read|create|update`。申请页：
  `https://open.feishu.cn/page/scope-apply?clientID=<appId>&scopes=<urlencoded,逗号分隔>`，**申请后要重新发布版本才生效**。
- archon：`archon --cwd <repo> workflow get <id> --json` 需要在 git 仓库里跑；run 记录里有 `working_path`/`output_root`；
  Target 级 run lock（`.git/beads-dag-run.lock`）保证一次只有一个 drain。

## 票板 / run 台账（多维表格）

- Base `pi 工作台`：`base_token=PaV0bbSv5ai0Ols622vcAWV0ned`，
  `https://sjtu.feishu.cn/base/PaV0bbSv5ai0Ols622vcAWV0ned`
- 表：`票板` `tblIjeBZ7EZiuFlF`、`run 台账` `tblUGAFsv1S3SsaF`
- 同步器 `/data3/yky/.local/share/feishu-pi-bridge/board.ts`：`--sync <repo>` / `--sync-runs <repo>` /
  `--sync-all` / `--dedupe` / `--snapshot` / `--dump`。markdown 是唯一真相，Base 是单向镜像。
- 桥里：`/board`（卡片 + 同步/打开按钮）、`/sync`（后台同步 + 结果消息）、每轮 pi 后按 `.scratch` 指纹
  自动同步、run 到终态强制同步一次。批量写入 + 只写 diff：无变化约 5s。
- 坑：`base +record-list --format json` 是行数组且不带 record_id → 用原始 API
  `GET /open-apis/bitable/v1/apps/{app}/tables/{tbl}/records`；`--page-size` 上限 200；
  `+record-upsert` 不按业务键 upsert。
- 可见性：bot 建的 Base 用户**只读**能打开（够用，写由 bot 干）；只有要「你在 Base 里改、回写 ticket」
  才需要 `drive:drive` + `docs:permission.member:create` 等 8 条 scope（见 ticket 12）。
