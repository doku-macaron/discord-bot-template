# Claude Code

This file is auto-loaded as project memory whenever Claude Code operates on this repo.

## Where to look first

- [AGENTS.md](AGENTS.md) — vendor-neutral project policy for agents. Lists all available skills.
- [CONTRIBUTING.md](CONTRIBUTING.md) — layer responsibilities, naming conventions, discord.js boundary rule.
- [README.md](README.md) — project description, sample commands, setup.

## Skills

Skills live at `.claude/skills/<name>/`, which are symlinks into `.agents/skills/<name>/`. They are discovered automatically. Prefer using a relevant skill over winging the workflow — they encode template conventions (`defineQuery`, `withTransaction`, `handleResult`, customId design, etc.).

Quick lookup for common tasks:

- DB schema change (tables / columns) → `drizzle-schema-change`
- Add a query to an existing table → `drizzle-add-query`
- Add slash command / context menu / button / modal / select menu / autocomplete → `discord-add-<kind>`

## House style

- Match the existing layer boundary. Never call DB queries from `src/events/` directly — go through `src/usecases/` when there's composition; for single queries the events layer can call them, but reading helper rules in [CONTRIBUTING.md](CONTRIBUTING.md) first is faster than re-deriving them.
- Prefer narrow PRs and logically-separated commits within a PR.
- Don't write comments unless they explain non-obvious _why_ (CONTRIBUTING-aligned defaults are not "why").
