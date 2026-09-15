# runtime（归档快照）

真实部署在 `~/.local/share/feishu-pi-bridge/`；这里只是**快照**，让这次尝试可读、可复活。
快照时间：2026-09-14 22:45（归档时）。

| 文件 | 行数 | 说明 |
| --- | --- | --- |
| `bridge.ts` | 3 488 | 桥本体：lark-cli 事件消费（`im.message.receive_v1` / `card.action.trigger` / `application.bot.menu_v6`）、卡片、picker、话题群绑定、run watcher、`/board` 与 `/sync` |
| `board.ts` | 468 | markdown → Base 单向镜像（票板 + run 台账），批量 diff 写入 |
| `pi-rpc.ts` | 367 | `pi --mode rpc` 常驻客户端 |

**没有**收进来的（留在原地）：`state.json`（绑定 / 会话 / 卡片键）、`config.json`（appId / open_id 白名单 / chat id）、
`bridge.log`、6 个 `bridge.ts.bak-*`（改票期间的中间备份）。

复活依赖：上面的 `config.json` + `state.json`、lark-cli profile `archon-bridge`、
unit `~/.config/systemd/user/feishu-pi-bridge.service`。

```bash
systemctl --user start feishu-pi-bridge
```
