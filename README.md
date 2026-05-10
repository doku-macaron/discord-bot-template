# Discord Bot Template with DB

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
- 不要なサンプル commands (`src/events/interactionCreate/command/commands/`)

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

### Production migration

本番環境では PR にスキーマ変更を含めるたびに `bun generate` で migration ファイルをコミットし、デプロイ前に `bun migrate` を流します。

- ローカルで `bun generate` → `drizzle/` の差分を必ずレビューする
- デプロイ前に `DATABASE_URL` を本番に向けて `bun migrate` を実行する（CI から実行する場合は `migrate` ジョブをデプロイの直前に挟む）
- migration はアプリ起動より前に完了している前提。Bot は migration を自動実行しない

rollback 方針は **forward-only** を推奨します。

- `drizzle/` の migration を消して戻すことはしない
- 戻したい変更があれば、戻すための新しい migration を作って前進する
- スキーマ変更とコード変更の互換性は段階的に進める（例: カラム追加 → コードで書き込み開始 → コードで読み取りに切替 → 旧カラム削除）

## Graceful shutdown

`SIGINT` / `SIGTERM` を受けると `src/lib/shutdown.ts` の `runShutdown` が走り、進行中の interaction を待ってから Discord client と DB を順に close します。

- 進行中 interaction の待機タイムアウト: 10 秒（既定）
- 各タスクのタイムアウト: 5 秒（既定）
- 追加の close 処理は `registerShutdownTask({ name, run })` で登録できます

PM2 reload や Docker stop のときに、処理中の interaction や DB transaction を取りこぼさないための仕組みです。

## Scripts

- `bun dev`: 開発起動
- `bun start`: 本番起動
- `bun register`: スラッシュコマンド登録
- `bun check:no-save`: Biome check
- `bun check:tsc`: TypeScript check
