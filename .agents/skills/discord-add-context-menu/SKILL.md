---
name: discord-add-context-menu
description: このテンプレで context menu command (User / Message 右クリック) を 1 つ追加するときのワークフロー。`ContextMenuCommand` クラスを使い、`contextMenuRegister.ts` に登録するまで。Use when adding a right-click User or Message context menu command under `src/events/interactionCreate/commands/contextMenu/items/`. slash command を足したい場合は discord-add-chat-input を使う。
---

# Discord: add a context menu command

ユーザー / メッセージを右クリックして実行できる command の追加。slash command と別物 (discord 上は `ApplicationCommandType.User` / `.Message`)。

## いつ使う

- ユーザーアイコンを右クリックで何かする (User context menu)
- メッセージを右クリックで何かする (Message context menu)

**この skill を使わない場合**:
- `/foo` 形式の slash command → `discord-add-chat-input`

## 1. 種類を決める

- **User context menu**: `ApplicationCommandType.User`。`interaction.targetUser` / `interaction.targetMember` でターゲットを取れる
- **Message context menu**: `ApplicationCommandType.Message`。`interaction.targetMessage` でターゲットメッセージを取れる

両者で `setType(...)` だけ違い、それ以外の API はほぼ共通。

## 2. ファイルを作る

`src/events/interactionCreate/commands/contextMenu/items/<name>.ts`

User の例:

```ts
import { ApplicationCommandType, ApplicationIntegrationType, InteractionContextType, MessageFlags, userMention } from "discord.js";
import { ContextMenuCommand } from "@/framework/discord/interactions/contextMenu";
import { infoEmbed } from "@/lib/discord/embed";

export const getUserProfileContextMenu = new ContextMenuCommand(
    (builder) =>
        builder
            .setName("Get user profile")          // Discord UI に表示される名前。slash と違い空白可
            .setType(ApplicationCommandType.User) // ← User か Message
            .setContexts(InteractionContextType.Guild)
            .setIntegrationTypes(ApplicationIntegrationType.GuildInstall),
    async (interaction) => {
        const target = interaction.targetUser;
        const embed = infoEmbed("User profile", `User: ${userMention(target.id)}`);
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
);
```

Message の例:

```ts
import { ApplicationCommandType, ApplicationIntegrationType, InteractionContextType } from "discord.js";
import { ContextMenuCommand } from "@/framework/discord/interactions/contextMenu";

export const reportMessageContextMenu = new ContextMenuCommand(
    (builder) =>
        builder
            .setName("Report message")
            .setType(ApplicationCommandType.Message)
            .setContexts(InteractionContextType.Guild)
            .setIntegrationTypes(ApplicationIntegrationType.GuildInstall),
    async (interaction) => {
        const target = interaction.targetMessage;
        // target.id / target.url / target.content / target.author など
    }
);
```

ポイント:
- import は必ず barrel: `@/framework/discord/interactions/contextMenu`
- `setName` の文字列は Discord UI 上のラベル。`/` で始める必要は無く、空白可
- `setType` を必ず指定 (省略すると slash と被るので)

## 3. register に登録

[src/events/interactionCreate/commands/contextMenu/contextMenuRegister.ts](../../../src/events/interactionCreate/commands/contextMenu/contextMenuRegister.ts) の末尾に追加:

```ts
import { getUserProfileContextMenu } from "@/events/interactionCreate/commands/contextMenu/items/getUserProfileContextMenu";
// ...
contextMenuHandler.register(getUserProfileContextMenu);
```

## 4. Discord に送信

```bash
bun register
```

slash command と context menu は同じ `bun register` で一緒に Discord へ PUT される。

## 5. 動作確認

- `bun run check:tsc`
- `bun test`
- 実 Discord で右クリック → context menu に出てくるか / 実行できるか

## interactions の中で何をするか

- `interaction.targetUser` / `interaction.targetMessage` を **primitive (id / content / url) として取り出す** のが items の責務
- そこから usecase / DB query を呼ぶ場合は discord.js オブジェクトを usecase に渡さない (`interaction.targetUser.id` のような primitive で渡す)
- 失敗時は `handleResult(...)` で統一

## 参考

- 既存サンプル: [src/events/interactionCreate/commands/contextMenu/items/](../../../src/events/interactionCreate/commands/contextMenu/items/)
- handler / 型: [src/framework/discord/interactions/contextMenu/](../../../src/framework/discord/interactions/contextMenu/)
