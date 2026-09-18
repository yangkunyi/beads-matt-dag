# loom

Issue graph (beads) + three domains + a drain. One machine copy of the pack and
the skill set; a Target repo only keeps identity.

## Install (new machine)

Needs `git`, `curl`, `tar`. The script fetches the pinned tools (bun 1.4.2, bd
1.2.2, Archon v0.10.1) into `~/.loom/bin` and copies the skills.

```
git clone <this-repo>
cd beads-matt-dag
./install.sh
export PATH="$HOME/.loom/bin:$PATH"
```

Then `archon setup` for model credentials. An agent that reads
`~/.agents/skills` (pi, Claude Code, …) is the session; that is not bundled.

## New product repo

```
cd /path/to/repo    # git init first
loom init           # optional --prefix myapp
```

Open a session and type `/ask-loom`.
