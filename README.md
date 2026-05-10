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

## Database

スキーマは `src/db/schema` にあります。

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
