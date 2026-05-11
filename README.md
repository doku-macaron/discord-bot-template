# Discord Bot Template with DB

**English** · [日本語](README.ja.md)

[![CI](https://github.com/doku-macaron/discord-bot-template/actions/workflows/ci.yml/badge.svg)](https://github.com/doku-macaron/discord-bot-template/actions/workflows/ci.yml)
[![Bun](https://img.shields.io/badge/Bun-1.3.11-black?logo=bun)](https://bun.sh/)
[![License](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)

Discord bot template built with Bun + discord.js + Drizzle ORM + PostgreSQL/PGlite.

Local development uses PGlite, so you can run a database-backed bot without spinning up a PostgreSQL server. In production, set `DATABASE_URL` to a PostgreSQL connection string.

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
- Sample items you don't need (`src/events/interactionCreate/commands/chatInput/items/`, `src/events/interactionCreate/commands/contextMenu/items/`, `src/events/interactionCreate/components/*/items/`)
- Image names and repository names in `.github/workflows/ci.yml` / `compose.yml` (if needed)
- Comments and defaults in `.env.example` (to match your production DB, webhook, and operations policy)

The development workflow is documented in [CONTRIBUTING.md](CONTRIBUTING.md). Going through PRs — both for changes to this template and changes in your derived project — keeps CI and review consistent.

## Requirements

- [Bun](https://bun.sh/)
- A Discord bot application
- A PostgreSQL-compatible database for production

## Setup

```sh
bun install
cp .env.example .env
```

Set the Discord bot values in `.env`.

```env
# Discord bot token from the Developer Portal.
TOKEN="Discord bot token"

# Discord application/client ID. Used for command registration and invite URLs.
CLIENT_ID="Discord application client ID"

# Optional development guild ID. When empty, bun register broadcasts to all bot guilds.
GUILD_ID="Optional: development guild ID"

# Production PostgreSQL connection URL. Required for NODE_ENV=production and Docker.
DATABASE_URL="Production PostgreSQL URL"

# Local PGlite database path for NODE_ENV=development.
DATABASE_URL_DEV="./.pglite"

# Optional Discord webhook URL for error reports.
WEBHOOK_URL="Optional: Discord webhook URL for error reports"
```

## Invite

Create a bot on the Discord Developer Portal and build the invite URL using `CLIENT_ID`.

```text
https://discord.com/oauth2/authorize?client_id=<CLIENT_ID>&scope=bot%20applications.commands&permissions=0
```

The template is centered on slash commands / context menus / component interactions, so the `applications.commands` scope is the important one at the minimum. If you add regular message sending or admin operations, add the corresponding bot permissions on the Developer Portal.

`src/client.ts` requests the `Guilds` and `GuildMembers` intents. Enable **Server Members Intent** on the Developer Portal's Bot settings. If your bot doesn't need member info, you can remove the `GuildMembers` intent and the sample code that depends on `interaction.member.displayName`.

## Development

In VSCode, you can use the recommended extensions in `.vscode/extensions.json`.

```sh
bun generate:local
bun migrate:local
bun register
bun dev
```

When `GUILD_ID` is set, `bun register` registers commands only to that guild (instant propagation in the dev guild). When unset, it **fetches the bot's joined guilds from Discord REST `/users/@me/guilds` and broadcasts a guild-scope register to each one**.

Legacy global registration (up to 1 hour propagation) is gone. The operational model is: production deploys leave `GUILD_ID` unset and broadcast; development pins to a single dev guild by setting `GUILD_ID`.

For very large bots (thousands of guilds), be careful about `/users/@me/guilds` pagination and rate limits. The template only implements a straightforward serial PUT, aimed at small-to-medium bots.

## Docker

Docker is optional. Local development works fine on PGlite alone, but `compose.yml` is available if you want a production-like startup with PostgreSQL.

```sh
cp .env.example .env
docker compose build
docker compose run --rm migrate
docker compose run --rm register
docker compose up -d bot
docker compose logs -f bot
```

The PostgreSQL credentials in `compose.yml` are template-only fixed values. Replace them with a managed DB and secret management for production.

In production, complete migrations before the bot boots.

- Build the Docker image from `Dockerfile` and pass `DATABASE_URL` / `TOKEN` / `CLIENT_ID` as secrets
- Run `bun migrate` against the same image before deploying (if using CI, run a `migrate` job right before deploy)
- Logs in `NODE_ENV=production` are JSON line format, ready to pipe directly into a container log aggregator
- `docker stop` / rolling deploys trigger `SIGTERM` and a graceful shutdown
- `compose.yml` is for local verification. Adjust DB password, volumes, restart policy, and network for production

## Environment

Environment variables are validated per use case by `getEnv` in `src/env.ts`.

- `getEnv("bot")`: `TOKEN` required to start the bot
- `getEnv("register")`: `TOKEN` / `CLIENT_ID` / optional `GUILD_ID` for command registration
- `getEnv("postgres")`: `DATABASE_URL` for production DB
- `getEnv("pglite")`: `DATABASE_URL_DEV` for the local DB
- `getEnv("webhook")`: optional `WEBHOOK_URL`

## Commands

- `/ping`: bot heartbeat check
- `/echo <message>`: echoes the input (autocomplete sample)
- `/help`: lists commands as a paginated embed (pagination + String Select sample)
- `/profile view`: renders a profile with Container / Section / Thumbnail / Button accessory (Components v2 sample)
- `/profile edit`: edits and saves a profile bio through a modal
- `/showcase`: reference implementation for Components v2 (Container / Section + Thumbnail / Section + Button / MediaGallery / Separator / TextDisplay)
- `/showcase-modal`: reference implementation for Modal v2 (Checkbox / RadioGroup / CheckboxGroup / FileUpload + Label + TextInput)
- `/poll`: opens a modal to compose and post a Discord native Poll via `interaction.reply({ poll: ... })`
- `/timer`: opens a modal to set a reminder either after a duration or at a target time (in-memory `setTimeout`, lost on restart)
- `/admin report-user-select`: pick a user and report them (User Select sample)
- `/admin set-mod-role`: pick the mod role (Role Select sample)
- `/admin set-archive-channel`: pick the archive text channel (Channel Select sample)
- Context menu "Get user profile" (User): right-click a user to view their info
- Context menu "Report message" (Message): right-click a message to get its report ID and URL

## Interaction Structure

Interactions are split per kind into separate handler/register pairs.

- `src/events/interactionCreate/commands/chatInput/items/`: slash commands
- `src/events/interactionCreate/commands/contextMenu/items/`: user / message context menus
- `src/events/interactionCreate/commands/autocomplete/items/`: autocompletes
- `src/events/interactionCreate/components/button/items/`: buttons
- `src/events/interactionCreate/components/modal/items/`: modals
- `src/events/interactionCreate/components/selectMenu/items/`: select menus (string / user / role / channel / mentionable)

Consumer code only touches the framework through the `@/framework/discord/interactions/<kind>` barrels. Each handler is a pair of `<type>Handler.ts` (class) and `<type>HandlerInstance.ts` (singleton), both re-exported from the barrel. The `<type>Register.ts` modules register each item with the handler, and `src/events/interactionCreate/setup.ts` imports every register for its side effects and then composes the dispatcher, exporting `dispatchInteraction`. `src/events/interactionCreate/index.ts` is a thin adapter that just calls `dispatchInteraction`, and `scripts/registerCommand.ts` reaches the handlers through `setup.ts` as well.

For everyday development, add interaction implementations to the `items/` directories and wire them up in the matching `*Register.ts`. The framework-side implementations — handler classes, the dispatcher, subcommand helpers, the shared customId router — live under `src/framework/discord/interactions/`.

`src/events/guildCreate/` and `src/events/guildDelete/` keep the `guilds` table in sync as the bot joins and leaves. Leaves are soft-deletes that write a timestamp into `leftAt`; on rejoin, `joinedAt` resets and `leftAt` returns to null. The lazy populate path (`getOrCreateGuild` calls during command execution) is still there, so DB consistency holds even if you miss a gateway event.

`src/lib/discord/interactionContext.ts` and `src/lib/infra/logger.ts` emit command/customId/user/guild/channel/interactionId/ageMs into logs on error.
`NODE_ENV=production` produces JSON line format; development outputs a human-readable format.
If `WEBHOOK_URL` is set, the same content is also forwarded to a Discord webhook.

The recommended `customId` shape is `feature:action` or `feature:action:id`.
Group static IDs under `CUSTOM_ID` and matching regexes for dynamic IDs under `CUSTOM_ID_PATTERN`.
For single-process cooldown / rate-limiting, use `CooldownStore` and `createCooldownKey` from `src/lib/util/cooldown.ts`.

### Embed helpers

`src/lib/discord/embed.ts` exports `successEmbed` / `errorEmbed` / `infoEmbed` / `warnEmbed` for `EmbedBuilder`s with consistent colors.

### Pagination

`src/lib/discord/pagination.ts` provides `buildPaginationRow` to build a prev/next button row, plus `parsePaginationCustomId` + `nextPage` for button handlers to advance to the next page. See `/help` (`src/events/interactionCreate/commands/chatInput/items/help.ts`) and `helpPaginationButton` for a sample.

### Autocomplete

`/echo` is the autocomplete sample. Attach `.setAutocomplete(true)` to the option, define `new Autocomplete(commandName, execute)` under `src/events/interactionCreate/commands/autocomplete/items/`, and register it in `autocompleteRegister.ts`.

### Context menu

Place User / Message context menus under `src/events/interactionCreate/commands/contextMenu/items/`. Register `new ContextMenuCommand(build, execute)` in `contextMenuRegister.ts`, and `bun register` will push it to Discord alongside slash commands.

### Components v2

`/showcase` ([src/events/interactionCreate/commands/chatInput/items/showcase.ts](src/events/interactionCreate/commands/chatInput/items/showcase.ts)) and `/profile view` ([items/profile.ts](src/events/interactionCreate/commands/chatInput/items/profile.ts)) are the reference Components v2 implementations.

- Set `flags: MessageFlags.IsComponentsV2` when sending. `content` / `embeds` cannot be combined with it
- Using `ContainerBuilder` as the root lets you group an accent color with the child components
- `SectionBuilder.setThumbnailAccessory(...)` puts a thumbnail on the right; `SectionBuilder.setButtonAccessory(...)` places an interactive button. The button's customId is routed through `buttonRegister.ts` like any other button
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

Under `src/events/interactionCreate/components/selectMenu/items/`, you can place String / User / Role / Channel / Mentionable select menus. Define them with `new Menu(() => customId, execute)` and call `menuHandler.register(...)` in `menuRegister.ts`. `MenuHandler` is internally a `CustomIdHandler<AnySelectMenuInteraction>`, so narrow with `interaction.isStringSelectMenu()` etc. inside `execute` to pull values out.

Four kinds are included as samples:

- `helpSectionSelectMenu` (String): section jump in `/help`
- `reportUserSelectMenu` (User): `/admin report-user-select`
- `modRoleSelectMenu` (Role): `/admin set-mod-role`
- `archiveChannelSelectMenu` (Channel, filtered by `ChannelType.GuildText`): `/admin set-archive-channel`

You can add Mentionable selects using `MentionableSelectMenuBuilder` with the same `Menu` class.

## Database

Schemas live under `src/db/schema/` (`guilds` / `guild_settings` / `member_profiles`, plus relations).
Individual queries live under `src/db/query/` and are wrapped with the `defineQuery` helper ([src/db/query/defineQuery.ts](src/db/query/defineQuery.ts)). The helper injects the global `db`, so each query body receives a `client: DbClient` and never reaches for the global directly. Inside `withTransaction`, the same `tx` flows into every query.
For DB operations that can fail, the `Result` type from `src/lib/util/result.ts` together with `handleResult` from `src/lib/discord/resultHandler.ts` lets you handle logging, webhook notifications, and user-facing error replies in one place.
To run multiple DB operations atomically, `withTransaction` in `src/db/transaction.ts` wraps transaction failures into a `Result`. The usecase layer (`src/usecases/`) composes flows with that pattern.

```sh
bun generate:local   # generate migrations for local PGlite
bun migrate:local    # apply migrations to local PGlite
bun db:seed:local    # seed sample guild/member rows in local PGlite
bun db:reset:local   # truncate local PGlite app tables
bun studio:local     # open local DB in Drizzle Studio
```

For production:

```sh
bun generate
bun migrate
bun studio
```

The ER diagram can be regenerated to `docs/schema_diagram.md` with `bun generateERdiagram`.

### Production migration

In production, commit a migration file via `bun generate` on every PR that changes the schema, and run `bun migrate` before deploying.

- Always review the `drizzle/` diff produced by `bun generate` locally
- Run `bun migrate` against the production `DATABASE_URL` before deploying (if running from CI, place the `migrate` job immediately before deploy)
- Migrations are expected to be complete before the bot boots. The bot does not run migrations automatically.

The recommended rollback approach is **forward-only**.

- Don't delete entries from `drizzle/` to revert
- If you need to revert a change, generate a new migration that reverses it
- Stage schema and code compatibility incrementally (e.g. add column → start writing in code → switch reads → drop old column)

## Scheduled jobs

Adding a `Job` to the array in `src/jobs/jobsRegister.ts` makes `startJobs` (called on `clientReady`) start it with `setInterval`.
For everyday development, add jobs under `src/jobs/items/` and register them in `src/jobs/jobsRegister.ts`. The runner, the `Job` type, and runner tests live under `src/framework/jobs/`.

```ts
import type { Job } from "@/framework/jobs/job";

export const myJob: Job = {
    name: "my-job",
    intervalMs: 60_000,
    runOnStart: true, // optional: run once immediately after client startup
    run: async () => {
        // periodic work
    },
};
```

A shutdown task clears the interval, so you don't need to call `registerShutdownTask` separately. See `src/jobs/items/uptimeJob.ts` as an example.

- `intervalMs` must be a positive finite number. Jobs with 0 / negative / `NaN` / `Infinity` are skipped with a warn log.
- While a previous tick of the same job is still running, new ticks are skipped (per-job overlap guard) to avoid concurrent execution of slow jobs.
- Failure logs use `Job '<name>' failed` as the message and attach the original error as `cause`.

## Error reporting

`src/lib/infra/errorReporter.ts` provides a pluggable hook for an external error tracker (Sentry, etc.). `captureException` runs every time `logger.error` is called and does nothing by default.

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

In real projects, create an initializer file that's imported from `src/index.ts` and call `Sentry.init(...)` and `setErrorReporter(...)` from there, so the reporter is swapped exactly once at startup. The template doesn't include `SENTRY_DSN` in the env schema — add it to `src/env.ts` to match the tracker you adopt.

## Graceful shutdown

On `SIGINT` / `SIGTERM`, `runShutdown` in `src/lib/infra/shutdown.ts` waits for in-flight interactions, then closes the Discord client and the DB in order.

- In-flight wait timeout: 10 seconds (default)
- Per-task timeout: 5 seconds (default)
- Register additional close tasks via `registerShutdownTask({ name, priority?, run })`
- Tasks run in ascending `priority` order (default 100). The presets are `SHUTDOWN_PRIORITY.JOBS` (10) → `DISCORD_CLIENT` (100) → `DATABASE` (200): stop jobs first to suppress new interactions and intervals, then close client / DB in that order.

This keeps interactions and DB transactions in flight from being dropped during PM2 reloads or `docker stop`.

## Tests

`bun test` runs `*.test.ts`. For testing Discord interaction handlers, the mock helpers in `src/lib/testing/interactions.ts` build interaction objects for you.

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

See `src/framework/discord/interactions/{chatInput,contextMenu,autocomplete,components}/__tests__/`, `src/lib/discord/{replyError,resultHandler,interactionContext,embed,pagination}.test.ts`, `src/lib/infra/{errorWebhook,errorReporter,shutdown}.test.ts`, and `src/lib/util/{result,cooldown}.test.ts` for real examples.

## Scripts

- `bun dev`: start in development
- `bun start`: start in production
- `bun register`: register slash commands
- `bun check:no-save`: Biome check
- `bun check:tsc`: TypeScript check
