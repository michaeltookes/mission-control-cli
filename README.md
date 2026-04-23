# `mc` — Mission Control CLI

A small Node CLI for agent-facing Mission Control operations. Talks HTTPS to
`genkeilabs.dev` (no DB credentials live on the agent host).

Replaces the previous in-tree MCP server (`mission-control/src/mcp/`, removed
2026-04-21).

## Install

```bash
npm i -g @michaeltookes/mission-control-cli
```

Requires Node 18+.

## Configure

```bash
mc config set api-url https://genkeilabs.dev
mc config set api-key $INGEST_API_KEY      # or rely on $MC_API_KEY env var
mc config set default-org coding-lab       # optional
mc completions zsh >> ~/.zshrc             # also: bash
```

Config file: `~/.mission-control/config.json` (override with `MC_CONFIG_PATH`).
Env vars `MC_API_KEY` and `MC_ORG` take precedence over config values.

## Commands

```bash
mc heartbeat --agent lucius-fox
mc status
mc tasks list --status in-progress
mc tasks get --id <uuid>
mc tasks create --title "Fix login bug" --priority P1
mc tasks update --id <uuid> --status done
mc tasks claim --id <uuid> --owner lucius-fox
mc projects list
mc projects create --slug my-proj --name "My project"
mc agents list
mc agents update-status --id <uuid> --status idle
mc backlog add --title "Investigate flaky retention test" --priority P2
mc events --since 2026-04-21T00:00:00Z
mc tail                                    # poll events, render one per line
mc tail --filter task.claimed,task.updated --json
mc config get api-url
mc config set default-org coding-lab
mc config list
```

Common flags:

- `--org <slug>` — overrides config `default-org` and `MC_ORG`
- `--json` — compact one-line JSON output (default: pretty)

These flags are available on most commands, but not every command. For example,
`mc completions` does not accept `--org` or `--json`.

Errors go to stderr; exit code 1 on failure.

## Auth (V1)

Single shared `INGEST_API_KEY`, mounted on each agent host. Adequate for the
current 3-agent fleet.

## Develop

```bash
pnpm install
pnpm dev          # tsup watch
pnpm test
pnpm completions  # regenerate completions/{mc.bash,mc.zsh}
```

`npm link` to test locally without publishing.

## License

MIT
