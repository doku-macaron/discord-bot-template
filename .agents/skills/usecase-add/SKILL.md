---
name: usecase-add
description: このテンプレで application 層の usecase を 1 つ追加するときのワークフロー。discord.js に依存せず `Result<T, AppError>` を返し、書き込みは `withTransaction`・読み取りは `resolveDbClient`、テスト用に `options?: { db?: Database }` の seam を持たせる。Use when adding an application-layer orchestrator under `apps/bot/src/usecases/<domain>/<name>UseCase.ts` that composes multiple DB queries (or a single write that needs error typing). 単一 query を events から直接呼ぶだけなら usecase は不要。
---

# Add a usecase

usecase は **application 層のオーケストレーション**。複数 query を 1 transaction に束ねたり、入力検証を一箇所に集約したりする層。`apps/bot/src/usecases/<domain>/<name>UseCase.ts` に置く。

## いつ使う

- 複数の query を **1 transaction で atomic に** 実行したい (FK チェーン確保 + 書き込み等)
- ドメインの検証 (文字数制限など) を events から切り離して固定したい
- 失敗を `Result<T, AppError>` で型付けして、呼び出し元 (`handleResult`) に kind 別ハンドリングさせたい

**この skill を使わない場合**:
- 単一 query を呼ぶだけ → events 層から直接 `@repo/db/query/...` を呼べばよい (usecase は不要)
- query 関数そのものを足す → `drizzle-add-query`

## ルール (テンプレの境界)

1. **discord.js を import しない**。usecase は primitive (string id / 数値 / plain object) だけを受け取る。`interaction` や `Client` を渡さない (CONTRIBUTING.md の "discord.js stays at the boundary")
2. 戻り値は必ず `Result<T, AppError>`。throw しない (callback 内の throw は `withTransaction` が `err` に変換する)
3. import surface は `@repo/*` パッケージ越し:
   - `@repo/db/transaction` — `withTransaction` / `resolveDbClient` / `Database`
   - `@repo/db/query/<domain>/<name>` — 個別 query
   - `@repo/db/schema/<name>.schema` — `Select*` / `Update*` 型
   - `@repo/shared` — `ok` / `err` / `Result`
   - `@repo/shared/error/appError` — `AppError` + 各 constructor

## 1. ファイルと命名

- `apps/bot/src/usecases/<domain>/<name>UseCase.ts`
- export 名 = `<name>UseCase` (例: `saveMemberProfileUseCase`)
- 入力型 `XUseCaseInput` を export し、`guildId` / `userId` などの primitive だけで構成する

## 2. AppError の選び方

`@repo/shared/error/appError` から意図に合う kind を選ぶ。**期待されるエラー** (validation / not_found / permission_denied / rate_limited) は `handleResult` が短い user 向けメッセージ + warn ログにする。それ以外は stack 付きのエラーログになる:

| 状況 | constructor |
|------|-------------|
| 入力が不正 (文字数超過など) | `validationError(devMsg, userMsg?)` |
| 対象が存在しない | `notFoundError(devMsg, userMsg?)` |
| 権限不足 | `permissionDeniedError(devMsg, userMsg?)` |
| 外部 API / レート制限 | `externalError` / `rateLimitedError` |
| 想定外 (unknown を包む) | `fromUnknownError(devMsg, cause)` / `unexpectedError` |

`withTransaction` が返す `result.error` (生 `Error`) は **必ず `fromUnknownError(...)` で `AppError` に詰め替える** (kind が `unexpected`、cause に原因を保持)。

## 3. 書き込み (複数 query を 1 transaction)

`withTransaction` は `Result<T, Error>` を返す。callback 内では各 query に `tx` を渡し、raw 値を return する。最後に `Result<T, AppError>` に詰め替える。`saveMemberProfileUseCase` が雛形:

```ts
import { getOrCreateGuild } from "@repo/db/query/guild/getOrCreateGuild";
import { getOrCreateMemberProfile } from "@repo/db/query/member/getOrCreateMemberProfile";
import { updateMemberProfileBio } from "@repo/db/query/member/updateMemberProfileBio";
import type { SelectMemberProfile } from "@repo/db/schema/memberProfiles.schema";
import { withTransaction } from "@repo/db/transaction";
import { err, ok, type Result } from "@repo/shared";
import { type AppError, fromUnknownError, validationError } from "@repo/shared/error/appError";

export type SaveMemberProfileInput = { guildId: string; userId: string; bio: string };

export async function saveMemberProfileUseCase(
    input: SaveMemberProfileInput
): Promise<Result<SelectMemberProfile, AppError>> {
    if (input.bio.length > 200) {
        // validation は transaction を開かずに早期 return
        return err(validationError(`bio too long: ${input.bio.length}`, "自己紹介は200文字以内で入力してください。"));
    }

    const result = await withTransaction(async (tx) => {
        const guild = await getOrCreateGuild({ guildId: input.guildId }, tx);     // ← 同じ tx を
        await getOrCreateMemberProfile({ guildId: guild.guildId, userId: input.userId }, tx); // ← 各 query に
        return updateMemberProfileBio({ guildId: guild.guildId, userId: input.userId, bio: input.bio }, tx);
    });

    if (!result.success) {
        return err(fromUnknownError("failed to save member profile", result.error));
    }
    return ok(result.data);
}
```

- `tx` を **各 query に明示的に渡す** (忘れると個別接続になり atomic 性が壊れる)
- validation は transaction を開く前に弾く (DB を無駄に触らない)

## 4. 読み取り (transaction 不要) の test seam

読み取り専用 usecase で、なおかつ Postgres-backed test を書きたい場合は `options?: { db?: Database }` の seam を持たせ、`resolveDbClient(options)` で client を解決して各 query に渡す:

```ts
import { type Database, resolveDbClient } from "@repo/db/transaction";

export async function loadXUseCase(
    input: LoadXInput,
    options?: { db?: Database }
): Promise<Result<X, AppError>> {
    const client = resolveDbClient(options);   // options.db があればそれ、無ければ global db
    const row = await findX(input, client);
    // ...
}
```

`resolveDbClient` は `options.db ?? db` を返すだけ。global `db` の参照を db パッケージ内に閉じ込めるためのヘルパー。書き込み usecase なら `withTransaction(cb, { db: options?.db })` で同じ seam を通せる。

## 5. テスト

2 通り。どちらか / 両方:

### (a) query を mock.module で差し替える unit test
配線 (どの tx が各 query に渡るか、throw が AppError に化けるか) を固定する。`apps/bot/src/usecases/member/__tests__/saveMemberProfileUseCase.test.ts` が雛形。`@repo/db/transaction` と各 `@repo/db/query/...` を `mock.module(...)` で差し替え、sentinel `tx` が全 query に伝播することと、`result.error.kind` を assert する。

### (b) createTestDb で Postgres-backed test
本物の DB に当てたいとき。`@repo/db/testing/testDb` の `createTestDb()` が **隔離 schema** (`test_<uuid>`) を作って `{ db, close }` を返す。`db` を usecase の `{ db }` seam に渡す:

```ts
import { createTestDb } from "@repo/db/testing/testDb";

const { db, close } = await createTestDb();
try {
    const result = await saveMemberProfileUseCase(input, { db });  // 書き込み usecase は withTransaction(cb, { db })
    expect(result.success).toBe(true);
} finally {
    await close();   // schema を DROP
}
```

- **`DATABASE_URL_TEST` が必須** (dev DB とは別の DB を指すこと)。`bun db:up` でテスト DB を起動
- migration は process 内で 1 回だけ `public` に流れ、各テストはそれを clone するので速い

## 6. 呼び出し側 (events 層)

events / items から呼び、`Result` を `handleResult` に渡す。`handleResult` は `AppError` の kind を見て user 向け返信とログを出し分ける:

```ts
import { handleResult } from "@/lib/discord/resultHandler";

const saved = await handleResult(
    await saveMemberProfileUseCase({ guildId: interaction.guildId, userId: interaction.user.id, bio }),
    interaction,
    { category: "Database", errorMessage: "保存に失敗しました。" }
);
if (!saved) return;   // 失敗時は handleResult が返信済み
```

## 7. 動作確認

- `bun run check:no-save` (biome)
- `bun run check:tsc` (型)
- `bun test` (mock test は常時 / createTestDb test は `DATABASE_URL_TEST` がある時)

## 参考

- 書き込み雛形: [apps/bot/src/usecases/member/saveMemberProfileUseCase.ts](../../../apps/bot/src/usecases/member/saveMemberProfileUseCase.ts)
- unit test 雛形: [apps/bot/src/usecases/member/__tests__/saveMemberProfileUseCase.test.ts](../../../apps/bot/src/usecases/member/__tests__/saveMemberProfileUseCase.test.ts)
- transaction helper: [packages/db/src/transaction.ts](../../../packages/db/src/transaction.ts) (`withTransaction` / `resolveDbClient` / `Database`)
- testDb helper: [packages/db/src/testing/testDb.ts](../../../packages/db/src/testing/testDb.ts)
- AppError: [packages/shared/src/error/appError.ts](../../../packages/shared/src/error/appError.ts)
- handleResult: [apps/bot/src/lib/discord/resultHandler.ts](../../../apps/bot/src/lib/discord/resultHandler.ts)
- query を足したい: `drizzle-add-query` / 規約全般: [CONTRIBUTING.md](../../../CONTRIBUTING.md)
