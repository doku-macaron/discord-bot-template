# Discord Bot Template with DB

[English](README.md) · **日本語**

[![CI](https://github.com/doku-macaron/discord-bot-template/actions/workflows/ci.yml/badge.svg)](https://github.com/doku-macaron/discord-bot-template/actions/workflows/ci.yml)
[![Bun](https://img.shields.io/badge/Bun-1.3.11-black?logo=bun)](https://bun.sh/)
[![License](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)

Bun + discord.js + Drizzle ORM + PostgreSQL の Discord Bot テンプレートです。**Bun + Turborepo モノレポ**構成。

## Structure

```
apps/bot          @repo/bot        — discord.js bot 本体
packages/db       @repo/db         — drizzle schema / query / migration (Postgres)
packages/shared   @repo/shared     — Result<T,E> + kind 判別の AppError
packages/scheduler @repo/scheduler — Discord/DB 非依存の durable scheduler core
```

すべてリポジトリルートから実行します。Bot がコアで、**内部 HTTP API** (`server/`) と **durable scheduler** は opt-in (env フラグ、既定 off) です — [Optional features](#optional-features) 参照。

## Use this template

GitHub の "Use this template" からリポジトリを作るか、`degit` で取得します。

```sh
bunx degit doku-macaron/discord-bot-template my-bot
cd my-bot
bun install
```

その後、以下を自分のプロジェクトに合わせて書き換えます。

- `package.json` の `name`
- `README.md` の Bot 名・説明・コマンド一覧
- `LICENSE` の `Copyright` 行（Apache-2.0 のままにする場合）
- `.github/CODEOWNERS` のオーナー
- 不要なサンプル (`apps/bot/src/events/interactionCreate/commands/chatInput/items/`, `apps/bot/src/events/interactionCreate/commands/contextMenu/items/`, `apps/bot/src/events/interactionCreate/components/*/items/`)
- `.github/workflows/ci.yml` / `compose.yml` の image 名や repository 名（必要な場合）
- `.env.example` のコメントや既定値（本番DB、webhook、運用方針に合わせる）

開発フローは [CONTRIBUTING.md](CONTRIBUTING.md) にまとめています。このテンプレート自体への変更も、利用先プロジェクトでの変更も、PR 経由にすると CI と review の流れを揃えやすくなります。

## Requirements

- [Bun](https://bun.sh/)
- Discord Bot application
- Docker (ローカル開発用の Postgres) — もしくは `DATABASE_URL` を向ける任意の PostgreSQL

## Setup

```sh
bun install            # postinstall で .env を .env.example から生成
bun db:up              # 開発用 Postgres を起動 (Docker)
bun db:migrate:local   # migration 適用
```

`.env` は install 時に生成されます。Discord の値を埋めてください。

```env
# Discord bot token from the Developer Portal.
TOKEN="Discord bot token"

# Discord application/client ID. Used for command registration and invite URLs.
CLIENT_ID="Discord application client ID"

# Optional development guild ID. When empty, bun register broadcasts to all bot guilds.
GUILD_ID="Optional: development guild ID"

# PostgreSQL connection URL (runtime). `bun db:up` の Docker DB が既定。
DATABASE_URL="postgres://discord_bot:discord_bot@localhost:5432/discord_bot"

# Optional Discord webhook URL for error reports.
WEBHOOK_URL="Optional: Discord webhook URL for error reports"
```

opt-in 機能 (`BOT_API_*`, `SCHEDULER_ENABLED`) は [Optional features](#optional-features) を参照（既定 off）。

## Invite

Discord Developer Portal で bot を作成し、`CLIENT_ID` を使って invite URL を作ります。

```text
https://discord.com/oauth2/authorize?client_id=<CLIENT_ID>&scope=bot%20applications.commands&permissions=0
```

このテンプレートは slash command / context menu / component interaction を中心にしているため、最小構成では `applications.commands` scope が重要です。通常のメッセージ送信や管理操作を追加する場合は、その機能に必要な bot permissions を Developer Portal で加えてください。

`apps/bot/src/client.ts` は `Guilds` と `GuildMembers` intent を要求します。Discord Developer Portal の Bot settings で **Server Members Intent** を有効にしてください。メンバー情報を使わない bot にする場合は、`GuildMembers` intent と `interaction.member.displayName` に依存しているサンプル処理を削っても構いません。

## Development

VSCode では `.vscode/extensions.json` の推奨拡張を使えます。

```sh
bun db:up              # 開発用 Postgres を起動 (初回のみ)
bun db:migrate:local   # migration 適用
bun register           # slash command を Discord に登録
bun dev                # hot reload つきで Bot を起動
```

`bun dev` はファイル変更を再起動なしで hot reload します (event registry を再 import して listener を張り替える)。`items/` や usecase の編集はそのまま反映されます。

`GUILD_ID` を設定している場合、`bun register` はそのサーバーにだけコマンドを登録します (dev guild 即時反映)。未設定の場合は **Discord REST `/users/@me/guilds` から bot 参加中の全 guild を取得して、それぞれに guild scope で broadcast 登録** します。

旧来のグローバル登録 (反映に最大 1 時間) は廃止しました。本番デプロイは `GUILD_ID` を外して broadcast、開発は dev サーバーの ID を `GUILD_ID` に入れて 1 guild に絞る、という運用です。

大規模 bot (数千 guild) では `/users/@me/guilds` のページングと rate limit に注意してください。テンプレートでは小〜中規模を想定した単純な直列 PUT のみ実装しています。

## Docker

`compose.yml` は Postgres + Bot を起動します。`Dockerfile` は multi-stage (`bot` / `tools` ターゲット) で、compose がサービスごとに target を選びます。

```sh
docker compose build
docker compose --profile tools run --rm migrate    # migration 適用
docker compose --profile tools run --rm register   # slash command 登録
docker compose up -d bot
docker compose logs -f bot
```

`compose.yml` の PostgreSQL はテンプレート用の固定ユーザー/パスワードです。本番ではマネージドDBや secret 管理に置き換えてください。

本番運用では、Bot 起動前に migration を完了させます。

- Docker image は `Dockerfile` から build し、`DATABASE_URL` / `TOKEN` / `CLIENT_ID` は secret として渡す
- deploy 前に同じ image で `bun db:migrate` を実行する
- `NODE_ENV=production` のログは JSON line 形式なので、コンテナログ基盤へそのまま流せる
- `docker stop` / rolling deploy では `SIGTERM` を受けて graceful shutdown が走る
- `compose.yml` はローカル検証用。production では DB password、volume、restart policy、network を環境に合わせて調整する

## Environment

環境変数は `apps/bot/src/env.ts` の `getEnv` で用途別に検証します。

- `getEnv("bot")`: Bot起動に必要な `TOKEN`
- `getEnv("register")`: コマンド登録に必要な `TOKEN` / `CLIENT_ID` / optional `GUILD_ID`
- `getEnv("botApi")`: `BOT_API_ENABLED` / `BOT_API_HOST` / `BOT_API_PORT` / `BOT_API_TOKEN` (opt-in HTTP API)
- `getEnv("scheduler")`: `SCHEDULER_ENABLED` (opt-in durable scheduler)
- `getEnv("webhook")`: optional `WEBHOOK_URL`

`DATABASE_URL` (+ optional `DATABASE_URL_MIGRATOR` / `DATABASE_URL_TEST`) は `@repo/db` が環境から直接読みます。

## Commands

- `/ping`: Bot の応答確認
- `/echo <message>`: 入力内容を返すサンプル (autocomplete)
- `/help`: コマンド一覧をページャ付き embed で表示するサンプル (pagination + String Select)
- `/profile view`: プロフィールを Container / Section / Thumbnail / Button accessory で組み立てるサンプル (Components v2)
- `/profile edit`: モーダルでプロフィール bio を編集・保存するサンプル
- `/showcase`: Components v2 (Container / Section + Thumbnail / Section + Button / MediaGallery / Separator / TextDisplay) のリファレンス実装
- `/showcase-modal`: Modal v2 (Checkbox / RadioGroup / CheckboxGroup / FileUpload + Label + TextInput) のリファレンス実装
- `/poll`: モーダルから Discord ネイティブ Poll を作成するサンプル (`interaction.reply({ poll: ... })`)
- `/timer`: モーダルで「経過時間後」or「指定時刻」を設定するリマインダー サンプル（`globalThis` pin の timer **service** に委譲。hot reload は生き残るがプロセス再起動で失効）
- `/admin report-user-select`: ユーザーを選んで report するサンプル (User Select)
- `/admin set-mod-role`: Mod ロールを選ぶサンプル (Role Select)
- `/admin set-archive-channel`: アーカイブ用 text channel を選ぶサンプル (Channel Select)
- Context menu "Get user profile" (User): 右クリックでユーザー情報を表示
- Context menu "Report message" (Message): メッセージを右クリックして report ID と URL を取得

## Interaction Structure

interaction は種類ごとに `apps/bot/src/events/interactionCreate/` 配下で分けています。

- `commands/chatInput/items/`: slash command
- `commands/contextMenu/items/`: user / message context menu
- `commands/autocomplete/items/`: autocomplete
- `components/button/items/`: button
- `components/modal/items/`: modal
- `components/selectMenu/items/`: select menu (string / user / role / channel / mentionable)

各種類は `registry.ts` を持ち、その `items/` から handler を毎回新規に組み立てます。

```ts
// commands/chatInput/registry.ts
export const commandHandler = new CommandHandler();
commandHandler.register(pingCommand);
commandHandler.register(profileCommand);
// ここに 1 行ずつ追加していく
```

`setup.ts` が 6 種の handler を dispatcher (`dispatchInteraction`) に組み立て、`index.ts` はそれを呼ぶだけの thin adapter、`scripts/registerCommand.ts` が registry からコマンドペイロードを読みます。`*Register.ts` / `*HandlerInstance.ts` singleton / `.clear()` は廃止しました。普段の開発では `items/` に実装を追加し、その種類の `registry.ts` に `.register(...)` を 1 行足すだけです。handler class・dispatcher・subcommand helper・customId router・client-event reloader などの framework 実装は `apps/bot/src/framework/discord/` にあります。

`apps/bot/src/events/guildCreate/` と `apps/bot/src/events/guildDelete/` が bot の参加・退出に合わせて `guilds` テーブルを sync します。退出は物理削除ではなく `leftAt` に時刻を入れる soft-delete で、再入会時に `joinedAt` がリセット・`leftAt` が null に戻ります。lazy populate (コマンド実行時の `getOrCreateGuild` 呼び出し) も残っているため、event を取りこぼしても DB 整合性は保たれます。

`apps/bot/src/lib/discord/interactionContext.ts` と `apps/bot/src/lib/infra/logger.ts` で、エラー時に command/customId/user/guild/channel/interactionId/ageMs をログへ出します。
`NODE_ENV=production` では JSON line 形式、development では人間が読みやすい形式で出力します。
`WEBHOOK_URL` を設定している場合だけ、同じ内容を Discord webhook にも通知します。

`customId` は `feature:action` または `feature:action:id` の形式を推奨します。
固定IDは `CUSTOM_ID`、動的IDに対応する正規表現は `CUSTOM_ID_PATTERN` にまとめます。
単一プロセスの cooldown / rate-limit には `apps/bot/src/lib/util/cooldown.ts` の `CooldownStore` と `createCooldownKey` を使えます。

### Embed helpers

`apps/bot/src/lib/discord/embed.ts` の `successEmbed` / `errorEmbed` / `infoEmbed` / `warnEmbed` で色を統一した `EmbedBuilder` を作れます。

### Pagination

`apps/bot/src/lib/discord/pagination.ts` の `buildPaginationRow` で前/次ボタン付きの行を作り、`parsePaginationCustomId` + `nextPage` で button handler から新しいページに更新します。サンプルは `/help` コマンド (`apps/bot/src/events/interactionCreate/commands/chatInput/items/help.ts`) と `helpPaginationButton` を参照してください。

### Autocomplete

`/echo` コマンドが autocomplete のサンプルです。option に `.setAutocomplete(true)` を付け、`apps/bot/src/events/interactionCreate/commands/autocomplete/items/` 配下に `new Autocomplete(commandName, execute)` を定義して `autocomplete/registry.ts` で登録します。

### Context menu

`apps/bot/src/events/interactionCreate/commands/contextMenu/items/` に User / Message context menu を置きます。`new ContextMenuCommand(build, execute)` を `contextMenu/registry.ts` で登録すると、`bun register` 時に slash command と一緒に Discord へ送られます。

### Components v2

`/showcase` ([apps/bot/src/events/interactionCreate/commands/chatInput/items/showcase.ts](apps/bot/src/events/interactionCreate/commands/chatInput/items/showcase.ts)) と `/profile view` ([items/profile.ts](apps/bot/src/events/interactionCreate/commands/chatInput/items/profile.ts)) が Components v2 のリファレンス実装です。

- 送信時に `flags: MessageFlags.IsComponentsV2` を立てる必要があります。`content` / `embeds` とは併用できません
- root は `ContainerBuilder` を使うと accent color + 子コンポーネントをまとめられます
- `SectionBuilder.setThumbnailAccessory(...)` で右側にサムネイル、`SectionBuilder.setButtonAccessory(...)` で interactive button を置けます。button の customId は通常通り `button/registry.ts` の handler でルーティングされます
- `MediaGalleryBuilder.addItems(...)` で URL ベースの画像 gallery、`SeparatorBuilder` で divider と spacing を制御します
- file component (`FileBuilder`) は attachment を伴いますが、Components v2 と一緒に送る場合も `flags: MessageFlags.IsComponentsV2` は必要です。必要な場合は `interaction.reply({ flags: MessageFlags.IsComponentsV2, files: [...], components: [container] })` の形で送ります

**flag を渡す場所**: `IsComponentsV2` は **メッセージ送信側のオプション** (`reply` / `editReply` / `followUp`) に渡します。`deferReply` 側の `flags` は `Ephemeral` のみ受け付けるため、defer 段階では渡せません。

```ts
// パターン 1: 重い前処理なしで一発返信 — /showcase が採用
await interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });

// パターン 2: DB 等で 3 秒の応答期限を超えそうなら defer → editReply で v2 を送る — /profile view が採用
await interaction.deferReply();
// ... DB 操作など ...
await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
```

`commandExecutor.ts` の `runAsAsyncGenerator` も同じ仕組みで使えます。`yield { flags: MessageFlags.IsComponentsV2, components: [container] }` のように `InteractionEditReplyOptions` を yield すれば v2 メッセージとして送られます。

### Select menus

`apps/bot/src/events/interactionCreate/components/selectMenu/items/` 配下に String / User / Role / Channel / Mentionable の select menu を置けます。`new Menu(() => customId, execute)` で定義し、`selectMenu/registry.ts` で `menuHandler.register(...)` を呼びます。`MenuHandler` は内部で `CustomIdHandler<AnySelectMenuInteraction>` を使うため、execute の中で `interaction.isStringSelectMenu()` などで narrow して値を取り出します。

サンプルとして 4 種類を同梱しています:

- `helpSectionSelectMenu` (String): `/help` の section ジャンプ
- `reportUserSelectMenu` (User): `/admin report-user-select`
- `modRoleSelectMenu` (Role): `/admin set-mod-role`
- `archiveChannelSelectMenu` (Channel, `ChannelType.GuildText` フィルタ): `/admin set-archive-channel`

Mentionable select は `MentionableSelectMenuBuilder` を使って同じ `Menu` クラスで追加できます。

## Database

DB 層は `packages/db` (`@repo/db`)、Postgres 専用です。

スキーマは `packages/db/src/schema/<name>.schema.ts` (`guilds` / `guild_settings` / `member_profiles` + `relations.ts`)。`Bun.Glob` の barrel が**自動収集**するため、テーブル追加は `*.schema.ts` を足すだけ（barrel や drizzle config の手編集不要）。query は `packages/db/src/query/<domain>/` に置き `defineQuery` で wrap します。defineQuery が global `db` を注入するので、各 query 本体は `client: DbClient` を受け取り global を直掴みしません。`withTransaction` 内では同じ `tx` が各 query に流れます。（package 内のファイルは `@/` でなく相対 import を使います。）

usecase は `Result<T, AppError>` (`@repo/shared`) を返し、呼び出し側は `handleResult` (`@/lib/discord/resultHandler`) が AppError の `kind` で分岐してログ・返信します。`withTransaction` (`@repo/db/transaction`) は transaction 失敗を `Result` に包みます。

```sh
bun db:up            # 開発用 Postgres を起動 (Docker)
bun db:generate      # schema から migration 生成
bun db:migrate:local # 開発DBへ migration 適用
bun db:seed:local    # サンプル guild/member を投入
bun db:reset:local   # app tables を空にする
bun db:studio        # Drizzle Studio を開く
```

ER 図は `bun generateERdiagram` で `packages/db/docs/schema_diagram.md` に生成できます。

### Production migration

本番環境では PR にスキーマ変更を含めるたびに `bun db:generate` で migration をコミットし、デプロイ前に `bun db:migrate` を流します。

- ローカルで `bun db:generate` → `packages/db/drizzle/` の差分を必ずレビューする
- デプロイ前に `DATABASE_URL` を本番に向けて `bun db:migrate` を実行する（CI ではデプロイ直前に migrate ジョブを挟む）
- migration はアプリ起動より前に完了している前提。Bot は migration を自動実行しない

rollback 方針は **forward-only** を推奨します（`packages/db/drizzle/` を消して戻さず、戻す migration を新規に作る）。

## Optional features

Bot がコアです。重めの 2 モジュールはテンプレに同梱しつつ env フラグで **opt-in**（既定 off）、それぞれ 1 行で起動します。

### Internal HTTP API (`server/`)

`apps/bot/src/server/` の最小 Hono サーバ。無認証の `/health` + `/ready` と、`deps.ts` DI seam の後ろに bearer 認証の `/api/ping`。死活監視やサービス間呼び出しに使えます。

```env
BOT_API_ENABLED="true"
BOT_API_PORT="8080"
BOT_API_TOKEN="a-secret-token"   # 有効時は必須
```

`/ready` は client が ready になるまで 503。shutdown では client 破棄の前に受付を止めます。削除するには `apps/bot/src/server/` と `index.ts` の `if (botApiEnv.BOT_API_ENABLED) ...` 行を消すだけです。

### Durable scheduler

DB 永続スケジューラ。Discord/DB 非依存のコアは `packages/scheduler` (`@repo/scheduler`)、Bot 側 worker (`apps/bot/src/jobs/`) が due な job を `FOR UPDATE SKIP LOCKED` で claim → 実行 → finalize/再スケジュールします。実行履歴と lease (stale recovery 用) は `scheduled_jobs` / `job_runs` に持ちます。

```env
SCHEDULER_ENABLED="true"   # Postgres が必要
```

有効時、`clientReady` が built-in job を seed して worker を起動します。サンプルは `builtin:uptime`（30 分ごとに稼働時間をログ）。job 追加は `scheduler-add-job` skill 参照：`apps/bot/src/jobs/builtInJobs.ts` で定数を定義 → `jobs/handlers/` に `ScheduledJobHandler` → `botJobRegistry.ts` で登録 → `seedBuiltInJobs.ts` で seed。削除は `apps/bot/src/jobs/` + `packages/scheduler/` と `clientReady` の gate を消すだけです。

## Error reporting

`apps/bot/src/lib/infra/errorReporter.ts` に外部エラートラッカー (Sentry など) の差し込み口があります。`logger.error` が呼ばれるたびに `captureException` が走り、既定では何もしません。

Sentry を使う場合は起動時に reporter を差し替えます。

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

reporter が throw / reject しても呼び出し元には伝搬しません（webhook 通知やログ出力との二重失敗を避けるため）。

実プロジェクトでは `apps/bot/src/index.ts` から import される初期化ファイルを作り、その中で `Sentry.init(...)` と `setErrorReporter(...)` を呼ぶと、Bot 起動時に一度だけ reporter を差し替えられます。テンプレート本体には `SENTRY_DSN` を env schema に含めていないため、採用する tracker に合わせて `apps/bot/src/env.ts` へ追加してください。

## Graceful shutdown

`SIGINT` / `SIGTERM` を受けると `apps/bot/src/lib/infra/shutdown.ts` の `runShutdown` が走り、進行中の interaction を待ってから Discord client と DB を順に close します。

- 進行中 interaction の待機タイムアウト: 10 秒（既定）
- 各タスクのタイムアウト: 5 秒（既定）
- 追加の close 処理は `registerShutdownTask({ name, priority?, run })` で登録できます
- task は `priority` 昇順で実行されます（既定 100）。プリセットは `SHUTDOWN_PRIORITY.JOBS` (10) → `BOT_API_SERVER` (90) → `DISCORD_CLIENT` (100) → `DATABASE` (200)。scheduler worker → HTTP API → client / DB の順で閉じます

PM2 reload や Docker stop のときに、処理中の interaction や DB transaction を取りこぼさないための仕組みです。

## Tests

`bun run test` で全 package のテストを Turborepo 経由で実行します。既定の unit/structure テストは DB 不要。Postgres を使う usecase テストは `createTestDb` (`@repo/db/testing/testDb`、`DATABASE_URL_TEST` が必要) を使います。Discord interaction handler のテストは、`apps/bot/src/lib/testing/interactions.ts` の mock ヘルパで interaction を組み立てます。

```ts
import { createCommandInteractionMock, type MockReplyPayload } from "@/lib/testing/interactions";

const replies: Array<MockReplyPayload> = [];
const interaction = createCommandInteractionMock("ping", replies);

await handler.execute(interaction);

expect(replies).toEqual([]);
```

- `createCommandInteractionMock(name, replies, options?)`: slash command interaction (`reply` のみ)
- `createRichCommandInteractionMock(name, records, options?)`: `reply` / `editReply` / `followUp` / `deferReply` を記録し、`options.getSubcommand[Group]` をモックするリッチ版。`commandExecutor` の AsyncGenerator パスや `replyError` のフォールバック分岐をテストするときに使う
- `createCustomIdInteractionMock(customId, replies, options?)`: button / modal / select menu interaction
- `createContextMenuInteractionMock(name, replies, options?)`: user / message context menu interaction
- `createAutocompleteInteractionMock(commandName, recorder, options?)`: autocomplete interaction
- `createKindInteractionMock(kind, overrides?)`: `interaction.isXxx()` ガードだけを切り替える最小 mock。`buildInteractionContext` の分岐テスト向け

実例は `apps/bot/src/framework/discord/interactions/{chatInput,contextMenu,autocomplete,components}/__tests__/`、`apps/bot/src/lib/discord/{replyError,resultHandler,interactionContext,embed,pagination}.test.ts`、`apps/bot/src/lib/infra/{errorWebhook,errorReporter,shutdown}.test.ts`、`apps/bot/src/lib/util/{result,cooldown}.test.ts` を参照してください。

## Scripts

- `bun dev`: Bot を開発起動 (hot reload)
- `bun start`: Bot を本番起動
- `bun register`: スラッシュコマンド登録
- `bun db:up` / `bun db:down`: 開発用 Postgres の起動 / 停止 (Docker)
- `bun db:generate` / `bun db:migrate:local` / `bun db:seed:local` / `bun db:reset:local` / `bun db:studio`: DB ワークフロー
- `bun run check:no-save`: Biome check
- `bun run check:tsc`: TypeScript check (全 package, Turborepo)
- `bun run test`: テスト (全 package, Turborepo)
