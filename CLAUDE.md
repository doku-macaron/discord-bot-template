# Claude Code

This file is auto-loaded as project memory whenever Claude Code operates on this repo.

## Monorepo layout

Bun workspaces + Turborepo. Run everything from the repo root.

- `apps/bot` (`@repo/bot`) — the discord.js bot. Path alias `@/*` = `apps/bot/src/*`.
- `packages/db` (`@repo/db`) — drizzle schema, queries (`defineQuery`), `withTransaction`, migrations. Postgres-only.
- `packages/shared` (`@repo/shared`) — `Result<T,E>` and the kind-discriminated `AppError`.
- `packages/scheduler` (`@repo/scheduler`) — Discord/DB-free durable-scheduler core.

Inside a package, files use **relative** imports (not `@/`) because cross-package consumers can't resolve another package's `@/` alias.

## Where to look first

- [AGENTS.md](AGENTS.md) — vendor-neutral project policy for agents. Lists all available skills.
- [CONTRIBUTING.md](CONTRIBUTING.md) — layer responsibilities, dependency direction, discord.js boundary, AppError, hot-reload rule, naming.
- [README.md](README.md) — setup, commands, optional features.

## Skills

Skills live at `.claude/skills/<name>/`, which are symlinks into `.agents/skills/<name>/`. They are discovered automatically. Prefer using a relevant skill over winging the workflow — they encode template conventions (`defineQuery`, `withTransaction`, `handleResult`, the per-kind `registry.ts` registration, the `globalThis`-pinned service pattern, etc.).

Quick lookup for common tasks:

- DB schema change (tables / columns) → `drizzle-schema-change`
- Add a query to an existing table → `drizzle-add-query`
- Add slash command / context menu / button / modal / select menu / autocomplete → `discord-add-<kind>`
- Add application logic (discord.js-free, returns `Result<T, AppError>`) → `usecase-add`
- Add a stateful Discord-aware service (`globalThis`-pinned, hot-reload-safe) → `service-add`
- Add a durable scheduled job → `scheduler-add-job`

## House style

- Match the layer boundary. Events never call `@repo/db` queries for composed writes — go through `apps/bot/src/usecases/` (discord.js-free, `Result<T, AppError>`); a single read can be a thin-wrapper usecase. See [CONTRIBUTING.md](CONTRIBUTING.md).
- Interaction items are registered by adding one `.register(item)` line to the kind's `registry.ts` (no `*Register.ts`, no singletons, no `.clear()`).
- `server/` (Hono API) and `scheduler` are **opt-in** (env flags, default off). Don't wire features into them unless asked.
- Prefer narrow PRs and logically-separated commits within a PR.
- Don't write comments unless they explain non-obvious _why_ (CONTRIBUTING-aligned defaults are not "why").
