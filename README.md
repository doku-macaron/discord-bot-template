# Discord Bot Template with DB

Bun + discord.js + Drizzle ORM + PostgreSQL/PGlite の Discord Bot テンプレートです。

ローカル開発では PGlite を使うため、PostgreSQL サーバーを立てずに DB つき Bot を動かせます。本番では `DATABASE_URL` に PostgreSQL の接続文字列を指定します。

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
TOKEN="Discord bot token"
CLIENT_ID="Discord application client ID"
GUILD_ID="Optional: development guild ID"
DATABASE_URL="Production PostgreSQL URL"
DATABASE_URL_DEV="./.pglite"
WEBHOOK_URL="Optional: Discord webhook URL for error reports"
```

## Development

```sh
bun generate:local
bun migrate:local
bun register
bun dev
```

`GUILD_ID` を設定している場合、`bun register` はそのサーバーにだけコマンドを登録します。未設定の場合はグローバルコマンドとして登録します。

## Environment

環境変数は `src/env.ts` の `getEnv` で用途別に検証します。

- `getEnv("bot")`: Bot起動に必要な `TOKEN`
- `getEnv("register")`: コマンド登録に必要な `TOKEN` / `CLIENT_ID` / optional `GUILD_ID`
- `getEnv("postgres")`: 本番DB接続に必要な `DATABASE_URL`
- `getEnv("pglite")`: ローカルDB用の `DATABASE_URL_DEV`
- `getEnv("webhook")`: optional `WEBHOOK_URL`

## Commands

- `/ping`: Bot の応答確認
- `/profile view`: DB に guild/member を保存し、実行回数を更新するサンプル
- `/profile edit`: モーダルでプロフィール表示名を更新するサンプル

## Interaction Structure

interaction は種類ごとに handler/register を分けています。

- `src/events/interactionCreate/command`: slash command
- `src/events/interactionCreate/interactions/buttons`: button
- `src/events/interactionCreate/interactions/modals`: modal
- `src/events/interactionCreate/interactions/menus`: select menu

`src/lib/interactionContext.ts` と `src/lib/logger.ts` で、エラー時に command/customId/user/guild/channel/interactionId/ageMs をログへ出します。
`WEBHOOK_URL` を設定している場合だけ、同じ内容を Discord webhook にも通知します。

`customId` は `feature:action` または `feature:action:id` の形式を推奨します。
固定IDは `CUSTOM_ID`、動的IDに対応する正規表現は `CUSTOM_ID_PATTERN` にまとめます。

## Database

スキーマは `src/db/schema` にあります。
DB query が失敗しうる処理では `src/lib/result.ts` の `Result` 型と `src/lib/resultHandler.ts` の `handleResult` を使うと、ログ出力・webhook通知・ユーザーへのエラー返信をまとめて扱えます。
複数のDB操作をまとめる場合は `src/db/transaction.ts` の `withTransaction` を使うと、transaction失敗を `Result` として扱えます。

```sh
bun generate:local   # ローカル PGlite 用 migration 作成
bun migrate:local    # ローカル PGlite へ migration 適用
bun studio:local     # ローカル DB を Drizzle Studio で確認
```

本番DB向けには以下を使います。

```sh
bun generate
bun migrate
bun studio
```

ER 図は `bun generateERdiagram` で `docs/schema_diagram.md` に生成できます。

## Scripts

- `bun dev`: 開発起動
- `bun start`: 本番起動
- `bun register`: スラッシュコマンド登録
- `bun check:no-save`: Biome check
- `bun check:tsc`: TypeScript check
