# 12 — 多维表格：票板 + run 台账

> **ARCHIVED 2026-09-14** — 本 effort 判定失败，已归档（不再维护）。原因与复活方式见 [`../RETRO.md`](../RETRO.md)。

Status: RUNNING（票板 + 台账 + /board + /sync + 自动同步全部跑通并实测）
Blocked by: 无（代码层），实际挡在 scope

## 为什么

用户痛点：票的状态、依赖、drain 跑到哪了，现在要么在聊天里翻，要么开终端 `archon workflow status`。
飞书的多维表格能在**手机上**筛/排序/看板看票，还能把"放行"这个动作变成**勾一下**。

## 挡在前面的硬约束（已探测）

App `cli_aa2d7e0573789bd9` **没有申请任何 base scope**。用假 token 逐个探测 API，拿到确切的 scope 名：

| 能力 | 需要的 scope |
|---|---|
| 建 Base | `base:app:create` |
| 建表 / 读表 | `base:table:create` / `base:table:read` |
| 读字段 | `base:field:read` |
| 读视图 | `base:view:read` |
| 读记录 | `base:record:read` |
| 写记录 | `base:record:create`（更新/删除对应 update/delete） |

申请是一次点击（控制台 scope 申请页），**并且要重新发布应用版本才生效**：

```
https://open.feishu.cn/page/scope-apply?clientID=cli_aa2d7e0573789bd9&scopes=base%3Aapp%3Acreate%2Cbase%3Atable%3Aread%2Cbase%3Atable%3Acreate%2Cbase%3Afield%3Aread%2Cbase%3Afield%3Acreate%2Cbase%3Aview%3Aread%2Cbase%3Aview%3Acreate%2Cbase%3Arecord%3Aread%2Cbase%3Arecord%3Acreate%2Cbase%3Arecord%3Aupdate
```

## 做成什么

**一个 Base（"工作台"），两张表，一张给票、一张给 run。** 一个 Base 而不是一项目一个：
手机上一个 App 全看得见，跨项目筛选靠"项目"列 + 视图。

### 表 1：票（来源＝`.scratch/<feature>/issues/*.md`）

列：项目 / 票号 / 标题 / 状态（BLOCKED…MERGED，单选）/ 依赖(Blocked by) / **闸门**（ready-for-agent /
无）/ 优先级 / 最近更新 / 文件路径。

### 表 2：run 台账（来源＝`archon workflow runs --json` + 桥的 state.runs）

列：run id / 项目 / 工作流 / 状态 / 开始 / 结束 / 时长 / 结果 / cwd / 备注。

### 同步方向（**文件是源**，避免双向地狱）

- 文件 → Base：**单向镜像**。触发点：`/sync` 手动、每次 drain 结束、pi 回合结束后发现
  `.scratch` 有改动。
- Base → 文件：**只允许一列**：票的**闸门**列。在手机上把某张票设成 `ready-for-agent`
  ＝写回该票文件的闸门标签 ＝ **放行给 drain**（这就是刹车/油门）。
  其它列在 Base 里只读（写错了会被下一次同步覆盖，ticket 里要写清）。

### 视图

- 看板：按"状态"分组（一眼看到 BLOCKED/READY/RUNNING/MERGED 各多少）。
- "可开工"：筛 `闸门=ready-for-agent` 且状态未完成 ＝ 下次 drain 会挑的票。
- 按项目过滤。

## 第一批任务

1. 用户点 scope 申请 + 发布 → 桥 `--check` 加一项"base scope 是否可用"。
2. `/board` 命令：没有 Base 就建（`+base-create` → `+table-create` 带字段 schema → 记住 app_token/
   table_id 到 state），有就返回链接/卡片。
3. `/sync`：解析 `.scratch/*/issues/*.md`（Status/Blocked by 行的解析规则已在 tracker README 里）
   → `+record-upsert` 按"项目+票号"这个业务键对账（Base 没有业务键 upsert，需要桥自己先 `+record-list`
   查 record_id 再 update，或维护 record_id 映射表）。
4. `/runs` 的 Base 版：把 run 台账同步进去（drain 结束时触发）。
5. 闸门写回：Base 改闸门 → 桥检测（轮询或卡片按钮）→ 改票文件的闸门标签。

## 已知风险

- **业务键 upsert**：Base 的 upsert 不按业务键，需要桥自己维护 `record_id` 映射（放 state 里）。
- **scope 未发布前全部 403**：所有 base 调用都会 `99991672 app_scope_not_applied`，`--check` 要能报清。
- 票文件里 `Blocked by` 是自由文本（如 `02 (done)`），转成 Base 的依赖列需要一条解析规则；
  解析不了的写进备注列，别硬猜。

---

## Comments

### 2026-09-14 21:05 — scope 生效，板子建好并同步完成（agent）

**scope 通了**（用户开通 + 重新发布版本后）：所有 `base` 调用从 `99991672 app_scope_not_applied`
变成正常业务响应（bogus token → 91402 NOTEXIST），实测可用的权限面：`base:app:create`、
`base:app:read`、`base:table:read`、`base:table:create`、`base:field:read`、`base:view:read`、
`base:record:read`、`base:record:create`、`base:record:update`，另外**删除记录也能用**
（`records/batch_delete` 返回 `records: []` 而不是缺权限）。

**建出来的东西**：

- Base：`pi 工作台`，`base_token=PaV0bbSv5ai0Ols622vcAWV0ned`，
  URL `https://sjtu.feishu.cn/base/PaV0bbSv5ai0Ols622vcAWV0ned`（tenant 是 `sjtu.feishu.cn`）
- 表：`票板` `tblIjeBZ7EZiuFlF`（列：票号/标题/项目/状态/阻塞于/闸门/路径/备注/同步时间）、
  `run 台账` `tblUGAFsv1S3SsaF`（列：run_id/workflow/状态/结果/项目路径/开始时间/结束时间/同步时间）
- 状态列做成单选（8 个生命周期值，带颜色），`同步时间` 用 `updated_at` 系统字段自动写

**同步器**：`/data3/yky/.local/share/feishu-pi-bridge/board.ts`（bun），
`--sync <repo>` 同步票板、`--sync-runs <repo>` 同步 run 台账、`--sync-all`、`--dedupe`、`--dump`（只解析）。
解析规则：`# NN — 标题` 取标题、`Status:` 取第一个大写词、`Blocked by:` 原样进"阻塞于"、
正文里出现 `ready-for-agent` 则闸门列写它；跳过 `Type: research/prototype/grilling/task`。
实测：**3 个 feature / 41 张票**（beads-dag 20、beads-skills 9、feishu-bridge 12），
状态分布 READY 30 / RUNNING 10 / BLOCKED 1，闸门 ready-for-agent 10 张；run 台账 20 条（含 endo_label 的 drain）。

**踩到的坑（下次直接用）**：

- `base +record-list` 的 `--format json` 是**行数组**（`data.data`，按列序排列、**没有 record_id**），
  不能当对象用；要 record_id + 字段名就用原始 API
  `GET /open-apis/bitable/v1/apps/{app}/tables/{tbl}/records`（`items[].record_id` + `items[].fields`）。
- `--page-size` 上限 200（500 报 `invalid --limit 500: must be between 1 and 200`）。
- 上面那条坑直接导致第一次同步后**重复了 41 条**（索引读不到 → 全当新建），
  靠 `--dedupe`（同 key 保留 `同步时间` 最新一条，其余 `batch_delete`）清回 41 条。
- `base +record-upsert` **不按业务键 upsert**：必须先自己 list 出 record_id 再决定 create/update。

**唯一还没通的一环 —— 你看不看得见这个 Base**：base 是 bot 身份建的，创建时 lark-cli 就警告
`no current user open_id is configured, so auto-grant was skipped`。加协作者要走
`POST /open-apis/drive/v1/permissions/{token}/members`，实测缺 8 条 scope：
`drive:drive`、`drive:file`、`docs:doc`、`docs:permission.member:create`、`sheets:spreadsheet`、
`wiki:wiki`、`bitable:bitable`、`bitable:app`。已让用户先直接点链接试（只读就够，写由 bot 干）。

### 2026-09-14 21:25 — /board、/sync、自动同步全部接进桥（agent）

**用户侧结论**：用户直接点开 Base 链接**能看到**（只读就够 —— 写全部由 bot 干），所以可见性这一环
不需要再申请 drive scope。member-add 那条路留着，等真需要「你在 Base 里改闸门、回写 ticket 文件」时再走。

**桥里的接线**（都在 `bridge.ts`，`/board` `/sync` 已注册成飞书斜杠命令，面板约 5 分钟刷新）：

- `/board` → 只读快照（3s）→ 卡片：票总数/状态分布/按项目/run 台账/闸门数 + 两个按钮
  「🔄 同步」（callback）「🔗 打开看板」（`open_url`）。
- `/sync` → 先回一句「正在同步…」，再在**后台**同步，完成后单独发一条结果消息（不占那个会话的队列）。
- 卡片上的「🔄 同步」→ **同步完成后原位更新卡片**（实测 `board_sync_card {ok:true, syncOk:true, ms:5236}`）。
- **每轮 pi 之后自动同步**：比对 `.scratch/<feature>/issues/*.md` 的 mtime+size 指纹，变了才同步
  （实测 `board_synced {why: turn, ms: 4352}`）。
- **run 到终态时强制同步一次**：drain 的报告和 ticket 状态一起进表（`maybeSyncBoard(force)`）。
- 所有 Base 调用都在**子进程**里跑（`bun board.ts …`）：board.ts 用 spawnSync 调 lark-cli，
  放进桥的进程会卡住事件循环，而卡片回调只有约 3s 的 ack 窗口。

**性能修正（重要）**：第一版一条记录一次 `+record-upsert`，61 条约 3-5 分钟（每次 lark-cli 都是
node 冷启动），看起来像「卡住」。改成：先 list 出 record（原始 API，自己翻页）→ 算 diff →
`+record-batch-create` / `+record-batch-update`（100 条/批）只写变化的字段，删掉的 ticket 走
`batch_delete` 清理（按新加的 `仓库` 列限定范围，同步另一个仓库不会误删本仓库的行）。
实测：**无变化 5.4s，有变化 10s**（原来是分钟级）。

**又踩到的坑**：`lark-cli api --page-all` 会往 **stdout** 打 `[page 1] fetching…` 进度行，把 JSON 解析
搞崩（表现为 `✗ record-list`）；现在自己用 `page_token` 翻页，并让解析器在 JSON 前有杂音时从第一个
`{` 开始兜底。

**验证过的路径**：新建（42 票里新建 1）、更新（只有 1 条字段变了 → 更新 1）、清理（删掉票文件 →
`清理 1`）、读回字段值正确、卡片原位刷新、自动同步钩子、「无变化就完全不动」。

### 2026-09-14 21:24 — 视图也建好了（agent）

- **看板**（`vewuYMJi9M`, kanban）：按 `状态` 分组（实测 `_meta.group=[fldz7trmGq]`＝状态字段），
  BLOCKED/READY/RUNNING/MERGED 各多少一眼看到。
- **可开工**（`vewQTbz8BW`, grid）：筛选 `闸门 == ready-for-agent`＝下次 drain 会挑的票（当前 10 张）。
- 踩坑：`+view-create` 只吃 `{name,type}`，`property` 会报 `Unrecognized key(s)`（分组/筛选是建完再设）；
  `+view-set-filter` 对 **text 字段**的值必须写**标量**（`["闸门","is",["ready-for-agent"]]` 报
  `Only string values are supported`，改 `is "ready-for-agent"` 才过）。
- 还想加的：按项目过滤的视图（ticket 里写了，没做，因为已经有 `项目` 列在表内），以及
  「闸门写回」（要 drive scope + 你在 Base 里改才需要）。

