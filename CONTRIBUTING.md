# Contributing

This repository is maintained through pull requests.

## Workflow

1. Update `main`.

    ```sh
    git switch main
    git pull --ff-only origin main
    ```

2. Create a feature branch.

    ```sh
    git switch -c feat/my-change
    ```

3. Keep changes focused and commit them with a short message.

4. Run checks before pushing (all delegate through Turborepo from the repo root).

    ```sh
    bun run check:no-save
    bun run check:tsc
    bun run test
    ```

5. Push and open a pull request to `main`.

## Monorepo layout

Bun workspaces + Turborepo. Run everything from the repo root.

- `apps/bot` (`@repo/bot`) — the discord.js bot. Path alias `@/*` = `apps/bot/src/*`.
- `packages/db` (`@repo/db`) — drizzle schema, queries, transactions, migrations (Postgres-only).
- `packages/shared` (`@repo/shared`) — `Result<T, E>` and the kind-discriminated `AppError`.
- `packages/scheduler` (`@repo/scheduler`) — Discord/DB-free durable-scheduler core.

**Imports inside a package use relative paths (`./`, `../`), not `@/`.** A package's `@/` alias only resolves under its own `tsconfig`; a cross-package consumer (e.g. the bot type-checking `@repo/db` source) resolves `@/` against *its own* paths, so package source must be relative. The `@/` alias is only for `apps/bot` source (and a package's own scripts, which nothing imports).

## Layer responsibilities

New code goes into the directory that matches its responsibility.

- `apps/bot/src/events/` — Discord event adapters. The boundary that receives `Interaction`, `Guild`, `Message`, etc. and hands work off. Item files live under `events/interactionCreate/.../items/`.
- `apps/bot/src/framework/` — Reusable framework primitives (interaction handlers, dispatcher, the client-event reloader). No app-specific behavior.
- `apps/bot/src/service/` — Stateful, Discord-aware orchestrators that need cross-event state (e.g. in-memory registries, per-key locks). State is pinned to `globalThis`; the `Client` is passed in as a parameter.
- `apps/bot/src/usecases/` — Application behavior. **Discord.js-free**: receives primitives, returns `Result<T, AppError>`.
- `apps/bot/src/jobs/` — Durable scheduled-job handlers + the worker host (opt-in; see below).
- `apps/bot/src/server/` — Optional internal Hono HTTP API (opt-in; see below).
- `apps/bot/src/lib/` — Cross-cutting helpers (logging, result handling, Discord formatting, infra glue).
- `packages/db/src/query/` — Persistence. Drizzle queries via `defineQuery`.

### Dependency direction

One-directional. Higher layers reference lower layers; the reverse is not allowed.

```txt
events    -> service, usecases, framework
service   -> usecases, @repo/db, lib
usecases  -> @repo/db, @repo/shared, lib
framework -> lib
```

- `framework/` MUST NOT import from `events/`, `service/`, or `usecases/`.
- `usecases/` MUST NOT import from `events/` or `service/`, and MUST NOT touch discord.js.
- Items / registries under `events/` consume `framework/` through its barrel exports (e.g. `@/framework/discord/interactions/chatInput`), not deep paths.

### discord.js stays at the boundary

Do not pass discord.js objects (`Interaction`, `Guild`, `Message`, builders) into `usecases/`. The events layer extracts the values a usecase needs and feeds them in as primitives or plain DTOs; the usecase returns plain data, and the caller translates that back into a reply / builder. This keeps usecases testable without mocking discord.js.

Services are the one place a `Client` is allowed below events — but it is **passed as a parameter**, never imported, so the service stays testable with a fake client.

## Error handling: `Result<T, AppError>`

- New usecases return `Result<T, AppError>` (from `@repo/shared` / `@repo/shared/error/appError`), not `Result<T, Error>`.
- `AppError` is a plain object discriminated by `kind`: `validation | not_found | permission_denied | external | rate_limited | unexpected`. Build it with `validationError(...)`, `notFoundError(...)`, etc., and wrap an unknown throw with `fromUnknownError("op failed", error)`.
- `classifyDiscordError(error)` (`@/lib/discord/discordApiError`) maps a Discord REST throw to the right `kind`.
- At the call site, `handleResult(result, interaction, options?)` (`@/lib/discord/resultHandler`) does the right thing per kind: expected kinds (validation / not_found / permission_denied / rate_limited) get a short user-facing reply + a `warn` log; the rest get the admin-share stack codeblock + `error` log. It returns the data on success and `null` after handling an error.

## Hot reload & state

`bun dev` hot-reloads the bot without a restart. Two rules keep that safe:

- **Client event handlers** are declared with `defineClientEvent(Events.X, listener)` and composed in `events/clientEventRegister.ts`. The initializer re-imports that module and the reloader detaches the old listeners before attaching the new ones — no duplicate handlers. Event modules must not have top-level `register(...)` side effects.
- **Module-scope state that must survive a reload** (a service's registry, the scheduler worker) is pinned to `globalThis` under a unique `Symbol.for(...)` key. A re-evaluated module reuses the pinned state instead of orphaning it.

## Interaction registration

Each interaction kind has a `registry.ts` (e.g. `events/interactionCreate/commands/chatInput/registry.ts`) that builds a fresh handler from its items:

```ts
export const commandHandler = new CommandHandler();
commandHandler.register(pingCommand);
// add new commands here, one line each
```

`setup.ts` assembles the six handlers into the dispatcher; `scripts/registerCommand.ts` pushes the command payloads to Discord. To add an item: create it under `items/`, then add one `.register(...)` line to that kind's `registry.ts`. There are no `*Register.ts` files, no `*HandlerInstance.ts` singletons, and no `.clear()`.

## Naming conventions

- **Class file** uses the lowerCamelCase form of the class name (`commandHandler.ts` defines `CommandHandler`).
- **Barrel `index.ts`** in each interaction subdirectory re-exports the classes, so consumers import from `@/framework/discord/interactions/<kind>`.
- **UseCase** files: `<name>UseCase.ts`, exported function shares the stem (`saveMemberProfileUseCase`).
- **Service** files: `service/<domain>/<name>Service.ts`.
- **DB schema** files: `packages/db/src/schema/<name>.schema.ts` — auto-collected by a `Bun.Glob` barrel, so no manual barrel edit is needed (only `relations.ts` is hand-written).
- **Queries**: `packages/db/src/query/<domain>/<name>.ts` with `defineQuery`; `Pick<Insert*>` input types; `getOrCreate*` / `find*` / `update*` naming.

## Test placement

- Framework / routing tests under `apps/bot/src/framework/**/__tests__/`.
- Small utility / helper tests beside the module they cover.
- Scheduler-core tests in `packages/scheduler/src/*.test.ts`; shared tests in `packages/shared/src/*.test.ts`.
- Usecase tests prefer Postgres-backed integration via `createTestDb` (`@repo/db/testing/testDb`, needs `DATABASE_URL_TEST`) over broad `mock.module`. The default unit/structure tests don't need a database; `bun run test` works without one.

## Optional features (off by default)

The bot is the core. Two heavier modules are opt-in via env flags, started from one line each:

- **`server/`** (Hono internal API): `BOT_API_ENABLED=true` (+ `BOT_API_TOKEN`). Started in `index.ts`.
- **Scheduler** (`packages/scheduler` + bot worker): `SCHEDULER_ENABLED=true` (requires Postgres). Started in `clientReady`.

To remove one entirely, delete its folder (`apps/bot/src/server/`, or `apps/bot/src/jobs/` + `packages/scheduler/`) and the single `if (...) start…()` line.

## PR checklist

- The change is scoped to one purpose.
- Tests or docs were updated when behavior changed.
- `bun run check:no-save`, `bun run check:tsc`, and `bun run test` pass.
- Docker changes include `docker compose config` and `docker build --target bot .` verification.
- Schema changes include generated files in `packages/db/drizzle/` and a forward-only migration plan.
