---
name: discord-add-select-menu
description: このテンプレで select menu (String / User / Role / Channel / Mentionable) を 1 つ追加するときのワークフロー。`Menu` クラス、`isXxxSelectMenu()` での narrow、`menuRegister.ts` への登録まで。Use when adding a select menu under `src/events/interactionCreate/components/selectMenu/items/`. button や modal は別の skill を使う。
---

# Discord: add a select menu component

`MenuHandler` は `CustomIdHandler<AnySelectMenuInteraction>` をベースに 5 種類の select (String / User / Role / Channel / Mentionable) を **同じ `Menu` クラスで** 扱う。handler 内で `interaction.isXxxSelectMenu()` で narrow して値を取り出す。

## いつ使う

- ユーザーに既知のリストから選ばせたい (string)
- ユーザー / ロール / チャンネル を選ばせたい (user / role / channel)
- 任意のメンション可能 entity を選ばせたい (mentionable)

**この skill を使わない場合**:
- 押すだけのアクション → `discord-add-button`
- 自由入力フォーム → `discord-add-modal`

## 1. customId を決める

[src/constants/customIds.ts](../../../src/constants/customIds.ts) の `CUSTOM_ID.SELECT_MENU.<NAME>` に追加:

```ts
CUSTOM_ID.SELECT_MENU.FOO = "foo:select";
```

## 2. ファイルを作る

`src/events/interactionCreate/components/selectMenu/items/<name>.ts`

User select の例:

```ts
import { MessageFlags, userMention } from "discord.js";
import { CUSTOM_ID } from "@/constants/customIds";
import { Menu } from "@/framework/discord/interactions/components/selectMenu";

export const reportUserSelectMenu = new Menu(
    () => CUSTOM_ID.SELECT_MENU.REPORT_USER,
    async (interaction) => {
        // narrow しないと .values の型が出ない
        if (!interaction.isUserSelectMenu()) {
            return;
        }
        if (!interaction.inCachedGuild()) {
            await interaction.reply({ content: "サーバー内で操作してください。", flags: MessageFlags.Ephemeral });
            return;
        }

        const userId = interaction.values[0];
        if (!userId) {
            await interaction.reply({ content: "ユーザーが選択されていません。", flags: MessageFlags.Ephemeral });
            return;
        }
        // userId を primitive として usecase に渡す
    }
);
```

Channel select で型フィルタしたい場合は呼び出し元 (builder) で `.setChannelTypes(...)` を指定 (例: `ChannelType.GuildText`)。

## 3. select の種類別の narrow

handler 冒頭でやる narrow を kind に合わせる:

| kind | narrow | values 型 |
|------|--------|-----------|
| String | `isStringSelectMenu()` | `string[]` (option の value 配列) |
| User | `isUserSelectMenu()` | `string[]` (userId 配列) |
| Role | `isRoleSelectMenu()` | `string[]` (roleId 配列) |
| Channel | `isChannelSelectMenu()` | `string[]` (channelId 配列) |
| Mentionable | `isMentionableSelectMenu()` | `string[]` (user or role の混在 id 配列) |

`interaction.values` は単一選択でも配列で返る。`values[0]` を取り出してから undefined チェックする。

## 4. register に登録

[src/events/interactionCreate/components/selectMenu/menuRegister.ts](../../../src/events/interactionCreate/components/selectMenu/menuRegister.ts) の末尾に追加:

```ts
import { fooSelectMenu } from "@/events/interactionCreate/components/selectMenu/items/fooSelectMenu";
// ...
menuHandler.register(fooSelectMenu);
```

## 5. メッセージに乗せる側 (builder)

select 自体は登録だけでは画面に出ない。slash command 等から ActionRow / SectionBuilder 経由でメッセージに乗せる。

```ts
import { ActionRowBuilder, RoleSelectMenuBuilder } from "discord.js";
import { CUSTOM_ID } from "@/constants/customIds";

const select = new RoleSelectMenuBuilder()
    .setCustomId(CUSTOM_ID.SELECT_MENU.MOD_ROLE)
    .setPlaceholder("Select a role")
    .setMinValues(1)
    .setMaxValues(1);

const row = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(select);
await interaction.reply({ components: [row] });
```

kind に応じて `StringSelectMenuBuilder` / `UserSelectMenuBuilder` / `RoleSelectMenuBuilder` / `ChannelSelectMenuBuilder` / `MentionableSelectMenuBuilder` を使い分ける。

ChannelSelectMenu で型を絞る場合:

```ts
import { ChannelSelectMenuBuilder, ChannelType } from "discord.js";

new ChannelSelectMenuBuilder()
    .setCustomId(...)
    .setChannelTypes(ChannelType.GuildText)
    .setPlaceholder("Select a text channel");
```

## 6. 動作確認

- `bun run check:tsc`
- `bun test`
- 実 Discord: select を表示するメッセージを送信 → 選ぶ → handler が動くか

`bun register` は不要 (select は登録対象外)。

## interactions の中で何をするか

- `interaction.values[0]` (id 文字列) を primitive として usecase / query に渡す
- DB 永続化が要るなら usecase 経由で `handleResult` で失敗ハンドリング (`/admin set-mod-role` 系のパターン)
- guildId が必要なら `interaction.inCachedGuild()` ガードで null-safe にしてから `interaction.guildId` を使う

## 参考

- 既存サンプル (5 種類): [src/events/interactionCreate/components/selectMenu/items/](../../../src/events/interactionCreate/components/selectMenu/items/)
  - `helpSectionSelectMenu` (String)
  - `reportUserSelectMenu` (User)
  - `modRoleSelectMenu` (Role)
  - `archiveChannelSelectMenu` (Channel, GuildText フィルタ付き)
- handler / 型: [src/framework/discord/interactions/components/selectMenu/](../../../src/framework/discord/interactions/components/selectMenu/)
