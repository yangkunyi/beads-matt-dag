# 13 — 换/加前端：飞书之外还有什么（调研 + 选型）

> **ARCHIVED 2026-09-14** — 本 effort 判定失败，已归档（不再维护）。原因与复活方式见 [`../RETRO.md`](../RETRO.md)。

Status: READY（等用户挑一个试）
Blocked by: —

## 为什么会有这张票

话题群工作台（11）落地后暴露一个硬事实：**飞书群里能给"按钮"的地方基本没有**。

| 通道 | 实测/官方文档 | 能跑命令吗 |
|---|---|---|
| 机器人自定义菜单（输入栏浮窗/可切换） | **仅单聊** | ✅（发送文本 / 回传事件 / 链接） |
| 群菜单 `chat_menu_tree` | **仅 `chat_mode=group`**；话题群报 `232001 … ext= type: Topic`；`action_type` 只有 `NONE`/`REDIRECT_LINK` | ❌ 只能放链接 |
| 自定义斜杠命令面板 | 单聊验证可用；**群里用户实测不弹** | ✅（单聊） |
| 卡片回调按钮 | 单聊 / 群 / 话题群都可以 | ✅ |

结论：飞书这套适合"**通知 + 审批 + 手机上的一句话指令**"（推送能力是它的强项），
不适合当"**主要工作界面**"（长会话、看 diff/文件、多会话并行、常用命令入口都不行）。

用户原话：「好像没有群命令，感觉飞书有点不方便啊，有没有其他的方案」+「比如自建一个 app 或者现成的方案，
github 上面找一下」。

## 环境事实（动手前确认过）

- 本机 pi `0.85.1`，node `24.19.0`。
- GitHub / npm 直连被 TUN fake-IP 挡（`198.18.0.7`）→ **走本地代理 `http://127.0.0.1:23379`**
  （`export https_proxy=http://127.0.0.1:23379`，curl / npm / fetch 都通）。
- 现有资产：`~/.local/share/feishu-pi-bridge/bridge.ts`（pi RPC 常驻、per-conversation session、
  流式进度、agent 提问卡、run watcher、票板 Base 镜像）—— 换前端时这些逻辑可以复用。
- pi 会话按 cwd 存在 `~/.pi/agent/sessions/`，技能在 `~/.agents/skills`（+ 项目 `.agents/skills`）——
  任何"同一个 pi"的前端都天然共享；但**一个 session 文件不能被两个进程同时写**，所以新前端要跟桥用**不同的 session id**。

## 现成方案（都是 pi 原生的，MIT）

### A. Pi Web UI（Firstp1ck 的 pi 包）★ 建议先试这个

- 装法：`pi install npm:@firstpick/pi-package-webui` → 重启 pi → `/webui-start` → `http://127.0.0.1:31415/`
  （默认只听 localhost；`/webui-status` 看状态）。
- 手机：再加 `pi install npm:@firstpick/pi-package-remote-webui` → `/remote` → **局域网开放 + 二维码 + PIN**，
  `/remote close` 关掉。README 明写"桌面全功能 / 手机紧凑布局 + 触控导航"。
- 版本 `0.10.5`（远端包 `0.1.9`），MIT，仓库 `Firstp1ck/pi-coding-agent-forge`。
- 好处：**就是同一个 pi**（同会话、同技能、同模型配置），零架构改动；只改 `~/.pi` 设置，`pi remove` 可完全回退。
- 风险：默认只监听 localhost（要靠 remote 包或自己反代才能从手机访问）；第三方 pi 包会以完整权限运行（官方文档明确警告）。

### B. PI WEBUI（hyperdreamer）★ 备选，功能最全

- 装法：`npm i -g @hyperdreamer/pi-webui && pi-webui` → `http://localhost:8809`。
- 要求：node ≥ 22.19 ✓、pi `>=0.85.0 <0.86` ✓（本机 0.85.1，正好）。
- 卖点：**关掉浏览器会话继续跑**、多会话并行、projects/workspaces/files/terminals/sessions/远程机器、
  "在笔记本/手机/平板/桌面之间切换"、每项目模型与技能、minimap。
- 版本 `1.19.0`（版本号成熟 = 迭代久），MIT，主页 pi-webui.dev。

### C. pi-web（ashwin-pc）

- 装法：`npm i -g @ashwin-pc/pi-web && pi-web`；node ≥ 24 ✓。
- 卖点：**自带登录**（密码/passkey、可撤销的设备会话、设备交接 + 命名 API token）、手机/平板/桌面响应式、
  工件预览（Mermaid 全屏）、钉住的会话标签、e2e 测试快照。
- 版本 `0.6.0`，MIT。**注意**：它 **自带 pi 0.84.1**（与本机 0.85.1 版本漂移），可能带来会话/配置兼容问题。

### D. Archon 自带 Web UI（本机已验证能跑）

- `archon serve`（默认端口 `3090`，可 `--port` 改）。2026-09-14 实测：`http://127.0.0.1:3090/` 返回 200，
  `/api/codebases` 正常，日志 `activePlatforms: ["Web"]`，server_ready。
- 它是**编排器的界面**：conversations、projects、workflow runs、审批、dashboard、artifacts。
- 价值：看/批 run（含 `--wait` 那种要人决策的闸门）比在飞书卡片里点更清楚；移动端适配未知。
- 注意：`archon serve` 起来时会顺带尝试别的适配器（日志里有 `slack_adapter_skipped` / `telegram_adapter_skipped`）。

### E. 不适配（要换 harness，暂不考虑）

- `CharAznable98/roam-cli`：自托管控制面，但面向 Codex / Claude Code（有中文文档、runner 反向 WebSocket、移动视图）。
- `slopus/happy`（happy.engineering）：Claude Code / Codex 的手机+网页客户端，E2E 加密、语音。
- `saltbo/agent-kanban`、`pavel-molyanov/telegram-ai-agent`、`ianshan0915/pi-agent-chatbot-platform`
  （后者虽是 pi + WebSocket，但要 PostgreSQL/Redis + Docker，是"团队多租户平台"，为这个场景过重）。

## 自建（备选，不推荐现在做）

我们已经有一半了：桥里已有 pi RPC 常驻、per-conversation 会话、消息队列、流式进度、卡片、run watcher、
票板镜像。自建一个 PWA 大约 0.5–1.5 天（HTTP + SSE + 一个聊天界面），换来的是"飞书和网页同一个前端"。
但在 A/B/C 都存在的情况下，先花半小时试现成的更划算。

## 建议的组合（待用户点头）

1. **工作界面**：A（或 B）—— 真正干活（长会话、多会话、文件/diff）在浏览器/手机上做。
2. **飞书保留**：run 完成/闸门通知、卡片审批、不在电脑前的"一句话指令"。飞书这套已经跑通，不浪费。
3. **D**：想认真看 run/审批时用 `archon serve`。
4. 前置条件：手机要能到这台机器（校园网内网直连 / 学校 VPN / 反代）。A 自带局域网+二维码+PIN 最省事。

## 下一步（等选）

- 选 A：`pi install npm:@firstpick/pi-package-webui`（+ remote 包），我装完跑起来验证 `/webui-start` 与局域网二维码。
- 选 B：`npm i -g @hyperdreamer/pi-webui`，起 `pi-webui` 验证 8809。
- 选 C：同上验证，但先确认它用哪个 pi（自带 0.84.1 vs 本机 0.85.1）。
- **安装第三方 pi 包 = 让它以完整权限运行**，动手前要用户明确同意。

## D（archon serve）到底能不能切项目 —— 实测（2026-09-14 22:15）

把 `archon serve` 起起来，翻它的前端产物与接口（`curl` 首页 → `/assets/index-BIiu8VlQ.js`，1.5 MB）：

- **左栏就是项目列表**：一条 `All projects`（点它 → `/console`）+ 下面可滚动的项目条目，当前项高亮
  （`aria-pressed`），底部 `+ Add Project`（文案：*Connect a repository or a local folder as a workspace*）。
- **一个项目一个 URL**：`/console/p/<projectId>`（项目自己的 console 主页 = 该项目 run 列表 + 对话框
  *Ask the agent about this project, or tell it what to run*），run 详情 `/console/p/<projectId>/r/<runId>`。
- **筛选框**：`Filter projects…`；选中项存在 localStorage `archon-selected-project`（下次自动回到上次的项目）。
- 现在注册表里有 **37 个 codebase**（桥的 `hideTmpProjects` 只是桥的过滤，web UI 全列，多数是 /tmp 实验项目）。

**限制 / 风险（实测）**：

- `archon serve` **没有 `--host`**（试 `--host 127.0.0.1 --port 3091` 直接被当非法参数 → 打印通用帮助），
  它**固定监听 `0.0.0.0`**；`/api/codebases` 等接口**无需任何凭据**（200）。前端里有 `Sign in` / `Create your account`
  文案，但这些接口上没被强制。校园网是 `10.10.41.22/22`（一个 /22！）→ 等于同网段谁都能摸到这个端口。
  **建议：要用再开，或者只经 Tailscale 访问（见下）。**
- **不是为手机设计的**：CSS 里只有少量断点（40/48/64/80/96rem 各 1–2 条）→ 桌面/平板合适，手机勉强。

**顺便发现的网络事实**：本机有 **Tailscale**（`tailscale0: 100.126.29.75/32`）——
手机/笔记本只要也挂同一个 tailnet，就能从任何地方访问这台机器：
`http://100.126.29.75:3090`（D）或 A 的 web UI 端口。这比"同局域网+二维码"更强，**A/B/D 全都能受益**。

## A 落地（2026-09-14 22:25，用户选 A）

```
npm i -g @firstpick/pi-package-webui          # 0.10.5，走 proxy 23379；node-pty 自带 prebuild，能加载 ✓
pi-webui --host 0.0.0.0 --port 31415 --remote-auth --cwd /data3/yky/beads-matt-dag
```

- 监听 `0.0.0.0:31415`；**本机（127.0.0.1）不用 PIN**，非本机要 **远程 PIN**（每次启动随机，本次 `1105`，
  日志第一行 `Pi Web UI remote PIN for startup option:`）。
- 已验证：`http://127.0.0.1:31415/` 200；`http://100.126.29.75:31415/`（Tailscale）200；
  `http://10.10.41.22:31415/`（校园网）200；非本机打 API → `{"ok":false,"error":"Remote PIN required","remoteAuthRequired":true}` ✓
  **PIN 确实在挡**。
- 它自己拉起 `pi --mode rpc`，**把我们所有技能显式带上**（matt-pocock 全套 + lark 全套 + pi-subagents 等扩展）✓。
- **没有**动 `~/.pi` 的 package 列表（走的是 npm 全局安装 + 独立服务，不需要 `pi install`），
  所以飞书桥那套 pi 进程不受影响；卸载 = `npm uninstall -g @firstpick/pi-package-webui`。
- 命令：`pi-webui [--host --port --cwd --remote-auth --pi --no-session --name]`（有 `--host`，比 archon serve 灵活）。
- 用户 lingering = yes → 这个 nohup 进程能活过登出；**还没做 systemd 服务**（等确定暴露方式再做）。
- 会话：webui 自己管 pi 会话，与飞书桥的 `feishu-<project>` 会话**互不干扰**（同一个 session 文件不能被两进程同时写）。

## 更正 + 按 GitHub star 重排（2026-09-14 22:40）

上一轮调研用的是 npm 元数据，**漏了 GitHub 上最大的那个**。按 star 重排（GitHub API，走 proxy 23379）：

| star | 仓库 | 说明 | 端口/装法 |
|---|---|---|---|
| **6357** | **agegr/pi-web** | 和 pi **共用同一套配置与 session 文件**（读 `~/.pi/agent/sessions/*.jsonl`），会话按项目分组、可接回；主题 light/dark/mist/rose/pine/auto；**中文界面**（简/繁）；密码登录；内嵌 pi SDK（锁 `@earendil-works/pi-*` 0.85.1，与本机一致） | `npx @agegr/pi-web@latest` → 30141 |
| 759 | jmfederico/pi-web | **断线后 session 继续跑**（装成用户级服务：`pi-web install`），手机/平板布局，主题插件目录 | `npm i -g @jmfederico/pi-web --allow-scripts=node-pty; pi-web install` → 8504 |
| 195 | MkThingsHQ/mkagent | Desktop+WebUI+CLI 的 Pi workspace | — |
| 168 | saadnvd1/agent-os | mobile-first，但多 agent（Claude Code/Codex/Aider），不只 pi | — |
| 167 | xing-shuyin/pi-web-ui | dsh / pi-agent web ui | — |
| 146 | thecodacus/pithagoras | 托管式（关浏览器也跑） | — |
| 80 | Firstp1ck/pi-coding-agent-forge | **就是现在装的 A**（webui 0.10.5） | 31415（已装） |
| 34 | ashwin-pc/pi-web | 上轮的 C | — |
| 6 | hyperdreamer/pi-webui | **上轮说的 B，只有 6★ — 上轮推荐排序被 npm 数据带偏了** | — |

主题面（对"花哨"这个抱怨）：A 的槽位只有 Catppuccin Latte(浅)/Mocha(深) + Light/Dark/Auto，
另有 51-token 自定义编辑器与可选主题包（Dracula/Tokyo Night/Nord…）；agegr 自带 5 套配色且默认就是素色开发台；
jmfederico 默认米白扁平风。

agegr 的坑（已从 README 核实）：默认 **10 分钟 idle 驱逐会话**（`PI_WEB_IDLE_TIMEOUT_MS=0` 可关，
detached 工作会阻止自动驱逐）；远端要 `PI_WEB_PASSWORD`，README 明确建议只走可信内网/VPN。

## 决定：用 agegr/pi-web，A 已卸载（2026-09-14 22:45）

**已装并常驻**（`@agegr/pi-web`, npm 全局，走 proxy 23379）：

- 服务：`~/.config/systemd/user/pi-web.service`（enabled + active，Restart=on-failure）
- 配置：`~/.config/pi-web.env`（chmod 600）→ `PI_WEB_PASSWORD=<20 位随机>`、`PI_WEB_IDLE_TIMEOUT_MS=0`（关掉 10 分钟空闲驱逐）、`PI_WEB_SKIP_VERSION_CHECK=1`
- 端口：`0.0.0.0:30141`；本机 `http://127.0.0.1:30141`，Tailscale `http://100.126.29.75:30141`，校园网 `http://10.10.41.22:30141`
- 鉴权：**所有客户端**都要密码（本机也跳 `/login`；API 无密码 401、带 Basic Auth 200）
- **坑**：systemd 服务环境的 PATH 里翻出 `/usr/bin/node` = **Node 12.22.9**，启动即失败；unit 里显式
  `Environment=PATH=<node24 bin>:...` 才起来（交互 shell 里因为有 export PATH 所以看不出来）

**实测**：`/api/sessions` 返回 **64 个会话按项目分组**（endo_label 22、beads-matt-dag 10、/tmp/ticket-dag 7 …），
当前这段对话（1335 条）在列表里，**飞书桥的 feishu-* 会话也看得到/能接回** ✓。

**A 的清理**：进程停掉、`npm uninstall -g @firstpick/pi-package-webui`（removed 379 packages）、
`~/.pi/webui` 删掉、31415 释放、`~/.pi/agent` 里无 firstpick 痕迹 ✓。

**遗留**：`archon serve`（3090，D）还在跑，未关。

