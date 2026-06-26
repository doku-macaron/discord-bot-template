---
name: drizzle-schema-change
description: このテンプレ (Bun monorepo + drizzle + Postgres) で DB schema 自体を変更する際に、連鎖する更新 (schema file / relations / migration / queries / usecases / events / seed-reset / tests) を漏れなく辿るためのワークフロー。Use when adding, dropping, or renaming tables/columns or regenerating migrations in `packages/db/src/schema/`. 既存テーブルに query だけ足したい場合は drizzle-add-query を使うこと。
---

# Drizzle schema change

このテンプレで `packages/db/src/schema/` を触る作業の標準手順。schema は `@repo/db` パッケージにあり、Postgres-only (PGlite fallback は無い)。schema を変えたときの「あれ忘れた」を防ぐために用意してある。

## いつ使う

- カラムの追加 / 削除 / リネーム / 型変更
- テーブルの新設 / リネーム / 削除
- migration を fresh で作り直したい (本番デプロイ前のテンプレ・PoC 段階のみ)

**この skill を使わない場合**:
- 既存テーブルに query を追加するだけ → `drizzle-add-query`
- 既存 query を改修するだけ → ad-hoc に編集
- 1 カラム追加で caller も無い trivial 変更 → ad-hoc に編集

## 1. 影響範囲の事前把握 (read-only)

```bash
# schema 一覧 (フラットな `<name>.schema.ts`)
ls packages/db/src/schema/

# 使われているコード側 (column 名 / テーブル名で grep。bot もパッケージも横断)
rg "<column-name>|<TableName>" apps packages --type ts -l

# 既存 migration を把握
ls packages/db/drizzle/
```

カラム drop の場合は **reader と writer を別々に把握** する。reader が居る場合は移行戦略 (代替値 / 削除時の UI 変更) を先に決める。Discord から取れる値の DB 重複保管は避ける (history を持たないなら storage は不要)。

## 2. schema file の規約

- ファイル名は **`<name>.schema.ts`** (フラット、サブディレクトリ可)。例: `guilds.schema.ts`, `jobs/scheduledJobs.schema.ts`
- **glob barrel が自動収集する**: `packages/db/src/schema/index.ts` が `Bun.Glob("**/*.schema.ts")` で全 `*.schema.ts` を走査し、`isTable` な export を `schema` に集める。**barrel も drizzle config も手で編集しない** — 命名規約に従ってファイルを置くだけで拾われる
- drizzle config (`packages/db/drizzle.config.ts`) も `schema: ["./src/schema/**/*.schema.ts", "./src/schema/relations.ts"]` の glob なので、新ファイルは自動で対象になる
- **パッケージ内は相対 import** (`@/` ではなく `./guilds.schema` のように)。`@/` はクロスパッケージの consumer から解決できないため
- 各テーブルで `createInsertSchema` / `createSelectSchema` / `createUpdateSchema` を書き、`InsertX` / `SelectX` / `UpdateX` 型を export する (`memberProfiles.schema.ts` を雛形に)

## 3. 変更計画を立てる

最低限以下を決めてから手を動かす:

- schema files の差分 (新規 / 修正 / 削除 / リネーム)
- `relations.ts` の更新 (これは **手動**。glob 対象外。新テーブルを `tables` と `defineRelations` の両方に追加)
- `schema.test.ts` の expect 更新
- migration の方針:
  - **incremental** (本番運用中): `bun db:generate` で新しい migration を 1 個増やす
  - **fresh** (テンプレ・PoC のみ): 既存 `packages/db/drizzle/<timestamp>_*` を削除して `bun db:generate` で initial を作り直す
- queries: 削除 / 簡素化 / 新規 (全 query は `defineQuery` 経由 → `drizzle-add-query`)
- usecases: 入出力型と `withTransaction` 内のフロー変化 → `usecase-add`
- events / items: UI 表示と入力対象の変化
- scripts: `packages/db/scripts/seedLocalDb.ts` と `resetLocalDb.ts` の対象テーブル更新
- tests: schema test / usecase の mock 差し替え / 新 usecase の unit test

## 4. 実装順序

1. **schema files** — 各テーブルの定義 + `createInsertSchema` / `createSelectSchema` / `createUpdateSchema` を一気に書く。フラットな `<name>.schema.ts` で置けば barrel が自動で拾う
2. **relations.ts / schema.test.ts** — 新テーブルを `relations.ts` の `tables` + `defineRelations` に入れ、`schema.test.ts` の expect も更新
3. **migration** — まず Docker Postgres を起動 (`bun db:up`)。fresh なら既存 `packages/db/drizzle/<id>/` を削除してから `bun db:generate`
4. **local DB に適用** — `bun db:migrate:local` (fresh で作り直したなら `bun db:reset:local` で truncate + 再 migrate)
5. **queries** — 削除 / 簡素化 / 追加。query 単体の作り方は `drizzle-add-query` に任せる。schema-change としてはどの query を増やす / 消す / 直すかを決めるところまで
6. **usecases** — DB 層をまたぐ集約は `apps/bot/src/usecases/<domain>/` で `withTransaction` を使い、`tx` を各 query に渡す
7. **events / items** — UI が読む / 書く対象を新スキーマに合わせる。discord.js から取れる値は usecase に渡さず、events 側で primitive に変換 (CONTRIBUTING.md の "discord.js stays at the boundary")
8. **scripts** — `packages/db/scripts/seedLocalDb.ts` の `insert` 対象と `resetLocalDb.ts` の `truncate` 対象を新テーブル群で更新
9. **tests** — 新 usecase は `mock.module` で query を差し替える unit test、または `createTestDb` で Postgres-backed test を追加。既存 test は新シグネチャに合わせる

## 5. migration コマンドまとめ

```bash
bun db:up              # Docker Postgres 起動 (generate / migrate の前提)
bun db:generate        # schema 差分から migration SQL を生成 (@repo/db で drizzle-kit generate)
bun db:migrate:local   # 生成した migration を local DB に適用
bun db:reset:local     # truncate + 再 migrate (fresh migration の適用に使える)
```

- drizzle は `packages/db/drizzle/<id>/snapshot.json` を baseline として diff を計算する。`drizzle/<id>/` を丸ごと削除すれば、次回 `bun db:generate` がゼロから書き起こす
- **本番運用中のリポジトリで fresh migration はやらない** (forward-only の原則を破る。本番 DB のデータが消える)。本番に出る前のテンプレ / PoC でのみ許される

## 6. 動作確認

```bash
bun run check:no-save   # biome (schema import の sort / unused / type-only mode)
bun run check:tsc       # 型整合性、特に Insert/Select 型と caller の引数
bun test                # 既存 + 新規 unit test
```

加えて以下を目視:

```bash
cat packages/db/drizzle/<new-timestamp>_*/migration.sql   # CREATE / DROP / ALTER の意図と一致するか
rg "<old-name>" apps packages --type ts                   # 旧テーブル / カラム名が残っていないか
```

ER 図は lefthook が `git commit` 時に自動生成するので意識不要。

## 参考: このテンプレでの DB 関連配置

- schema: [packages/db/src/schema/](../../../packages/db/src/schema/) (`<name>.schema.ts`, glob で自動収集)
- glob barrel: [packages/db/src/schema/index.ts](../../../packages/db/src/schema/index.ts) — **手で編集しない**
- relations (手動): [packages/db/src/schema/relations.ts](../../../packages/db/src/schema/relations.ts)
- queries: [packages/db/src/query/<domain>/](../../../packages/db/src/query/)
- defineQuery helper: [packages/db/src/query/defineQuery.ts](../../../packages/db/src/query/defineQuery.ts) — 新規 query は必ずこれ経由
- usecases: [apps/bot/src/usecases/<domain>/](../../../apps/bot/src/usecases/)
- transaction helper: [packages/db/src/transaction.ts](../../../packages/db/src/transaction.ts) (`withTransaction`, `resolveDbClient`, `DbClient`)
- events: [apps/bot/src/events/](../../../apps/bot/src/events/)
- seed / reset: [packages/db/scripts/seedLocalDb.ts](../../../packages/db/scripts/seedLocalDb.ts), [packages/db/scripts/resetLocalDb.ts](../../../packages/db/scripts/resetLocalDb.ts)
- drizzle config: [packages/db/drizzle.config.ts](../../../packages/db/drizzle.config.ts) (Postgres only)
- consumer の import surface: `@repo/db` / `@repo/db/transaction` / `@repo/db/query/<domain>/<name>` / `@repo/db/schema/<name>.schema` / `@repo/db/testing/testDb`
- 規約全般: [CONTRIBUTING.md](../../../CONTRIBUTING.md)
