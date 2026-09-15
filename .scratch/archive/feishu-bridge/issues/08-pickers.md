# 08 — 选择卡：技能可点可搜、项目可切换/粘路径

> **ARCHIVED 2026-09-14** — 本 effort 判定失败，已归档（不再维护）。原因与复活方式见 [`../RETRO.md`](../RETRO.md)。

Status: RUNNING
Blocked by: 02 (done), 04 (done)

## 为什么

手打 `/skill:grill-me` 太麻烦（尤其手机上），项目路径也记不住，多项目切换是 `/use <名字>` 一次手打一次。
飞书里能点的东西就该点。

## 做成什么

两条命令各开一张卡（Card 2.0），`/use` 不带参数也开项目卡：

- `/skills` → **🧩 技能选择卡**
  - 一页 6 个按钮，按钮文字 = `▶ 名字 ⚠️ — 描述`，**点一下就等于手打 `/skill:<名字>`**
    （走的是 `handleMessage` 同一条管线：同一个 session、同一个队列、同一个进度消息）。
  - `补充说明（可选）` 输入框 → 附在技能名后面当参数（`/skill:grill-me 聚焦手机端`）。
  - `搜技能` 输入框 + `🔍 搜索` 按钮 → 按名字/描述过滤（就是"可检索"）。
  - `‹ 1/10 ›` 翻页（回调按钮，带当前搜索词）。
  - 排序：流程技能（ask-matt / grill-* / to-spec / to-tickets / implement / drain / triage / code-review / diagnosing-bugs）排最前，
    其余"必须显式打"（⚠️）的排在普通技能前面 —— 恰恰是这些最需要点按钮。
- `/projects` → **📁 项目选择卡**
  - 每个项目一行：名字 + 灰色路径 + `切到这个` 按钮（当前那个显示"已绑定"且禁用）。
  - 翻页；底部 `➕ 绑定这个路径` 表单：粘绝对路径即可绑，`~` 会展开，**git 仓库自动取仓库根**，
    非 git 目录会绑定但给一句警告（archon 工作流跑不了）。
  - 路径不存在时原地报错，不回显假成功。

## 证据（2026-09-14）

- 真机上用户自己点通了：`/skills` → 搜 "grill" → 翻页 → 搜 "ask" → 点 `ask-matt` 按钮 →
  回复 `▶️ 开始 /skill:ask-matt` → pi 起 turn → 进度消息原地更新 → 943 字答案原地替换。
- `--picker-selftest`（真发卡 + 合成飞书同形状的点击事件）：
  - 绑路径：`/no/such/dir` → `路径不存在`；`/tmp/pi-uiprobe` → `project_bound` + 卡片刷新 + 非 git 警告。
  - 翻页、搜索：`picker_skills q=grill ok:true`、`picker_projects page=2 ok:true`。
  - 技能：`picker_skill_run skill=caveman note=按钮自测` → pi turn 跑完（491-943 字）。
- 两个 Card 2.0 坑（都踩了，值得记）：
  1. `markdown` **没有** `horizontal_align`（那是 column_set 的字段）→ 服务器 `200621 parse card json err`，
     正确字段是 `text_align`；`text_size` 也没有 `small`，要用 `notation`。
  2. 卡片发送失败的报错原来只截 300 字符，正好截在 `unknown property, propert` —— 已放宽到 900，
     不然根本看不出是哪个属性错了。
- 体验修正：一开始"关键词/补充说明"共用一个输入框，结果搜索词会被当参数带上（点 ask-matt 变成
  `/skill:ask-matt ask`）→ 拆成两个输入框，各管一件事。

## 还欠

- 机器人自定义菜单（飞书控制台的"快捷菜单"）可以把「选项目/选技能」钉在输入框上方 —— 需要人在控制台点，
  斜杠面板（`/projects`、`/skills`）已经够用，没做。
- 卡片里没有"搜索无结果 → 改成从全部里挑"的兜底提示文案（现在只显示"没匹配到"）。
