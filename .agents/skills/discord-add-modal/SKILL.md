---
name: discord-add-modal
description: このテンプレで modal (text input フォーム) を 1 つ追加するときのワークフロー。modal builder の作成、`Modal` クラスで submit handler を登録、呼び出し元から `interaction.showModal(...)` で開くまで。Use when adding a modal under `src/events/interactionCreate/components/modal/items/`. button を足したい場合は discord-add-button を使う。
---

# Discord: add a modal

modal はユーザーから text 入力を取るフォーム。**button や select 等から `showModal(...)` で開く** タイプの component で、定常的に貼り続ける UI ではない。

## いつ使う

- 自由入力テキストをユーザーから取りたい (例: bio 編集、報告メッセージ入力)
- 複数フィールド (短文 / 長文) を 1 回でまとめて取りたい

**この skill を使わない場合**:
- ボタンだけ押させたい → `discord-add-button`
- リストから選ばせたい → `discord-add-select-menu`

注: discord の制約で **modal は `interaction.deferReply()` の後では出せない**。button click / slash command 直後など、**まだ deferReply していない interaction** からのみ `showModal(...)` できる。

## 1. customId とフィールド ID を決める

modal 自体の customId と、各 TextInput の customId の両方を [src/constants/customIds.ts](../../../src/constants/customIds.ts) に登録:

```ts
CUSTOM_ID.MODAL.FOO = "foo:modal";
CUSTOM_ID.INPUT.FOO_FIELD = "foo:field";
```

## 2. modal builder ファクトリと submit handler を 1 ファイルに

`src/events/interactionCreate/components/modal/items/<name>.ts`

```ts
import { LabelBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { CUSTOM_ID } from "@/constants/customIds";
import { Modal } from "@/framework/discord/interactions/components/modal";
import { handleResult } from "@/lib/discord/resultHandler";

const FIELD_MAX = 200;

// 呼び出し元 (button handler 等) がこれを呼んで `interaction.showModal(...)` する
export function createFooModal(defaultValue = ""): ModalBuilder {
    const input = new TextInputBuilder()
        .setCustomId(CUSTOM_ID.INPUT.FOO_FIELD)
        .setStyle(TextInputStyle.Paragraph)   // Short or Paragraph
        .setRequired(false)
        .setMaxLength(FIELD_MAX)
        .setValue(defaultValue);

    return new ModalBuilder()
        .setCustomId(CUSTOM_ID.MODAL.FOO)
        .setTitle("Foo Editor")
        .addLabelComponents(new LabelBuilder().setLabel("Foo content").setTextInputComponent(input));
}

// submit handler
export const fooModal = new Modal(
    () => CUSTOM_ID.MODAL.FOO,
    async (interaction) => {
        if (!interaction.inCachedGuild()) {
            await interaction.reply("このフォームはサーバー内で送信してください。");
            return;
        }

        const value = interaction.fields.getTextInputValue(CUSTOM_ID.INPUT.FOO_FIELD).trim();

        // usecase / query 呼び出し (重い処理がある場合は deferReply 後 editReply)
        const { fooUseCase } = await import("@/usecases/foo/fooUseCase");
        const saved = await handleResult(
            await fooUseCase({ guildId: interaction.guildId, userId: interaction.user.id, value }),
            interaction,
            { category: "Database", errorMessage: "保存に失敗しました。" }
        );

        if (!saved) return;
        await interaction.reply({ content: "保存しました。", ephemeral: true });
    }
);
```

ポイント:
- `createFooModal(...)` を export して呼び出し元 (button / slash command) で使う
- 2024 以降の discord.js は `LabelBuilder` + `TextInputBuilder` を使う (旧 `ActionRowBuilder<TextInputBuilder>` ではない)
- `TextInputStyle.Short` (1 行) vs `Paragraph` (複数行)
- `setRequired(false)` で optional に、`setMaxLength(...)` で文字数制限
- submit handler は `interaction.fields.getTextInputValue(<input-customId>)` で値を取得
- usecase は `await import("...")` の dynamic import 推奨 (DB module を modal 起動まで遅延ロードする既存パターン)

## 3. register に登録

[src/events/interactionCreate/components/modal/modalRegister.ts](../../../src/events/interactionCreate/components/modal/modalRegister.ts) の末尾に追加:

```ts
import { fooModal } from "@/events/interactionCreate/components/modal/items/fooModal";
// ...
modalHandler.register(fooModal);
```

## 4. modal を開く側 (呼び出し元)

button の handler 等から:

```ts
import { createFooModal } from "@/events/interactionCreate/components/modal/items/fooModal";

// button handler 内
async (interaction) => {
    // 必要なら現在値を DB から取って prefill
    const profile = await findFoo({ /* ... */ });
    await interaction.showModal(createFooModal(profile?.value ?? ""));
}
```

slash command から直接開くのも可能。**deferReply はしない**。

## 5. 動作確認

- `bun run check:tsc`
- `bun test`
- 実 Discord: modal を開く button を押す → 入力 → submit → handler が動くか確認

`bun register` は不要 (modal は登録対象外)。

## interactions の中で何をするか

- `interaction.fields.getTextInputValue(...)` の戻り値 (string) を primitive で usecase に渡す
- 失敗時は `handleResult` で統一
- submit を受け取った時点で `interaction.deferReply` か `interaction.reply` のどちらかで返答する義務がある (3 秒以内)

## 参考

- 既存サンプル: [src/events/interactionCreate/components/modal/items/](../../../src/events/interactionCreate/components/modal/items/)
- handler / 型: [src/framework/discord/interactions/components/modal/](../../../src/framework/discord/interactions/components/modal/)
- customId 設計: [src/constants/customIds.ts](../../../src/constants/customIds.ts)
