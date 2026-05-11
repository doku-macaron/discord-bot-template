---
name: discord-add-autocomplete
description: このテンプレで slash command の option に autocomplete を付けるときのワークフロー。slash command 側で `.setAutocomplete(true)` を設定し、`Autocomplete` クラスで候補生成 handler を `autocompleteRegister.ts` に登録するまで。Use when adding an autocomplete handler for a slash command option under `src/events/interactionCreate/commands/autocomplete/items/`. slash command 自体を追加したい場合は discord-add-chat-input を先に使う。
---

# Discord: add autocomplete for a slash command option

slash command の option に対し、ユーザー入力中に候補を返す機能。slash command 側で `.setAutocomplete(true)` を立てたあと、対応する `Autocomplete` を別ファイルで登録する。

## いつ使う

- 既存の slash command option に autocomplete (補完候補) を付けたい
- DB / 外部 API から動的に候補を返したい

**この skill を使わない場合**:
- 候補が固定で少数 (~5) なら `.addChoices(...)` で十分。autocomplete は不要
- option 自体を追加するだけ → `discord-add-chat-input` を ad-hoc に使う

## 1. slash command 側で autocomplete を有効化

[discord-add-chat-input](../discord-add-chat-input/SKILL.md) で作った command (or 既存 command) の option builder に `setAutocomplete(true)` を追加:

```ts
new Command(
    (builder) =>
        builder
            .setName("echo")
            .setDescription("...")
            .addStringOption((opt) =>
                opt
                    .setName("message")
                    .setDescription("repeat this back")
                    .setRequired(true)
                    .setAutocomplete(true)        // ← ここ
            ),
    async (interaction) => { /* ... */ }
);
```

autocomplete を立てた option には `.addChoices(...)` は併用できない (Discord の仕様)。

## 2. Autocomplete handler ファイルを作る

`src/events/interactionCreate/commands/autocomplete/items/<name>Autocomplete.ts`

```ts
import { Autocomplete } from "@/framework/discord/interactions/autocomplete";

const SUGGESTIONS = ["Hello!", "Hi there!", "Hey!"];

export const echoAutocomplete = new Autocomplete("echo", async (interaction) => {
    const focused = interaction.options.getFocused(true);    // 現在入力中の option
    // focused.name === "message", focused.value === ユーザーが今打ってる文字列

    const filtered = SUGGESTIONS
        .filter((s) => s.toLowerCase().includes(focused.value.toLowerCase()))
        .slice(0, 25);                                       // Discord は最大 25 件

    await interaction.respond(filtered.map((value) => ({ name: value, value })));
});
```

ポイント:
- import は barrel: `@/framework/discord/interactions/autocomplete`
- 第 1 引数は **command 名**。subcommand 構造でも top-level command 名を渡す (subcommand 名ではない)
- `interaction.options.getFocused(true)` で **今フォーカスされている option** の name + value を取得
- `interaction.respond([...])` で `{ name: string; value: string | number }[]` (最大 25 件) を返す
- name は UI に表示される文字列、value は実際に送信される値 (異なる文字列にできる)
- subcommand 内 option を補完したい場合: `interaction.options.getSubcommand()` で分岐する

## 3. register に登録

[src/events/interactionCreate/commands/autocomplete/autocompleteRegister.ts](../../../src/events/interactionCreate/commands/autocomplete/autocompleteRegister.ts) の末尾に追加:

```ts
import { echoAutocomplete } from "@/events/interactionCreate/commands/autocomplete/items/echoAutocomplete";
// ...
autocompleteHandler.register(echoAutocomplete);
```

## 4. Discord に送信

slash command 自体を変更したなら必須:

```bash
bun register
```

slash command を変えていなければ register は不要 (autocomplete handler 単独は登録対象外)。

## 5. 動作確認

- `bun run check:tsc`
- `bun test`
- 実 Discord で対象 option に入力 → 候補が出るか / 絞り込みが効くか

## interactions の中で何をするか

- 候補生成のロジックは autocomplete handler 内で完結させてよい (interaction が `isAutocomplete()` で reply メソッドは持たない)
- DB から候補を引きたい場合は **読み取りクエリ専用** にする (副作用なし)。失敗時はエラーログを残して空配列を返すと UX が壊れない
- 25 件超えるリストは事前に `slice(0, 25)`。Discord 仕様

## 注意

- autocomplete は **3 秒以内** にレスポンスしないと無視される。重い検索は事前にキャッシュするかインデックスを用意する
- handler 内で例外を投げると Discord に何も返らず UX が固まる。try/catch で空配列フォールバックする方が安全な場合もある

## 参考

- 既存サンプル: [src/events/interactionCreate/commands/autocomplete/items/echoAutocomplete.ts](../../../src/events/interactionCreate/commands/autocomplete/items/echoAutocomplete.ts)
- handler / 型: [src/framework/discord/interactions/autocomplete/](../../../src/framework/discord/interactions/autocomplete/)
