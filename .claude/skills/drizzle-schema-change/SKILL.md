---
name: drizzle-schema-change
description: このテンプレ (Bun + drizzle + PGlite/Postgres) で DB schema 自体を変更する際に、連鎖する更新 (drizzle config / migration / queries / usecases / events / seed-reset / tests) を漏れなく辿るためのワークフロー。Use when adding, dropping, or renaming tables/columns or regenerating migrations in `src/db/schema/`. 既存テーブルに query だけ足したい場合は drizzle-add-query を使うこと。
---

# Drizzle schema change

このテンプレで `src/db/schema/` を触る作業の標準手順。schema を変えたときの「あれ忘れた」を防ぐために用意してある。

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
# schema 一覧
ls src/db/schema/

# 使われているコード側 (column 名 / テーブル名で grep)
rg "<column-name>|<TableName>" src --type ts -l

# drizzle config がどの schema を列挙しているか
grep schema drizzle*.config.ts

# 既存 migration を把握
ls drizzle/
```

カラム drop の場合は **reader と writer を別々に把握** する。reader が居る場合は移行戦略 (代替値 / 削除時の UI 変更) を先に決める。Discord から取れる値の DB 重複保管は避ける (history を持たないなら storage は不要)。

## 2. 変更計画を立てる

最低限以下を決めてから手を動かす:

- schema files の差分 (新規 / 修正 / 削除 / リネーム)
- drizzle config の schema 配列を更新する必要があるか
- migration の方針:
  - **incremental** (本番運用中): `bun generate:local` で新しい migration を 1 個増やす
  - **fresh** (テンプレ・PoC のみ): 既存 `drizzle/<timestamp>_*` を削除して `bun generate:local` で initial を作り直す
- queries: 削除 / 簡素化 / 新規 (全 query は `defineQuery` 経由)
- usecases: 入出力型と `withTransaction` 内のフロー変化
- events / items: UI 表示と入力対象の変化
- scripts: `seedLocalDb.ts` と `resetLocalDb.ts` の対象テーブル更新
- tests: schema test / usecase の mock 差し替え / 新 usecase の unit test

## 3. 実装順序

1. **schema files** — 各テーブルの定義 + `createInsertSchema` / `createSelectSchema` / `createUpdateSchema` を一気に書く
2. **relations.ts / index.ts / schema.test.ts** — 新テーブルを relations にも export にも入れて、schema.test.ts の expect も更新
3. **drizzle config** — `drizzle.config.ts` と `drizzle-dev.config.ts` の `schema` 配列を新ファイル一覧に
4. **migration** — fresh なら既存 `drizzle/<id>/` を削除してから、`bun generate:local`
5. **local DB** — `bun db:reset:local` で truncate + 再 migrate
6. **queries** — 削除 / 簡素化 / 追加。query 単体の作り方 (`defineQuery` の使い方、入力型の絞り方、命名規約) は `drizzle-add-query` に任せる。schema-change としてはどの query を増やす / 消す / 直すかを決めるところまで
7. **usecases** — DB 層をまたぐ集約は `src/usecases/<domain>/` で `withTransaction` を使い、`tx` を各 query に渡す
8. **events / items** — UI が読む / 書く対象を新スキーマに合わせる。discord.js から取れる値は usecase に渡さず、events 側で primitive に変換 (CONTRIBUTING.md の "discord.js stays at the boundary")
9. **scripts** — `seedLocalDb.ts` の `insert` 対象と `resetLocalDb.ts` の `truncate` 対象を新テーブル群で更新
10. **tests** — 新 usecase は `mock.module` で query を差し替える unit test を追加。既存 test は新シグネチャに合わせる

## 4. fresh migration の取り扱い

- drizzle は `drizzle/<id>/snapshot.json` を baseline として diff を計算する。`drizzle/<id>/` を丸ごと削除すれば、次回 `bun generate:local` がゼロから書き起こす
- `bun db:reset:local` は内部で truncate + 再 migrate を回すので、fresh migration を当てるのに使える
- **本番運用中のリポジトリではやらない** (forward-only の原則を破る。本番 DB のデータが消える)。本番に出る前のテンプレ / PoC でのみ許される

## 5. 動作確認

```bash
bun run check:no-save   # biome (schema import の sort / unused / type-only mode)
bun run check:tsc       # 型整合性、特に Insert/Select 型と caller の引数
bun test                # 既存 + 新規 unit test
```

加えて以下を目視:

```bash
cat drizzle/<new-timestamp>_*/migration.sql   # CREATE / DROP / ALTER の意図と一致するか
rg "<old-name>" src --type ts                 # 旧テーブル / カラム名が残っていないか
```

ER 図は lefthook の `02-generate-er-diagram` が `git commit` 時に自動生成するので意識不要。

## 参考: このテンプレでの DB 関連配置

- schema: [src/db/schema/](src/db/schema/)
- queries: [src/db/query/<domain>/](src/db/query/)
- defineQuery helper: [src/db/query/defineQuery.ts](src/db/query/defineQuery.ts) — 新規 query は必ずこれ経由
- usecases: [src/usecases/<domain>/](src/usecases/)
- transaction helper: [src/db/transaction.ts](src/db/transaction.ts) (`withTransaction`, `DbClient`)
- events: [src/events/](src/events/)
- seed / reset: [scripts/seedLocalDb.ts](scripts/seedLocalDb.ts), [scripts/resetLocalDb.ts](scripts/resetLocalDb.ts)
- drizzle config: [drizzle.config.ts](drizzle.config.ts) (本番), [drizzle-dev.config.ts](drizzle-dev.config.ts) (ローカル PGlite)
- lefthook の自動生成 ER 図: [docs/schema_diagram.md](docs/schema_diagram.md)
