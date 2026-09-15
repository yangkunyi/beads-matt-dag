SOURCE-URL: https://kiro.dev/docs/crew/features/multi-instance.md
FETCHED: 2026-09-14 via curl (research agent 04)

> ## Documentation Index
> Fetch the complete documentation index at: https://kiro.dev/llms.txt
> Use this file to discover all available pages before exploring further.

# Multi-instance

> Manage many remote Crew instances from one hub over SSH tunnels. Warm set, self-healing, owner-only control plane.

Run Crew on several remote hosts — dev boxes, EC2 instances, home servers — and drive them all from one hub gateway. Multi-instance opens SSH tunnels to each remote, mints short-lived dashboard tokens, and embeds each remote dashboard in a tab strip. The most-recently-used instances stay warm; the rest reconnect on demand.

Opt-in. Off by default.

## Chat on a connected crew (Preview)

A remote Crew chat is separate from opening a remote dashboard. Enable multi-instance support in [Configuration](https://kiro.dev/docs/crew/configuration.md), then turn on **Settings → Developer → Feature Previews → Chat on a crew**.

Open the new-chat menu in the sidebar and choose **New chat on crew**, then choose a connected crew. The transcript stays on your local Crew while each turn runs on the selected crew.

Remote sessions show the server badge and the crew name in the sidebar, so you can identify where their turns run. Crew reconnects automatically on app load and when the tab regains focus. To change that behavior, open **Settings → Remote Instances → Auto-connect crews**.

## Enable it

```bash
kirocrew config set instances.enabled true
kirocrew restart
```

When enabled, the gateway:

1. Creates the instances registry + `SshTunnelManager`
2. Scopes a CSP `frame-src` relaxation to the active loopback tunnel ports (so embedded remote dashboards can render — they're otherwise blocked by the strict `frame-src 'self' blob:`)

With the flag off, `/api/instances/*` returns 403 and the `/instances` page shows an opt-in hint.

## How it works

```
 ┌── Hub gateway (this host) ──┐
 │  /instances page (React)     │
 │  ├─ tab strip: Home · A · B  │
 │  ├─ warm <iframe>s per tab   │  http://127.0.0.1:<local_port>/?token=…
 │  └─ Manage panel             │  add / connect / diagnose / restart / remove
 │                              │
 │  instances/ package          │
 │  ├─ registry                 │  ~/.kiro/crew/instances.json
 │  ├─ port_allocator           │  loopback ports from base 7778
 │  ├─ token_mint               │  ssh <host> kirocrew token → JWT (never logged)
 │  ├─ ssh_tunnel_manager       │  supervised ssh -N -L, probe, self-heal, refresh
 │  └─ diagnostics              │  ssh → remote-dashboard → local-forward ladder
 └──────────────────────────────┘
         │ ssh -N -L 127.0.0.1:<local>:127.0.0.1:<remote>
         ▼
 ┌── Remote gateway ────────────┐
 │  kirocrew gateway bound to    │
 │  127.0.0.1:<remote_port>      │
 └──────────────────────────────┘
```

Each instance you add produces a supervised `ssh -N -L` child. The tunnel forwards `127.0.0.1:<local>` → remote `127.0.0.1:<remote>`. The hub mints a dashboard token on the remote over SSH and embeds the remote dashboard in an iframe at the loopback URL.

## The lifecycle

1. **Connect** — `POST /api/instances//connect` allocates a loopback port, mints a token on the remote over SSH, starts `ssh -N -L`, waits until the local forward accepts a connection, then returns the live status
2. **Warm set** — by default the warm set sizes itself automatically for eligible instances, capped at 8; set `instances.warm_set_cap` to a positive value for a fixed limit. Warm instances keep a live tunnel + WebSocket. Connecting beyond the cap lazily evicts the least-recently-used
3. **Health probe** — while connected, a probe polls the loopback forward every 30 s; after 3 consecutive failures it tears the child down so recovery fires
4. **2-tier self-heal** — on unexpected exit: tier 1 rebuilds the tunnel reusing the existing token; tier 2 re-mints the token then rebuilds. Capped at 8 attempts with capped-exponential backoff (~2 min window)
5. **Proactive token refresh** — a per-instance loop re-mints the token at 0.8 of its TTL, ahead of the ~20h cap
6. **Diagnose / restart** — `?diagnose=1` runs a failure-probe ladder on demand; `POST .../restart` restarts the remote gateway over SSH

## Adding an instance

Open **Instances** in the dashboard, click **Add**, fill in:

| Field | Description |
|---|---|
| **Name** | Any label (e.g. "Dev box 1") |
| **SSH host / alias** | What you'd type after `ssh` — see below |
| **Remote port** | Remote gateway's port (default `7777`) |
| **Token TTL** | Default 20 h |

The `ssh_host` field accepts:

- A hostname or FQDN (`dev-1.example.com`)
- A user + host (`ec2-user@10.0.1.5`)
- An SSH config alias (`my-ec2`)

Any option starting with `-` is rejected (injection guard).

## Remote host types

The only per-remote knob is `ssh_host`. Anything `ssh` can reach non-interactively works.

### Dev host / home server

Use your SSH config alias or `user@hostname`. As long as a key in your `ssh-agent` covers auth, `BatchMode` succeeds without prompting.

### EC2 and other key-based hosts

Configure an SSH alias in `~/.ssh/config` on the hub, then reference the alias:

```
Host my-ec2
  HostName ec2-1-2-3-4.compute-1.amazonaws.com
  User ec2-user
  IdentityFile ~/.ssh/my-key.pem
  # Optional: reach a private instance through a bastion
  ProxyJump bastion-host
  # Or via SSM Session Manager:
  # ProxyCommand sh -c "aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters portNumber=%p"
```

Then add an instance with `my-ec2` as the SSH host.

Prerequisites on the hub:

- A passphrase-less key or an `ssh-agent` holding it (`BatchMode` won't prompt)
- `kirocrew` installed and a gateway running on the EC2 instance's loopback port

### What's supported

| Need | Status | How |
|---|---|---|
| Custom login user | ✅ | `user@host` or ssh-config `User` |
| FQDN / IP | ✅ | direct `ssh_host` value |
| Identity file (`-i`) | ⚠️ via ssh config only | `IdentityFile` in a `Host` block |
| Non-22 SSH port | ⚠️ via ssh config only | `Port` in a `Host` block |
| Bastion / ProxyJump | ⚠️ via ssh config only | `ProxyJump` / `ProxyCommand` |
| SSM-only instances | ⚠️ via ssh config only | `ProxyCommand` with `aws ssm start-session` |

## Managing instances

The Manage panel gives you these per-instance actions:

- **Connect** — open a tunnel + iframe
- **Disconnect** — tear down the tunnel
- **Diagnose** — run the failure-probe ladder and report the first broken link
- **Restart** — restart the remote gateway over SSH (service-aware)
- **Edit** — change name / host / port / TTL
- **Remove** — disconnect then delete

## Security model

Every route in `/api/instances/*` is gated by `_guard()`:

- **Deny-by-default** — reject Slack-origin requests (403)
- **Owner-only** — require `request["user"]` (authenticated dashboard session)
- **Feature-gated** — require `instances.enabled: true`
- **SEL-audited** — every call (success and denial) emits an audit event

Beyond the guard:

- **Loopback-only forwards** — `ssh -N -L 127.0.0.1:<local>:127.0.0.1:<remote>`
- **No local shell** — `ssh` is always invoked with an argv list; `ssh_host` cannot inject local shell syntax
- **Charset-validated inputs** — `ssh_host` and `remote_bin` rejected if they contain shell metacharacters or lead with `-`
- **Short-lived tokens** — ≤20 h, returned only in-memory to the caller, never logged, never in list/status payloads
- **postMessage origin check** — the parent validates every embedded-frame `event.origin` against the exact `http://127.0.0.1:<port>` of a currently-warm tunnel before trusting an unread-count message

## Configuration

For `instances.enabled` and the other multi-instance settings, see [Configuration](https://kiro.dev/docs/crew/configuration.md).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `/instances` shows "multi-instance management is off" | `instances.enabled` is false — set it and restart |
| Iframe is blank | CSP `frame-src` relaxation only applies to active tunnel ports; ensure the instance is **connected** |
| Connect fails with SSH auth error | Refresh your SSH credentials (re-add key to `ssh-agent`); tunnels self-heal once SSH is restored |
| Connect fails | Use **Diagnose** — the ladder reports the first broken link (`ssh_unreachable`, `remote_down`, or `tunnel_down`) |
| Instance keeps dropping | Health probe + 2-tier self-heal retry over ~2 min; if it gives up, diagnosis runs automatically. Check the remote gateway and SSH stability |
| An instance silently disappeared from the warm set | LRU-evicted (warm set full). Raise `instances.warm_set_cap` or reconnect on demand |
