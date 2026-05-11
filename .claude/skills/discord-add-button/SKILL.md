---
name: discord-add-button
description: このテンプレで button component を 1 つ追加するときのワークフロー。`customId` 設計、`Button` クラス、`buttonRegister.ts` への登録、メッセージへの貼り付け方まで。Use when adding a clickable button component under `src/events/interactionCreate/components/button/items/`. modal を出したい / select を出したい場合はそれぞれ別の skill を使う。
---

# Discord: add a button component

slash command や別の component から `ButtonBuilder` を出して、押されたときの handler を `Button` として書く。command 登録ではなく **customId routing** で動く点が slash 系との違い。

## いつ使う

- メッセージに付ける clickable button を新規追加する
- 既存メッセージのアクションを button で受けたい

**この skill を使わない場合**:
- 入力フォームを出したい (text input 含む) → `discord-add-modal`
- メニューから選ばせたい → `discord-add-select-menu`
- リンクボタン (URL ジャンプのみ) → handler 不要なので skill 経由は要らず、`ButtonBuilder.setURL(...)` で十分

## 1. customId の方針を決める

routing キーは `customId`。テンプレの推奨フォーマット:

- 固定 ID: `feature:action` (例: `profile:edit-button`)
- 動的 ID 付き: `feature:action:<id>` (例: `help:pagination:next:3`)

固定 ID は [src/constants/customIds.ts](src/constants/customIds.ts) の `CUSTOM_ID` に追加。動的 ID は同ファイルの `CUSTOM_ID_PATTERN` に正規表現を追加して、handler 側で `parse` する。

```ts
// 固定
CUSTOM_ID.BUTTON.PROFILE_EDIT = "profile:edit-button";

// 動的 (例: pagination)
CUSTOM_ID_PATTERN.BUTTON.PROFILE_EDIT_WITH_USER_ID = /^profile:edit-button:\d+$/;
```

## 2. ファイルを作る

`src/events/interactionCreate/components/button/items/<name>.ts`

固定 ID の例:

```ts
import { CUSTOM_ID } from "@/constants/customIds";
import { Button } from "@/framework/discord/interactions/components/button";

export const fooButton = new Button(
    () => CUSTOM_ID.BUTTON.FOO,
    async (interaction) => {
        // interaction.customId === CUSTOM_ID.BUTTON.FOO のときだけここに来る
        await interaction.reply("clicked!");
    }
);
```

動的 ID (正規表現) の例:

```ts
import { CUSTOM_ID_PATTERN } from "@/constants/customIds";
import { Button } from "@/framework/discord/interactions/components/button";

export const fooPaginationButton = new Button(
    () => CUSTOM_ID_PATTERN.BUTTON.FOO_PAGINATION,
    async (interaction) => {
        // 正規表現でマッチした customId を自前で parse する
        const page = parseCustomId(interaction.customId); // 自前 helper
        // ...
    }
);
```

ポイント:
- import は barrel: `@/framework/discord/interactions/components/button`
- 第 1 引数の `() => customId | RegExp` は handler が "この customId を捌く" 宣言。実行時に dispatcher が照合する
- `interaction.customId` は string なので、動的 ID なら手動で split / regex.exec する
- guild 内限定 component は `if (!interaction.inCachedGuild()) return` ガードを冒頭に置く (`interaction.guildId` を null-safe に扱える)

## 3. register に登録

[src/events/interactionCreate/components/button/buttonRegister.ts](src/events/interactionCreate/components/button/buttonRegister.ts) の末尾に追加:

```ts
import { fooButton } from "@/events/interactionCreate/components/button/items/fooButton";
// ...
buttonHandler.register(fooButton);
```

## 4. メッセージに button を貼る

button は登録しただけでは画面に出ない。slash command などから送信メッセージに乗せる。

ActionRow に乗せる (普通の `reply` / `editReply`):

```ts
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { CUSTOM_ID } from "@/constants/customIds";

const button = new ButtonBuilder()
    .setCustomId(CUSTOM_ID.BUTTON.FOO)
    .setLabel("Click me")
    .setStyle(ButtonStyle.Primary);

const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
await interaction.reply({ components: [row] });
```

Components v2 の SectionBuilder accessory に乗せる (`/profile view` などの形):

```ts
import { ButtonBuilder, ButtonStyle, SectionBuilder, TextDisplayBuilder } from "discord.js";

const section = new SectionBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent("Profile editor"))
    .setButtonAccessory(
        new ButtonBuilder().setCustomId(CUSTOM_ID.BUTTON.FOO).setLabel("Edit").setStyle(ButtonStyle.Primary)
    );
```

## 5. 動作確認

- `bun run check:tsc`
- `bun test`
- 実 Discord でメッセージを送信 → ボタンを押す → handler が動くか確認

`bun register` は不要 (slash と違って button 自体は登録不要 component)。

## interactions の中で何をするか

- button は単独で UI を完結させないことが多い (modal を開く / メッセージを更新する / DB に書き込む等)
- 状態変更が要るなら usecase 経由で、`handleResult` で失敗ハンドリング
- メッセージ更新は `interaction.update({...})` (即時) / `interaction.deferUpdate()` + `interaction.editReply(...)` (3 秒以内に間に合わない場合)

## 参考

- 既存サンプル: [src/events/interactionCreate/components/button/items/](src/events/interactionCreate/components/button/items/)
- handler / 型: [src/framework/discord/interactions/components/button/](src/framework/discord/interactions/components/button/)
- customId 設計: [src/constants/customIds.ts](src/constants/customIds.ts)
- pagination helper: [src/lib/discord/pagination.ts](src/lib/discord/pagination.ts) (`/help` で使用)
