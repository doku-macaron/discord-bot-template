---
name: scheduler-add-job
description: このテンプレで durable な定期実行ジョブ (built-in scheduled job) を 1 つ追加するときのワークフロー。`builtInJobs.ts` で定数を定義し、`ScheduledJobHandler` を書き、`botJobRegistry.ts` で登録、`seedBuiltInJobs.ts` で seed するまで。Use when adding a Postgres-backed recurring/one-off job under `apps/bot/src/jobs/`. プロセス内だけで完結する in-memory な定期処理なら service-add を使う。
---

# Add a scheduled job

scheduler は **Postgres-backed で永続的に動く定期実行**。プロセス再起動・複数ホストをまたいで claim / finalize / stale recovery される。`@repo/scheduler` core が DB を `SchedulerStore` port 越しに触り、bot がその adapter (`schedulerStore.ts`) と handler 群を供給する。

ジョブ追加は 4 ファイルを触る: 定数 → handler → registry → seed。

## いつ使う

- 定期的に走らせたい処理 (interval) や、特定時刻に 1 回走らせたい処理 (once) を **永続的に** 持ちたい
- プロセス再起動をまたいで生き残ってほしい / 複数ホストで重複実行されたくない

**この skill を使わない場合**:
- プロセス内だけの短命タイマー / 再起動で消えてよい → `service-add` (in-memory)

## 前提 (opt-in)

- scheduler は **デフォルト OFF**。`SCHEDULER_ENABLED=true` で有効化する。clientReady で `getEnv("scheduler").SCHEDULER_ENABLED` が真なら `seedBuiltInJobs()` → `startSchedulerWorker()` が走る
- **Postgres が必要** (`scheduled_jobs` / `job_runs` テーブル。`bun db:up` + migrate 済みであること)
- worker は globalThis singleton (`schedulerHost.ts`) で hot reload を生き残る。ここは触らない

## 1. ジョブ定数を定義する

[apps/bot/src/jobs/builtInJobs.ts](../../../apps/bot/src/jobs/builtInJobs.ts) に `as const` で 1 個追加する。これが seed と handler registry の **唯一の source**。`jobType` は handler registry のキーと一致させること:

```ts
export const BUILTIN_FOO = {
    jobKey: "builtin:foo",      // 一意な識別子 (global job は guildId=null + jobKey で unique)
    jobType: "foo",             // ← handler の type と一致させる
    name: "Foo job",            // 人間向けの名前
    intervalMs: 60 * 60_000,    // 実行間隔 (interval ジョブ)
    timeoutMs: 10_000,          // 1 回の実行のタイムアウト
} as const;
```

## 2. ScheduledJobHandler を書く

[apps/bot/src/jobs/handlers/<name>Handler.ts](../../../apps/bot/src/jobs/handlers/) に `ScheduledJobHandler<TPayload>` (`@repo/scheduler`) を実装する。`type` / `parsePayload` (zod で検証) / `run` の 3 つ。`uptimeHandler.ts` が雛形:

```ts
import type { ScheduledJobHandler } from "@repo/scheduler";
import { z } from "zod";
import { BUILTIN_FOO } from "@/jobs/builtInJobs";
import { logger } from "@/lib/infra/logger";

const payloadSchema = z.object({});      // payload を取るなら形を定義
type FooPayload = z.infer<typeof payloadSchema>;

export const fooHandler: ScheduledJobHandler<FooPayload> = {
    type: BUILTIN_FOO.jobType,                          // ← 定数の jobType と一致
    parsePayload: (payload) => payloadSchema.parse(payload),  // DB の payload を検証して型付け
    run: async (context) => {
        // context.payload (parsed) / context.guildId / context.scheduledFor / context.signal
        // signal は best-effort の timeout 中断シグナル。長い処理では尊重する
        logger.info("Core", "foo ran");
    },
};
```

- `run` は `Promise<void> | void`。throw すると worker が `failed` として finalize し、次回 interval で再アーム
- `context.signal` (AbortSignal) は timeout の best-effort 中断。重い処理では `signal.aborted` を見る

## 3. registry に登録する

[apps/bot/src/jobs/handlers/botJobRegistry.ts](../../../apps/bot/src/jobs/handlers/botJobRegistry.ts) の配列に handler を 1 つ足す。この registry から `allowedJobTypes()` が導出され、claim フィルタになる (登録していない type は claim されない = 実行されない):

```ts
import { createHandlerRegistry } from "@repo/scheduler";
import { fooHandler } from "@/jobs/handlers/fooHandler";
import { uptimeHandler } from "@/jobs/handlers/uptimeHandler";

export const botJobRegistry = createHandlerRegistry([uptimeHandler, fooHandler]);  // ← 足す
```

## 4. seed する

[apps/bot/src/jobs/handlers/seedBuiltInJobs.ts](../../../apps/bot/src/jobs/handlers/seedBuiltInJobs.ts) に `upsertScheduledJobDefinition(...)` を 1 つ足す。これが起動時に行を upsert する:

```ts
import { upsertScheduledJobDefinition } from "@repo/db/query/scheduledJob/upsertScheduledJobDefinition";
import { BUILTIN_FOO } from "@/jobs/builtInJobs";

// seedBuiltInJobs() の中に追記
await upsertScheduledJobDefinition({
    guildId: null,                                  // global job
    jobKey: BUILTIN_FOO.jobKey,
    jobType: BUILTIN_FOO.jobType,
    name: BUILTIN_FOO.name,
    scheduleKind: "interval",                       // "interval" | "once"
    intervalMs: BUILTIN_FOO.intervalMs,             // once なら null
    timeoutMs: BUILTIN_FOO.timeoutMs,
    payload: {},
    // INSERT 時のみ適用。初回 fire のタイミングを決める:
    //   - 起動直後に走らせたい:           "now"
    //   - 1 interval 後に初回:            new Date(Date.now() + intervalMs)
    initialNextRunAt: new Date(Date.now() + BUILTIN_FOO.intervalMs),
    // インシデントで disabled/config_error に落ちた built-in を起動時に再アーム
    // (infra ジョブが死んだままにならない)。admin が paused にしたものや running は触らない
    rearmIfStopped: true,
});
```

ポイント:
- `upsertScheduledJobDefinition` は **definition 列だけ** を更新し、`next_run_at` / `lifecycle_state` などの schedule state は保持する → 毎起動 seed しても admin の変更を潰さない
- `initialNextRunAt` / `initialLifecycleState` は **INSERT 分岐のみ** に効く
- `rearmIfStopped: true` はインシデント停止 (disabled / config_error) の built-in だけを再アームする。意図的な `paused` と running は無視される

## 5. 動作確認

- `bun run check:no-save` (biome) / `bun run check:tsc` (型) / `bun test`
- 実動作: `bun db:up` で Postgres を上げ、`SCHEDULER_ENABLED=true` を設定して起動。clientReady で seed + worker 起動 → next_run_at が来ると `run` が呼ばれる
- `payload` を取るジョブは `parsePayload` の zod が DB の値を弾けることを確認

## 参考

- ジョブ定数: [apps/bot/src/jobs/builtInJobs.ts](../../../apps/bot/src/jobs/builtInJobs.ts)
- handler 雛形: [apps/bot/src/jobs/handlers/uptimeHandler.ts](../../../apps/bot/src/jobs/handlers/uptimeHandler.ts)
- registry: [apps/bot/src/jobs/handlers/botJobRegistry.ts](../../../apps/bot/src/jobs/handlers/botJobRegistry.ts)
- seed: [apps/bot/src/jobs/handlers/seedBuiltInJobs.ts](../../../apps/bot/src/jobs/handlers/seedBuiltInJobs.ts)
- store adapter (触らない): [apps/bot/src/jobs/handlers/schedulerStore.ts](../../../apps/bot/src/jobs/handlers/schedulerStore.ts)
- worker singleton (触らない): [apps/bot/src/jobs/schedulerHost.ts](../../../apps/bot/src/jobs/schedulerHost.ts)
- 起動箇所: [apps/bot/src/events/clientReady/index.ts](../../../apps/bot/src/events/clientReady/index.ts)
- scheduler core の型: [packages/scheduler/src/types.ts](../../../packages/scheduler/src/types.ts) (`ScheduledJobHandler` / `ScheduledJobContext`)
- 規約全般: [CONTRIBUTING.md](../../../CONTRIBUTING.md)
