---
name: service-add
description: このテンプレで stateful な Discord-aware オーケストレーター (service) を 1 つ追加するときのワークフロー。module state は `globalThis` の `Symbol.for(...)` キーに固定して hot reload を生き残らせ、`Client` は import せず引数で受け取る。Use when adding an in-process stateful coordinator under `apps/bot/src/service/<domain>/<name>Service.ts` (timers / caches / debouncers / live state). 純粋な DB オーケストレーションで状態を持たないなら usecase-add を使う。
---

# Add a service

service は **プロセス内に状態を持つ Discord-aware なオーケストレーター**。タイマー・キャッシュ・デバウンサ・ライブ集計など、「DB に落とすほどではないが処理中の状態を抱える」コンポーネントを置く層。`apps/bot/src/service/<domain>/<name>Service.ts`。

## いつ使う

- 進行中の in-memory 状態を持つ (アクティブなタイマー集合、保留中の集計、短命キャッシュ)
- Discord に副作用を出す (channel に送信する等) が、状態管理が主目的

**この skill を使わない場合**:
- 状態を持たない DB オーケストレーション → `usecase-add` (`Result<T, AppError>` を返す純関数)
- **永続化が必要** / プロセス再起動をまたぐ定期実行 → `scheduler-add-job` (service の in-memory state は restart で消える)

## 2 つのルール (これを守ると hot-reload-safe + テスト可能になる)

1. **module state は `globalThis` に固定する**。ユニークな `Symbol.for("@repo/bot/service/<name>")` キーの下に置く。dev hot reload はこの module を再評価するが、state は再生成せず同じものを再利用する (in-flight な処理を orphan にしない)
2. **`Client` は import せず引数で受け取る**。`@/client` を掴まない。fake client でユニットテストできるようにするため

## 1. ファイルと state の固定

`apps/bot/src/service/<domain>/<name>Service.ts`。state は getter 経由でのみ触る:

```ts
import { type Client, userMention } from "discord.js";
import { logger } from "@/lib/infra/logger";

type FooState = {
    active: Map<string, ReturnType<typeof setTimeout>>;
    nextId: number;
};

const STATE_KEY = Symbol.for("@repo/bot/service/foo");   // ユニークなキー
type GlobalWithState = typeof globalThis & { [STATE_KEY]?: FooState };

function getState(): FooState {
    const g = globalThis as GlobalWithState;
    g[STATE_KEY] ??= { active: new Map(), nextId: 0 };   // 初回だけ生成、以降は再利用
    return g[STATE_KEY];
}
```

## 2. Client は引数で受け取る

公開関数は input object で `client: Client` を受ける。module レベルで client を import / capture しない:

```ts
export type ScheduleFooInput = {
    client: Client;        // ← import せず引数で渡す
    channelId: string;
    userId: string;
    message: string;
    fireAt: Date;
    onFire?: () => Promise<void>;
};

export function scheduleFoo(input: ScheduleFooInput): string {
    const state = getState();
    const id = `foo-${state.nextId++}`;
    const handle = setTimeout(() => {
        state.active.delete(id);
        void fire(input);
    }, Math.max(0, input.fireAt.getTime() - Date.now()));
    state.active.set(id, handle);
    return id;
}
```

## 3. Discord への副作用 + エラー処理

副作用 (channel 送信など) は try/catch で囲み、Discord REST の throw を握りつぶしてログに落とす。`reply` 系のように `Result` を返したい局面では、`classifyDiscordError` (`@/lib/discord/discordApiError`) で raw な throw を kind 付き `AppError` に変換できる (404 → not_found、403 → permission_denied、429 → rate_limited、その他 → external):

```ts
async function fire(input: ScheduleFooInput): Promise<void> {
    try {
        const channel = await input.client.channels.fetch(input.channelId);
        if (channel?.isSendable()) {
            await channel.send(`${userMention(input.userId)} ⏰ ${input.message}`);
        }
        await input.onFire?.();
    } catch (e) {
        logger.error("Bot", e instanceof Error ? e : new Error(String(e)));
    }
}
```

Mention safety: `client.ts` の `allowedMentions: { parse: [] }` default のため、`content` 内の mention は ping を発火しない。意図して ping するなら send 側で `allowedMentions: { users: [userId] }` を明示 opt-in する。

## 4. ライフサイクル + test 用 reset

cancel / count などの操作を export し、テストが state を漏らさないための reset も用意する。**reset は本番でも no-op になるよう prod ガードを置く**:

```ts
export function cancelAllFoo(): void {
    const state = getState();
    for (const handle of state.active.values()) clearTimeout(handle);
    state.active.clear();
}

export function activeFooCount(): number {
    return getState().active.size;
}

// Test-only: prod では何もしない。固定された state を初期化してテスト間のリークを防ぐ。
export function _resetFooServiceForTest(): void {
    if (process.env.NODE_ENV === "production") return;
    cancelAllFoo();
    getState().nextId = 0;
}
```

## 5. テスト

`Client` を引数で受けるので fake client を渡せる。各テスト冒頭で `_resetFooServiceForTest()` を呼ぶ。`timerService.test.ts` が雛形:

```ts
function fakeClient(onSend: (c: string) => void): Client {
    return {
        channels: { fetch: async () => ({ isSendable: () => true, send: async (c: string) => onSend(c) }) },
    } as unknown as Client;
}
```

state が `globalThis` の `Symbol.for(...)` に乗っていることも assert できる (hot-reload 生存の回帰防止)。

## 6. 起動側 (events 層から呼ぶ)

service の関数は events / items / clientReady などから `client` を渡して呼ぶ。state は globalThis にあるので import するだけで共有される。

## 7. 動作確認

- `bun run check:no-save` (biome)
- `bun run check:tsc` (型)
- `bun test` (fake client で service の挙動)

## 参考

- 雛形: [apps/bot/src/service/timer/timerService.ts](../../../apps/bot/src/service/timer/timerService.ts) + [timerService.test.ts](../../../apps/bot/src/service/timer/timerService.test.ts)
- Discord error 分類: [apps/bot/src/lib/discord/discordApiError.ts](../../../apps/bot/src/lib/discord/discordApiError.ts) (`classifyDiscordError`)
- globalThis 固定の別例 (worker singleton): [apps/bot/src/jobs/schedulerHost.ts](../../../apps/bot/src/jobs/schedulerHost.ts)
- 純粋オーケストレーション: `usecase-add` / 永続スケジュール: `scheduler-add-job`
- 規約全般: [CONTRIBUTING.md](../../../CONTRIBUTING.md)
