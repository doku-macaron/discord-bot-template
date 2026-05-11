---
name: drizzle-add-query
description: このテンプレで既存テーブルに対する drizzle query を 1 つ追加するときのワークフロー。`defineQuery` ヘルパー、`Pick<Insert*>` ベースの入力型、`getOrCreate*` / `find*` / `update*` といった命名規約を踏襲する。Use when adding a query function under `src/db/query/<domain>/` to an existing table (no schema change). schema 自体を触る場合は drizzle-schema-change を先に使うこと。
---

# Drizzle: add a query

`src/db/query/<domain>/<name>.ts` に新しい query を 1 つ追加するための手順。schema は変えない前提。

## いつ使う

- 既存テーブルに対する新しい SELECT / INSERT / UPDATE / DELETE を 1 関数で追加する
- 既存 query では満たせない読み出しパターンが欲しい

**この skill を使わない場合**:
- schema 自体を変える必要がある → `drizzle-schema-change`
- 既存 query の改修だけ → ad-hoc に編集
- 複数 query を atomic に束ねたい → この skill で個別 query を作ったあと、`src/usecases/<domain>/` で `withTransaction` を呼ぶ usecase を 1 関数書く (usecase 単体の作り方は本 skill 末尾を参照)

## 1. 置き場所と命名

- ファイル: `src/db/query/<domain>/<name>.ts` (`<domain>` は `guild` / `member` など、対応する schema の集合)
- export 名 = ファイル名 stem (camelCase)
- 命名規約 (テンプレに既出のパターン):
  - `getOrCreate*` — INSERT ON CONFLICT DO NOTHING + 行が無ければ SELECT (FK 確保)
  - `find*` — 読み取り専用。無ければ `null`
  - `update*` — 既存行への UPDATE
  - `recordX` — lifecycle 系の upsert (例: `recordGuildJoin`)
  - `markX` — フラグ立て (例: `markGuildLeft`)
  - `incrementX` — counter 系
- 1 query 1 ファイル。複数を 1 ファイルに同居させない (mock しにくくなる)

## 2. 必ず `defineQuery` を経由する

[src/db/query/defineQuery.ts](../../../src/db/query/defineQuery.ts) を必ず使う。global `db` を直接掴むことを禁じる仕掛けになっていて、`withTransaction` から渡される `tx` を受け取れる形が型強制される。

```ts
import { defineQuery } from "@/db/query/defineQuery";
import { guilds, type InsertGuild, type SelectGuild, type UpdateGuild } from "@/db/schema/guilds";

export type FooInput = Pick<InsertGuild, "guildId">;  // INSERT 系は必要フィールドだけ Pick

export const foo = defineQuery<[input: FooInput], SelectGuild>(async (input, client) => {
    // client は DbClient = Database | Transaction (defineQuery が global db か tx を渡す)
    const [row] = await client.insert(guilds).values(input).onConflictDoNothing().returning();
    // ...
});
```

ポイント:
- 第 1 ジェネリック: `[input: FooInput]` の **labeled tuple**。複数引数を取る query にも対応する変動長で書ける (例: `[guildId: string, userId: string]`)
- 第 2 ジェネリック: 戻り値の型
- inner 関数の最後の引数は必ず `client: DbClient`。default 値は書かない (helper が供給する)

## 3. 入力型の作り方

- **INSERT 系**: `Pick<InsertX, "...">` でテンプレ schema の zod-inferred 型から必要列だけ拾う。schema が変わったら caller がコンパイルエラーで気づく
- **UPDATE 系**: partial が必要なら `UpdateX` を内包した独自 input 型 (`{ guildId: string; settings: UpdateGuildSettings }` のような形)
- **SELECT / DELETE 系**: 識別子だけの単純な型でよい (`{ guildId: string; userId: string }`)
- `Insert*` / `Select*` / `Update*` zod types は schema ファイルに既にある — 自前で書き直さない

## 4. ON CONFLICT の選び方

`INSERT ... ON CONFLICT ...` で挙動が変わるので意図に合わせて選ぶ:

- `onConflictDoNothing()` + RETURNING + 失敗時 SELECT fallback
  - 用途: getOrCreate (行があれば触らない、無ければ作る)
  - 注: `DO NOTHING` は既存行に対して RETURNING を返さないので、SELECT で取り直すコードが要る
- `onConflictDoUpdate({ target, set })`
  - 用途: 値を必ず refresh したいとき (`recordGuildJoin` の joinedAt / leftAt リセット)
  - 注: set は SchemaUpdate 型 (`{name: input.name}` のような形)。caller が undefined を渡したフィールドを `?? ""` で埋めると **既存値を空文字で破壊する** のでやらない。`set: { x: input.x } satisfies UpdateX` の形で「caller が値を渡したフィールドだけ更新」する

`updatedAt` は schema の `.$onUpdate(() => new Date())` が UPDATE 時に自動セットするので、set に明示的に書かない。

## 5. 例: 4 種類のパターン

`src/db/query/` 配下に揃っているので参考にする:

- `getOrCreateGuild` — ON CONFLICT DO NOTHING + SELECT fallback。lifecycle 列を触らない get-or-create
- `recordGuildJoin` — ON CONFLICT DO UPDATE。lifecycle 列を必ずリセット
- `findMemberProfile` — read-only。無ければ `null`
- `updateMemberProfileBio` — 既存行への UPDATE。行が無い場合は throw

## 6. 動作確認

- `bun run check:no-save` (biome)
- `bun run check:tsc` (型)
- `bun test` (既存テスト + 必要なら新規)

新規 query の unit test は基本不要 (drizzle のクエリ層は I/O の薄いラッパーなので mock が脆くなりがち)。
**ただし** その query を呼ぶ usecase 側に、`mock.module` で query を差し替えるテストを書くと配線が固定できる。例: [src/usecases/member/\_\_tests\_\_/saveMemberProfileUseCase.test.ts](../../../src/usecases/member/__tests__/saveMemberProfileUseCase.test.ts)

## 補足: 複数 query を 1 transaction にまとめたい時

usecase 層 (`src/usecases/<domain>/<name>UseCase.ts`) を新規追加する。テンプレが想定する型:

```ts
import { withTransaction } from "@/db/transaction";
import type { Result } from "@/lib/util/result";

export async function fooUseCase(input: FooInput): Promise<Result<SomeReturn, Error>> {
    return withTransaction(async (tx) => {
        const a = await query1(arg1, tx);
        const b = await query2({ ...arg2, fk: a.id }, tx);
        return b;
    });
}
```

- 戻り値は `Result<T, Error>` (`withTransaction` が ROLLBACK + err でラップしてくれる)
- callback 内では raw 値を return すれば OK (`ok(...)` で包む必要なし)
- `tx` を各 query に明示的に渡す (これを忘れると個別接続になって atomic 性が壊れる)
- 1 query しか呼ばない usecase は基本不要 (events 層から直接 query を呼べばよい)

## 参考

- helper: [src/db/query/defineQuery.ts](../../../src/db/query/defineQuery.ts)
- transaction helper: [src/db/transaction.ts](../../../src/db/transaction.ts)
- 既存 query: [src/db/query/](../../../src/db/query/)
- 既存 usecase: [src/usecases/](../../../src/usecases/)
- 規約全般 (layer 責務 / 命名 / discord.js boundary): [CONTRIBUTING.md](../../../CONTRIBUTING.md)
