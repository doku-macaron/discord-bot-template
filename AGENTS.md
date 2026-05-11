# Agents

This repository provides codified workflows ("skills") for AI coding agents working in the template. Skills are vendor-neutral so any agent that supports the [SKILL.md format](https://github.com/anthropic-experimental/skills-spec) (or a compatible one) can consume them.

## Layout

- **`.agents/skills/<name>/SKILL.md`** — canonical, vendor-neutral skill files. The source of truth.
- **`.claude/skills/<name>`** — relative symlinks to `.agents/skills/<name>`, so Claude Code discovers skills at its expected path without duplicating content.
- Other agents should point their skill loader at `.agents/skills/`. Codex reads `.agents/skills/` directly.

When adding a new skill: write it under `.agents/skills/<name>/SKILL.md`, then `ln -s ../../.agents/skills/<name> .claude/skills/<name>` so Claude Code picks it up.

## Available skills

| Skill | Use when |
|-------|----------|
| `drizzle-schema-change` | テーブル / カラムを追加・削除・リネームする (schema 自体を触る) |
| `drizzle-add-query` | 既存テーブルに query を 1 つ追加するだけ (schema 変更なし) |
| `discord-add-chat-input` | slash command (`/foo`) を追加する |
| `discord-add-context-menu` | User / Message 右クリック context menu を追加する |
| `discord-add-button` | button component を追加する |
| `discord-add-modal` | modal フォームを追加する |
| `discord-add-select-menu` | select menu (string / user / role / channel / mentionable) を追加する |
| `discord-add-autocomplete` | slash command option に autocomplete を付ける |

## Project conventions

Layer responsibilities, naming, and the discord.js boundary rule are in [CONTRIBUTING.md](CONTRIBUTING.md). Skills assume those conventions and reference them where relevant.

Key rules in short:

- **Layers**: `events/` → `usecases/` → `db/query/` → drizzle. `framework/` is reusable primitives. `lib/` is cross-cutting helpers.
- **No discord.js in `usecases/`** — events extract primitives before calling usecases.
- **All queries go through `defineQuery`** at `src/db/query/defineQuery.ts`. The body never imports `db` directly.
- **Multi-query writes use `withTransaction`** at `src/db/transaction.ts` and pass `tx` to each query.
- **Tests**: framework / routing under `src/framework/**/__tests__/`, small unit tests beside the module they cover, see CONTRIBUTING.md for the full policy.

## Agent-specific notes

- **Claude Code**: see [CLAUDE.md](CLAUDE.md) for the Claude-specific preamble (auto-loaded into context).
- **Codex**: configuration TBD. The skills themselves are agent-agnostic.

## Adding a new agent

1. Decide where the agent expects skills.
2. Either point it at `.agents/skills/` directly (preferred), or create another symlink directory (`.<agent>/skills`) under the same pattern as `.claude/skills/`.
3. Add a one-line entry for the agent under "Agent-specific notes" above.
