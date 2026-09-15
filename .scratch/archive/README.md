# archive

已结束的 effort 放这里：**只读历史，不再维护**。

## 约定

- 一个已结束的 effort 一个目录：`.scratch/archive/<feature-slug>/`，内部结构与活跃 effort 相同
  （`README.md` + `issues/NN-*.md`）。
- 归档 = **移出** `.scratch/<feature-slug>/`。`.scratch/*/issues/*.md` 这类扫描（Orchestrator、票板镜像）
  不会再看到它；ticket 里的 `Status:` 保持当时的值，作为历史，不改写。
- 每个归档目录必须有一份 `RETRO.md`：做成了什么 / 为什么停 / 保住了什么 / 怎么复活。
- ticket 顶部带一行归档横幅，指向 `RETRO.md`。

## 已归档

| effort | 结束于 | 判定 |
| --- | --- | --- |
| [feishu-bridge](./feishu-bridge/RETRO.md) | 2026-09-14 | **失败**：飞书适合推送，不适合当工作台；工作台改用 agegr/pi-web |
