# Discord Bot Template with DB

[English](README.md) · **日本語**

[![CI](https://github.com/doku-macaron/discord-bot-template/actions/workflows/ci.yml/badge.svg)](https://github.com/doku-macaron/discord-bot-template/actions/workflows/ci.yml)
[![Bun](https://img.shields.io/badge/Bun-1.3.11-black?logo=bun)](https://bun.sh/)
[![License](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)

Bun + discord.js + Drizzle ORM + PostgreSQL/PGlite の Discord Bot テンプレートです。

ローカル開発では PGlite を使うため、PostgreSQL サーバーを立てずに DB つき Bot を動かせます。本番では `DATABASE_URL` に PostgreSQL の接続文字列を指定します。

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
- 不要なサンプル (`src/events/interactionCreate/commands/chatInput/items/`, `src/events/interactionCreate/commands/contextMenu/items/`, `src/events/interactionCreate/components/*/items/`)
- `.github/workflows/ci.yml` / `compose.yml` の image 名や repository 名（必要な場合）
- `.env.example` のコメントや既定値（本番DB、webhook、運用方針に合わせる）

開発フローは [CONTRIBUTING.md](CONTRIBUTING.md) にまとめています。このテンプレート自体への変更も、利用先プロジェクトでの変更も、PR 経由にすると CI と review の流れを揃えやすくなります。

## Requirements

- [Bun](https://bun.sh/)
- Discord Bot application
- PostgreSQL compatible database for production

## Setup

```sh
bun install
cp .env.example .env
```

`.env` に Discord Bot の値を設定してください。

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

Discord Developer Portal で bot を作成し、`CLIENT_ID` を使って invite URL を作ります。

```text
https://discord.com/oauth2/authorize?client_id=<CLIENT_ID>&scope=bot%20applications.commands&permissions=0
```

このテンプレートは slash command / context menu / component interaction を中心にしているため、最小構成では `applications.commands` scope が重要です。通常のメッセージ送信や管理操作を追加する場合は、その機能に必要な bot permissions を Developer Portal で加えてください。

`src/client.ts` は `Guilds` と `GuildMembers` intent を要求します。Discord Developer Portal の Bot settings で **Server Members Intent** を有効にしてください。メンバー情報を使わない bot にする場合は、`GuildMembers` intent と `interaction.member.displayName` に依存しているサンプル処理を削っても構いません。

## Development

VSCode では `.vscode/extensions.json` の推奨拡張を使えます。

```sh
bun generate:local
bun migrate:local
bun register
bun dev
```

`GUILD_ID` を設定している場合、`bun register` はそのサーバーにだけコマンドを登録します (dev guild 即時反映)。未設定の場合は **Discord REST `/users/@me/guilds` から bot 参加中の全 guild を取得して、それぞれに guild scope で broadcast 登録** します。

旧来のグローバル登録 (反映に最大 1 時間) は廃止しました。本番デプロイは `GUILD_ID` を外して broadcast、開発は dev サーバーの ID を `GUILD_ID` に入れて 1 guild に絞る、という運用です。

大規模 bot (数千 guild) では `/users/@me/guilds` のページングと rate limit に注意してください。テンプレートでは小〜中規模を想定した単純な直列 PUT のみ実装しています。

## Docker

Docker は optional です。ローカル開発は PGlite のままでも進められますが、PostgreSQL 付きで本番に近い起動を試したい場合は `compose.yml` を使えます。

```sh
cp .env.example .env
docker compose build
docker compose run --rm migrate
docker compose run --rm register
docker compose up -d bot
docker compose logs -f bot
```

`compose.yml` の PostgreSQL はテンプレート用の固定ユーザー/パスワードです。本番ではマネージドDBや secret 管理に置き換えてください。

本番運用では、Bot 起動前に migration を完了させます。

- Docker image は `Dockerfile` から build し、`DATABASE_URL` / `TOKEN` / `CLIENT_ID` は secret として渡す
- deploy 前に同じ image で `bun migrate` を実行する
- `NODE_ENV=production` のログは JSON line 形式なので、コンテナログ基盤へそのまま流せる
- `docker stop` / rolling deploy では `SIGTERM` を受けて graceful shutdown が走る
- `compose.yml` はローカル検証用。production では DB password、volume、restart policy、network を環境に合わせて調整する

## Environment

環境変数は `src/env.ts` の `getEnv` で用途別に検証します。

- `getEnv("bot")`: Bot起動に必要な `TOKEN`
- `getEnv("register")`: コマンド登録に必要な `TOKEN` / `CLIENT_ID` / optional `GUILD_ID`
- `getEnv("postgres")`: 本番DB接続に必要な `DATABASE_URL`
- `getEnv("pglite")`: ローカルDB用の `DATABASE_URL_DEV`
- `getEnv("webhook")`: optional `WEBHOOK_URL`

## Commands

- `/ping`: Bot の応答確認
- `/echo <message>`: 入力内容を返すサンプル (autocomplete)
- `/help`: コマンド一覧をページャ付き embed で表示するサンプル (pagination + String Select)
- `/profile view`: プロフィールを Container / Section / Thumbnail / Button accessory で組み立てるサンプル (Components v2)
- `/profile edit`: モーダルでプロフィール bio を編集・保存するサンプル
- `/showcase`: Components v2 (Container / Section + Thumbnail / Section + Button / MediaGallery / Separator / TextDisplay) のリファレンス実装
- `/admin report-user-select`: ユーザーを選んで report するサンプル (User Select)
- `/admin set-mod-role`: Mod ロールを選ぶサンプル (Role Select)
- `/admin set-archive-channel`: アーカイブ用 text channel を選ぶサンプル (Channel Select)
- Context menu "Get user profile" (User): 右クリックでユーザー情報を表示
- Context menu "Report message" (Message): メッセージを右クリックして report ID と URL を取得

## Interaction Structure

interaction は種類ごとに handler/register を分けています。

- `src/events/interactionCreate/commands/chatInput/items/`: slash command
- `src/events/interactionCreate/commands/contextMenu/items/`: user / message context menu
- `src/events/interactionCreate/commands/autocomplete/items/`: autocomplete
- `src/events/interactionCreate/components/button/items/`: button
- `src/events/interactionCreate/components/modal/items/`: modal
- `src/events/interactionCreate/components/selectMenu/items/`: select menu (string / user / role / channel / mentionable)

利用者側のコードは `@/framework/discord/interactions/<kind>` の barrel 経由でだけ framework に触ります。各 handler は `<type>Handler.ts` (class) と `<type>HandlerInstance.ts` (singleton) のペアで、barrel が両方を再 export します。`<type>Register.ts` が `items/` の各 interaction を handler に登録し、`src/events/interactionCreate/setup.ts` がすべての register を side-effect import で読み込んだうえで dispatcher を composition root として組み立てて `dispatchInteraction` を export します。`src/events/interactionCreate/index.ts` はこの `dispatchInteraction` を呼ぶだけの thin adapter、`scripts/registerCommand.ts` も `setup.ts` 経由で handler を取得します。
普段の開発では各種 `items/` に interaction 実装を追加し、対応する `*Register.ts` に登録してください。handler class、dispatcher、subcommand helper、shared customId router などの framework 側実装は `src/framework/discord/interactions/` にあります。

`src/events/guildCreate/` と `src/events/guildDelete/` が bot の参加・退出に合わせて `guilds` テーブルを sync します。退出は物理削除ではなく `leftAt` に時刻を入れる soft-delete で、再入会時に `joinedAt` がリセット・`leftAt` が null に戻ります。lazy populate (コマンド実行時の `getOrCreateGuild` 呼び出し) も残っているため、event を取りこぼしても DB 整合性は保たれます。

`src/lib/discord/interactionContext.ts` と `src/lib/infra/logger.ts` で、エラー時に command/customId/user/guild/channel/interactionId/ageMs をログへ出します。
`NODE_ENV=production` では JSON line 形式、development では人間が読みやすい形式で出力します。
`WEBHOOK_URL` を設定している場合だけ、同じ内容を Discord webhook にも通知します。

`customId` は `feature:action` または `feature:action:id` の形式を推奨します。
固定IDは `CUSTOM_ID`、動的IDに対応する正規表現は `CUSTOM_ID_PATTERN` にまとめます。
単一プロセスの cooldown / rate-limit には `src/lib/util/cooldown.ts` の `CooldownStore` と `createCooldownKey` を使えます。

### Embed helpers

`src/lib/discord/embed.ts` の `successEmbed` / `errorEmbed` / `infoEmbed` / `warnEmbed` で色を統一した `EmbedBuilder` を作れます。

### Pagination

`src/lib/discord/pagination.ts` の `buildPaginationRow` で前/次ボタン付きの行を作り、`parsePaginationCustomId` + `nextPage` で button handler から新しいページに更新します。サンプルは `/help` コマンド (`src/events/interactionCreate/commands/chatInput/items/help.ts`) と `helpPaginationButton` を参照してください。

### Autocomplete

`/echo` コマンドが autocomplete のサンプルです。option に `.setAutocomplete(true)` を付け、`src/events/interactionCreate/commands/autocomplete/items/` 配下に `new Autocomplete(commandName, execute)` を定義して `autocompleteRegister.ts` で登録します。

### Context menu

`src/events/interactionCreate/commands/contextMenu/items/` に User / Message context menu を置きます。`new ContextMenuCommand(build, execute)` を `contextMenuRegister.ts` で登録すると、`bun register` 時に slash command と一緒に Discord へ送られます。

### Components v2

`/showcase` ([src/events/interactionCreate/commands/chatInput/items/showcase.ts](src/events/interactionCreate/commands/chatInput/items/showcase.ts)) と `/profile view` ([items/profile.ts](src/events/interactionCreate/commands/chatInput/items/profile.ts)) が Components v2 のリファレンス実装です。

- 送信時に `flags: MessageFlags.IsComponentsV2` を立てる必要があります。`content` / `embeds` とは併用できません
- root は `ContainerBuilder` を使うと accent color + 子コンポーネントをまとめられます
- `SectionBuilder.setThumbnailAccessory(...)` で右側にサムネイル、`SectionBuilder.setButtonAccessory(...)` で interactive button を置けます。button の customId は通常通り `buttonRegister.ts` の handler でルーティングされます
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

`src/events/interactionCreate/components/selectMenu/items/` 配下に String / User / Role / Channel / Mentionable の select menu を置けます。`new Menu(() => customId, execute)` で定義し、`menuRegister.ts` で `menuHandler.register(...)` を呼びます。`MenuHandler` は内部で `CustomIdHandler<AnySelectMenuInteraction>` を使うため、execute の中で `interaction.isStringSelectMenu()` などで narrow して値を取り出します。

サンプルとして 4 種類を同梱しています:

- `helpSectionSelectMenu` (String): `/help` の section ジャンプ
- `reportUserSelectMenu` (User): `/admin report-user-select`
- `modRoleSelectMenu` (Role): `/admin set-mod-role`
- `archiveChannelSelectMenu` (Channel, `ChannelType.GuildText` フィルタ): `/admin set-archive-channel`

Mentionable select は `MentionableSelectMenuBuilder` を使って同じ `Menu` クラスで追加できます。

## Database

スキーマは `src/db/schema/` にあります (`guilds` / `guild_settings` / `member_profiles` の 3 テーブル + relations)。
個別 query は `src/db/query/` 配下に置き、ヘルパー `defineQuery` ([src/db/query/defineQuery.ts](src/db/query/defineQuery.ts)) で wrap します。defineQuery が global `db` を注入してくれるので、各 query 本体は `client: DbClient` を受け取って書き、global を直掴みしません。`withTransaction` 内では同じ `tx` を各 query に渡せます。
DB query が失敗しうる処理では `src/lib/util/result.ts` の `Result` 型と `src/lib/discord/resultHandler.ts` の `handleResult` を使うと、ログ出力・webhook通知・ユーザーへのエラー返信をまとめて扱えます。
複数のDB操作をまとめる場合は `src/db/transaction.ts` の `withTransaction` を使うと、transaction失敗を `Result` として扱えます。usecase 層 (`src/usecases/`) はこのパターンで composite flow を組みます。

```sh
bun generate:local   # ローカル PGlite 用 migration 作成
bun migrate:local    # ローカル PGlite へ migration 適用
bun db:seed:local    # ローカル PGlite にサンプル guild/member を投入
bun db:reset:local   # ローカル PGlite の app tables を空にする
bun studio:local     # ローカル DB を Drizzle Studio で確認
```

本番DB向けには以下を使います。

```sh
bun generate
bun migrate
bun studio
```

ER 図は `bun generateERdiagram` で `docs/schema_diagram.md` に生成できます。

### Production migration

本番環境では PR にスキーマ変更を含めるたびに `bun generate` で migration ファイルをコミットし、デプロイ前に `bun migrate` を流します。

- ローカルで `bun generate` → `drizzle/` の差分を必ずレビューする
- デプロイ前に `DATABASE_URL` を本番に向けて `bun migrate` を実行する（CI から実行する場合は `migrate` ジョブをデプロイの直前に挟む）
- migration はアプリ起動より前に完了している前提。Bot は migration を自動実行しない

rollback 方針は **forward-only** を推奨します。

- `drizzle/` の migration を消して戻すことはしない
- 戻したい変更があれば、戻すための新しい migration を作って前進する
- スキーマ変更とコード変更の互換性は段階的に進める（例: カラム追加 → コードで書き込み開始 → コードで読み取りに切替 → 旧カラム削除）

## Scheduled jobs

`src/jobs/jobsRegister.ts` で `Job` を配列に登録すると、`clientReady` 時に `startJobs` が `setInterval` で開始します。
普段の開発では `src/jobs/items/` に job を追加し、`src/jobs/jobsRegister.ts` に登録してください。runner と `Job` 型、runner tests は `src/framework/jobs/` にあります。

```ts
import type { Job } from "@/framework/jobs/job";

export const myJob: Job = {
    name: "my-job",
    intervalMs: 60_000,
    runOnStart: true, // optional: クライアント起動直後に一度実行
    run: async () => {
        // periodic work
    },
};
```

shutdown task として interval が clear されるため、`registerShutdownTask` を別途呼ぶ必要はありません。サンプルは `src/jobs/items/uptimeJob.ts`。

- `intervalMs` は正の有限な数値である必要があります。0 / 負値 / `NaN` / `Infinity` の job は warn ログを出してスキップします
- 同じ job の前回 tick がまだ走っている間は、新しい tick は skip されます（per-job overlap guard）。slow job が重複実行される事故を防ぐためです
- 失敗時のログは `Job '<name>' failed` を message に、元のエラーを `cause` に含めます

## Error reporting

`src/lib/infra/errorReporter.ts` に外部エラートラッカー (Sentry など) の差し込み口があります。`logger.error` が呼ばれるたびに `captureException` が走り、既定では何もしません。

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

実プロジェクトでは `src/index.ts` から import される初期化ファイルを作り、その中で `Sentry.init(...)` と `setErrorReporter(...)` を呼ぶと、Bot 起動時に一度だけ reporter を差し替えられます。テンプレート本体には `SENTRY_DSN` を env schema に含めていないため、採用する tracker に合わせて `src/env.ts` へ追加してください。

## Graceful shutdown

`SIGINT` / `SIGTERM` を受けると `src/lib/infra/shutdown.ts` の `runShutdown` が走り、進行中の interaction を待ってから Discord client と DB を順に close します。

- 進行中 interaction の待機タイムアウト: 10 秒（既定）
- 各タスクのタイムアウト: 5 秒（既定）
- 追加の close 処理は `registerShutdownTask({ name, priority?, run })` で登録できます
- task は `priority` 昇順で実行されます（既定 100）。プリセットは `SHUTDOWN_PRIORITY.JOBS` (10) → `DISCORD_CLIENT` (100) → `DATABASE` (200)。jobs を最初に止めて新規 interaction や interval を抑え、その後 client / DB を閉じる順を保証するためです

PM2 reload や Docker stop のときに、処理中の interaction や DB transaction を取りこぼさないための仕組みです。

## Tests

`bun test` で `*.test.ts` を実行します。Discord interaction を受け取る handler のテストは、`src/lib/testing/interactions.ts` の mock ヘルパで interaction を組み立てます。

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

実例は `src/framework/discord/interactions/{chatInput,contextMenu,autocomplete,components}/__tests__/`、`src/lib/discord/{replyError,resultHandler,interactionContext,embed,pagination}.test.ts`、`src/lib/infra/{errorWebhook,errorReporter,shutdown}.test.ts`、`src/lib/util/{result,cooldown}.test.ts` を参照してください。

## Scripts

- `bun dev`: 開発起動
- `bun start`: 本番起動
- `bun register`: スラッシュコマンド登録
- `bun check:no-save`: Biome check
- `bun check:tsc`: TypeScript check
