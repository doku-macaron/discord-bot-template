# Discord Bot Template with DB

**English** · [日本語](README.ja.md)

[![CI](https://github.com/doku-macaron/discord-bot-template/actions/workflows/ci.yml/badge.svg)](https://github.com/doku-macaron/discord-bot-template/actions/workflows/ci.yml)
[![Bun](https://img.shields.io/badge/Bun-1.3.11-black?logo=bun)](https://bun.sh/)
[![License](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)

Discord bot template built with Bun + discord.js + Drizzle ORM + PostgreSQL, structured as a **Bun + Turborepo monorepo**.

## Structure

```
apps/bot          @repo/bot        — the discord.js bot
packages/db       @repo/db         — drizzle schema, queries, migrations (Postgres)
packages/shared   @repo/shared     — Result<T,E> + kind-discriminated AppError
packages/scheduler @repo/scheduler — Discord/DB-free durable-scheduler core
```

Run everything from the repo root. The bot is the core; the **internal HTTP API** (`server/`) and the **durable scheduler** are opt-in (env flags, off by default) — see [Optional features](#optional-features).

## Use this template

Either click "Use this template" on GitHub or fetch the project with `degit`.

```sh
bunx degit doku-macaron/discord-bot-template my-bot
cd my-bot
bun install
```

Then customize the following for your own project:

- `name` in `package.json`
- Bot name, description, and command list in `README.md`
- `Copyright` line in `LICENSE` (if you keep Apache-2.0)
- Owners in `.github/CODEOWNERS`
- Sample items you don't need (`apps/bot/src/events/interactionCreate/commands/chatInput/items/`, `apps/bot/src/events/interactionCreate/commands/contextMenu/items/`, `apps/bot/src/events/interactionCreate/components/*/items/`)
- Image names and repository names in `.github/workflows/ci.yml` / `compose.yml` (if needed)
- Comments and defaults in `.env.example` (to match your production DB, webhook, and operations policy)

The development workflow is documented in [CONTRIBUTING.md](CONTRIBUTING.md). Going through PRs — both for changes to this template and changes in your derived project — keeps CI and review consistent.

## Requirements

- [Bun](https://bun.sh/)
- A Discord bot application
- Docker (for the local Postgres dev database) — or any PostgreSQL you point `DATABASE_URL` at

## Setup

```sh
bun install            # postinstall generates .env from .env.example
bun db:up              # start the dev Postgres (Docker)
bun db:migrate:local   # apply migrations
```

`.env` is generated on install. Fill in the Discord values:

```env
# Discord bot token from the Developer Portal.
TOKEN="Discord bot token"

# Discord application/client ID. Used for command registration and invite URLs.
CLIENT_ID="Discord application client ID"

# Optional development guild ID. When empty, bun register broadcasts to all bot guilds.
GUILD_ID="Optional: development guild ID"

# PostgreSQL connection URL (runtime). Defaults to the `bun db:up` Docker DB.
DATABASE_URL="postgres://discord_bot:discord_bot@localhost:5432/discord_bot"

# Optional Discord webhook URL for error reports.
WEBHOOK_URL="Optional: Discord webhook URL for error reports"
```

Optional features (`BOT_API_*`, `SCHEDULER_ENABLED`) are listed under [Optional features](#optional-features); they're off by default.

## Invite

Create a bot on the Discord Developer Portal and build the invite URL using `CLIENT_ID`.

```text
https://discord.com/oauth2/authorize?client_id=<CLIENT_ID>&scope=bot%20applications.commands&permissions=0
```

The template is centered on slash commands / context menus / component interactions, so the `applications.commands` scope is the important one at the minimum. If you add regular message sending or admin operations, add the corresponding bot permissions on the Developer Portal.

`apps/bot/src/client.ts` requests the `Guilds` and `GuildMembers` intents. Enable **Server Members Intent** on the Developer Portal's Bot settings. If your bot doesn't need member info, you can remove the `GuildMembers` intent and the sample code that depends on `interaction.member.displayName`.

## Development

In VSCode, you can use the recommended extensions in `.vscode/extensions.json`.

```sh
bun db:up              # start the dev Postgres (once)
bun db:migrate:local   # apply migrations
bun register           # push slash commands to Discord
bun dev                # run the bot with hot reload
```

`bun dev` hot-reloads the bot on file changes without a restart (it re-imports the event registry and swaps listeners). Editing an `items/` file or a usecase is picked up live.

When `GUILD_ID` is set, `bun register` registers commands only to that guild (instant propagation in the dev guild). When unset, it **fetches the bot's joined guilds from Discord REST `/users/@me/guilds` and broadcasts a guild-scope register to each one**.

Legacy global registration (up to 1 hour propagation) is gone. The operational model is: production deploys leave `GUILD_ID` unset and broadcast; development pins to a single dev guild by setting `GUILD_ID`.

For very large bots (thousands of guilds), be careful about `/users/@me/guilds` pagination and rate limits. The template only implements a straightforward serial PUT, aimed at small-to-medium bots.

## Docker

`compose.yml` brings up Postgres + the bot. The `Dockerfile` is multi-stage (`bot` and `tools` targets); compose selects the target per service.

```sh
docker compose build
docker compose --profile tools run --rm migrate    # apply migrations
docker compose --profile tools run --rm register   # push slash commands
docker compose up -d bot
docker compose logs -f bot
```

The PostgreSQL credentials in `compose.yml` are template-only fixed values. Replace them with a managed DB and secret management for production.

In production, complete migrations before the bot boots.

- Build the Docker image from `Dockerfile` and pass `DATABASE_URL` / `TOKEN` / `CLIENT_ID` as secrets
- Run `bun db:migrate` against the same image before deploying (if using CI, run a migrate job right before deploy)
- Logs in `NODE_ENV=production` are JSON line format, ready to pipe directly into a container log aggregator
- `docker stop` / rolling deploys trigger `SIGTERM` and a graceful shutdown
- `compose.yml` is for local verification. Adjust DB password, volumes, restart policy, and network for production

## Environment

Environment variables are validated per use case by `getEnv` in `apps/bot/src/env.ts`.

- `getEnv("bot")`: `TOKEN` required to start the bot
- `getEnv("register")`: `TOKEN` / `CLIENT_ID` / optional `GUILD_ID` for command registration
- `getEnv("botApi")`: `BOT_API_ENABLED` / `BOT_API_HOST` / `BOT_API_PORT` / `BOT_API_TOKEN` (opt-in HTTP API)
- `getEnv("scheduler")`: `SCHEDULER_ENABLED` (opt-in durable scheduler)
- `getEnv("webhook")`: optional `WEBHOOK_URL`

`DATABASE_URL` (+ optional `DATABASE_URL_MIGRATOR` / `DATABASE_URL_TEST`) is read directly from the environment by `@repo/db`.

## Commands

- `/ping`: bot heartbeat check
- `/echo <message>`: echoes the input (autocomplete sample)
- `/help`: lists commands as a paginated embed (pagination + String Select sample)
- `/profile view`: renders a profile with Container / Section / Thumbnail / Button accessory (Components v2 sample)
- `/profile edit`: edits and saves a profile bio through a modal
- `/showcase`: reference implementation for Components v2 (Container / Section + Thumbnail / Section + Button / MediaGallery / Separator / TextDisplay)
- `/showcase-modal`: reference implementation for Modal v2 (Checkbox / RadioGroup / CheckboxGroup / FileUpload + Label + TextInput)
- `/poll`: opens a modal to compose and post a Discord native Poll via `interaction.reply({ poll: ... })`
- `/timer`: opens a modal to set a reminder either after a duration or at a target time (handed to the `globalThis`-pinned timer **service** — survives hot reload, lost on process restart)
- `/admin report-user-select`: pick a user and report them (User Select sample)
- `/admin set-mod-role`: pick the mod role (Role Select sample)
- `/admin set-archive-channel`: pick the archive text channel (Channel Select sample)
- Context menu "Get user profile" (User): right-click a user to view their info
- Context menu "Report message" (Message): right-click a message to get its report ID and URL

## Interaction Structure

Interactions are split per kind under `apps/bot/src/events/interactionCreate/`:

- `commands/chatInput/items/`: slash commands
- `commands/contextMenu/items/`: user / message context menus
- `commands/autocomplete/items/`: autocompletes
- `components/button/items/`: buttons
- `components/modal/items/`: modals
- `components/selectMenu/items/`: select menus (string / user / role / channel / mentionable)

Each kind has a `registry.ts` that builds a fresh handler from its items:

```ts
// commands/chatInput/registry.ts
export const commandHandler = new CommandHandler();
commandHandler.register(pingCommand);
commandHandler.register(profileCommand);
// add new commands here — one line each
```

`setup.ts` assembles the six handlers into the dispatcher (`dispatchInteraction`); `index.ts` is a thin adapter that calls it; `scripts/registerCommand.ts` reads the command payloads from the registries. There are no `*Register.ts` files, no `*HandlerInstance.ts` singletons, and no `.clear()`.

For everyday development, add an item under the matching `items/` directory and add one `.register(...)` line to that kind's `registry.ts`. The framework-side implementations — handler classes, the dispatcher, subcommand helpers, the shared customId router, the client-event reloader — live under `apps/bot/src/framework/discord/`.

`apps/bot/src/events/guildCreate/` and `apps/bot/src/events/guildDelete/` keep the `guilds` table in sync as the bot joins and leaves. Leaves are soft-deletes that write a timestamp into `leftAt`; on rejoin, `joinedAt` resets and `leftAt` returns to null. The lazy populate path (`getOrCreateGuild` calls during command execution) is still there, so DB consistency holds even if you miss a gateway event.

`apps/bot/src/lib/discord/interactionContext.ts` and `apps/bot/src/lib/infra/logger.ts` emit command/customId/user/guild/channel/interactionId/ageMs into logs on error.
`NODE_ENV=production` produces JSON line format; development outputs a human-readable format.
If `WEBHOOK_URL` is set, the same content is also forwarded to a Discord webhook.

The recommended `customId` shape is `feature:action` or `feature:action:id`.
Group static IDs under `CUSTOM_ID` and matching regexes for dynamic IDs under `CUSTOM_ID_PATTERN`.
For single-process cooldown / rate-limiting, use `CooldownStore` and `createCooldownKey` from `apps/bot/src/lib/util/cooldown.ts`.

### Embed helpers

`apps/bot/src/lib/discord/embed.ts` exports `successEmbed` / `errorEmbed` / `infoEmbed` / `warnEmbed` for `EmbedBuilder`s with consistent colors.

### Pagination

`apps/bot/src/lib/discord/pagination.ts` provides `buildPaginationRow` to build a prev/next button row, plus `parsePaginationCustomId` + `nextPage` for button handlers to advance to the next page. See `/help` (`apps/bot/src/events/interactionCreate/commands/chatInput/items/help.ts`) and `helpPaginationButton` for a sample.

### Autocomplete

`/echo` is the autocomplete sample. Attach `.setAutocomplete(true)` to the option, define `new Autocomplete(commandName, execute)` under `apps/bot/src/events/interactionCreate/commands/autocomplete/items/`, and register it in `autocomplete/registry.ts`.

### Context menu

Place User / Message context menus under `apps/bot/src/events/interactionCreate/commands/contextMenu/items/`. Register `new ContextMenuCommand(build, execute)` in `contextMenu/registry.ts`, and `bun register` will push it to Discord alongside slash commands.

### Components v2

`/showcase` ([apps/bot/src/events/interactionCreate/commands/chatInput/items/showcase.ts](apps/bot/src/events/interactionCreate/commands/chatInput/items/showcase.ts)) and `/profile view` ([items/profile.ts](apps/bot/src/events/interactionCreate/commands/chatInput/items/profile.ts)) are the reference Components v2 implementations.

- Set `flags: MessageFlags.IsComponentsV2` when sending. `content` / `embeds` cannot be combined with it
- Using `ContainerBuilder` as the root lets you group an accent color with the child components
- `SectionBuilder.setThumbnailAccessory(...)` puts a thumbnail on the right; `SectionBuilder.setButtonAccessory(...)` places an interactive button. The button's customId is routed through `button/registry.ts` like any other button
- `MediaGalleryBuilder.addItems(...)` builds a URL-based image gallery; `SeparatorBuilder` controls dividers and spacing
- The file component (`FileBuilder`) carries attachments, but you still need `flags: MessageFlags.IsComponentsV2` when sending it alongside Components v2. Use the shape `interaction.reply({ flags: MessageFlags.IsComponentsV2, files: [...], components: [container] })`

**Where to pass the flag**: `IsComponentsV2` goes on the **message-send options** (`reply` / `editReply` / `followUp`). `deferReply`'s `flags` only accepts `Ephemeral`, so you can't pass it at the defer stage.

```ts
// Pattern 1: no heavy preprocessing, single reply — adopted by /showcase
await interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });

// Pattern 2: if DB work might exceed the 3-second window, defer → editReply with v2 — adopted by /profile view
await interaction.deferReply();
// ... DB work etc. ...
await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
```

`commandExecutor.ts`'s `runAsAsyncGenerator` follows the same model. Yielding `InteractionEditReplyOptions` like `yield { flags: MessageFlags.IsComponentsV2, components: [container] }` sends a v2 message.

### Select menus

Under `apps/bot/src/events/interactionCreate/components/selectMenu/items/`, you can place String / User / Role / Channel / Mentionable select menus. Define them with `new Menu(() => customId, execute)` and call `menuHandler.register(...)` in `selectMenu/registry.ts`. `MenuHandler` is internally a `CustomIdHandler<AnySelectMenuInteraction>`, so narrow with `interaction.isStringSelectMenu()` etc. inside `execute` to pull values out.

Four kinds are included as samples:

- `helpSectionSelectMenu` (String): section jump in `/help`
- `reportUserSelectMenu` (User): `/admin report-user-select`
- `modRoleSelectMenu` (Role): `/admin set-mod-role`
- `archiveChannelSelectMenu` (Channel, filtered by `ChannelType.GuildText`): `/admin set-archive-channel`

You can add Mentionable selects using `MentionableSelectMenuBuilder` with the same `Menu` class.

## Database

The database layer lives in `packages/db` (`@repo/db`), Postgres-only.

Schema files are `packages/db/src/schema/<name>.schema.ts` (`guilds` / `guild_settings` / `member_profiles`, plus `relations.ts`). They are **auto-collected** by a `Bun.Glob` barrel — adding a table is just adding a `*.schema.ts` file; no barrel or drizzle-config edit needed. Queries live under `packages/db/src/query/<domain>/` wrapped with `defineQuery`, which injects the global `db` so each body receives a `client: DbClient` and never reaches for the global directly; inside `withTransaction` the same `tx` flows into every query. (Files inside the package use relative imports, not `@/`.)

Usecases return `Result<T, AppError>` (`@repo/shared`); at the call site `handleResult` (`@/lib/discord/resultHandler`) logs and replies, branching on the AppError `kind`. `withTransaction` (`@repo/db/transaction`) wraps transaction failures into a `Result`.

```sh
bun db:up            # start the dev Postgres (Docker)
bun db:generate      # generate a migration from the schema
bun db:migrate:local # apply migrations to the dev DB
bun db:seed:local    # seed sample guild/member rows
bun db:reset:local   # truncate app tables
bun db:studio        # open Drizzle Studio
```

The ER diagram can be regenerated to `packages/db/docs/schema_diagram.md` with `bun generateERdiagram`.

### Production migration

In production, commit a migration file via `bun db:generate` on every PR that changes the schema, and run `bun db:migrate` before deploying.

- Always review the `packages/db/drizzle/` diff produced by `bun db:generate` locally
- Run `bun db:migrate` against the production `DATABASE_URL` before deploying (if running from CI, place the migrate job immediately before deploy)
- Migrations are expected to be complete before the bot boots. The bot does not run migrations automatically.

The recommended rollback approach is **forward-only**.

- Don't delete entries from `packages/db/drizzle/` to revert
- If you need to revert a change, generate a new migration that reverses it
- Stage schema and code compatibility incrementally (e.g. add column → start writing in code → switch reads → drop old column)

## Optional features

The bot is the core. Two heavier modules ship in the template but are **opt-in** via env flags (off by default), each started from one line:

### Internal HTTP API (`server/`)

A minimal Hono server under `apps/bot/src/server/`: unauthenticated `/health` + `/ready`, and a bearer-authenticated `/api/ping` behind a `deps.ts` dependency-injection seam. Useful for liveness/readiness probes and cross-service calls.

```env
BOT_API_ENABLED="true"
BOT_API_PORT="8080"
BOT_API_TOKEN="a-secret-token"   # required when enabled
```

`/ready` returns 503 until the Discord client is ready. On shutdown the server stops accepting before the client is destroyed. To remove it: delete `apps/bot/src/server/` and the `if (botApiEnv.BOT_API_ENABLED) ...` line in `index.ts`.

### Durable scheduler

A DB-backed scheduler: the Discord/DB-free core is `packages/scheduler` (`@repo/scheduler`); the bot hosts a worker (`apps/bot/src/jobs/`) that claims due jobs with `FOR UPDATE SKIP LOCKED`, runs them, and finalizes/reschedules. Job runs and a lease (for stale recovery) are tracked in `scheduled_jobs` / `job_runs`.

```env
SCHEDULER_ENABLED="true"   # requires Postgres
```

When enabled, `clientReady` seeds the built-in jobs and starts the worker. The template ships one example, `builtin:uptime` (logs the process uptime every 30 min). To add a job, use the `scheduler-add-job` skill: define a constant in `apps/bot/src/jobs/builtInJobs.ts`, write a `ScheduledJobHandler` under `jobs/handlers/`, register it in `botJobRegistry.ts`, and seed it in `seedBuiltInJobs.ts`. To remove the feature: delete `apps/bot/src/jobs/` + `packages/scheduler/` and the gate in `clientReady`.

## Error reporting

`apps/bot/src/lib/infra/errorReporter.ts` provides a pluggable hook for an external error tracker (Sentry, etc.). `captureException` runs every time `logger.error` is called and does nothing by default.

To use Sentry, swap the reporter at startup.

```ts
import * as Sentry from "@sentry/bun";
import { setErrorReporter } from "@/lib/infra/errorReporter";

Sentry.init({ dsn: process.env.SENTRY_DSN });
setErrorReporter({
    captureException: (error, context) => {
        Sentry.captureException(error, { tags: { category: context?.category } });
    },
});
```

If the reporter throws / rejects, the failure is not propagated to the caller (to avoid compounding webhook and log failures).

In real projects, create an initializer file that's imported from `apps/bot/src/index.ts` and call `Sentry.init(...)` and `setErrorReporter(...)` from there, so the reporter is swapped exactly once at startup. The template doesn't include `SENTRY_DSN` in the env schema — add it to `apps/bot/src/env.ts` to match the tracker you adopt.

## Graceful shutdown

On `SIGINT` / `SIGTERM`, `runShutdown` in `apps/bot/src/lib/infra/shutdown.ts` waits for in-flight interactions, then closes the Discord client and the DB in order.

- In-flight wait timeout: 10 seconds (default)
- Per-task timeout: 5 seconds (default)
- Register additional close tasks via `registerShutdownTask({ name, priority?, run })`
- Tasks run in ascending `priority` order (default 100). The presets are `SHUTDOWN_PRIORITY.JOBS` (10) → `BOT_API_SERVER` (90) → `DISCORD_CLIENT` (100) → `DATABASE` (200): stop the scheduler worker first, then the HTTP API, then close client / DB in that order.

This keeps interactions and DB transactions in flight from being dropped during PM2 reloads or `docker stop`.

## Tests

`bun run test` runs every package's tests via Turborepo. The default unit/structure tests need no database; Postgres-backed usecase tests use `createTestDb` (`@repo/db/testing/testDb`, needs `DATABASE_URL_TEST`). For testing Discord interaction handlers, the mock helpers in `apps/bot/src/lib/testing/interactions.ts` build interaction objects for you.

```ts
import { createCommandInteractionMock, type MockReplyPayload } from "@/lib/testing/interactions";

const replies: Array<MockReplyPayload> = [];
const interaction = createCommandInteractionMock("ping", replies);

await handler.execute(interaction);

expect(replies).toEqual([]);
```

- `createCommandInteractionMock(name, replies, options?)`: slash command interaction (only `reply`)
- `createRichCommandInteractionMock(name, records, options?)`: records `reply` / `editReply` / `followUp` / `deferReply` and mocks `options.getSubcommand[Group]`. Use this when testing the AsyncGenerator path of `commandExecutor` or `replyError`'s fallback branches
- `createCustomIdInteractionMock(customId, replies, options?)`: button / modal / select menu interaction
- `createContextMenuInteractionMock(name, replies, options?)`: user / message context menu interaction
- `createAutocompleteInteractionMock(commandName, recorder, options?)`: autocomplete interaction
- `createKindInteractionMock(kind, overrides?)`: minimal mock that only toggles the `interaction.isXxx()` guards. Useful for testing branches of `buildInteractionContext`.

See `apps/bot/src/framework/discord/interactions/{chatInput,contextMenu,autocomplete,components}/__tests__/`, `apps/bot/src/lib/discord/{replyError,resultHandler,interactionContext,embed,pagination}.test.ts`, `apps/bot/src/lib/infra/{errorWebhook,errorReporter,shutdown}.test.ts`, and `apps/bot/src/lib/util/{result,cooldown}.test.ts` for real examples.

## Scripts

- `bun dev`: start the bot in development (hot reload)
- `bun start`: start the bot in production
- `bun register`: register slash commands
- `bun db:up` / `bun db:down`: start / stop the dev Postgres (Docker)
- `bun db:generate` / `bun db:migrate:local` / `bun db:seed:local` / `bun db:reset:local` / `bun db:studio`: DB workflow
- `bun run check:no-save`: Biome check
- `bun run check:tsc`: TypeScript check (all packages, via Turborepo)
- `bun run test`: tests (all packages, via Turborepo)
