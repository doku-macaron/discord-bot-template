---
name: discord-add-chat-input
description: このテンプレで slash command (chat input) を 1 つ追加するときのワークフロー。`Command` / `CommandWithSubCommand` / `SubCommand` クラスを使い、`commandRegister.ts` に登録するまで。Use when adding a new slash command under `src/events/interactionCreate/commands/chatInput/items/`. SubCommand 構造を含めて扱う。autocomplete を付けたい場合は discord-add-autocomplete を併せて使う。
---

# Discord: add a chat input (slash) command

## いつ使う

- 新しい slash command を追加する (`/foo`, `/foo bar baz` などの subcommand 含む)
- 既存 command に subcommand を 1 つ生やす

**この skill を使わない場合**:
- right-click 系 (User / Message) → `discord-add-context-menu`
- 既存 command の execute だけ変える → ad-hoc に編集
- autocomplete option の値生成だけ追加 → `discord-add-autocomplete`

## 1. コマンド構造を決める

3 つのパターン:

| パターン | クラス | 例 |
|---------|--------|------|
| 単一コマンド | `Command` | `/ping`, `/echo` |
| サブコマンド付き | `CommandWithSubCommand` + `SubCommand` | `/profile view`, `/profile edit` |
| サブコマンドグループ付き | `CommandWithSubCommand` + `SubCommandGroup` + `SubCommand` | `/admin role set`, `/admin channel set` (グループ名 + サブコマンド名) |

迷ったら `Command` から始める。後でサブコマンドが増えたら `CommandWithSubCommand` に書き換える。

## 2. ファイルを作る

`src/events/interactionCreate/commands/chatInput/items/<name>.ts`

```ts
import { ApplicationIntegrationType, InteractionContextType, PermissionFlagsBits } from "discord.js";
import { Command } from "@/framework/discord/interactions/chatInput";

export const fooCommand = new Command(
    (builder) =>
        builder
            .setName("foo")
            .setDescription("does foo")
            .setContexts(InteractionContextType.Guild)           // 実行可能な場所
            .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild), // optional: 必要権限
    async (interaction) => {
        await interaction.reply("foo!");
    }
);
```

ポイント:
- import は必ず barrel から: `@/framework/discord/interactions/chatInput` (深い `commandHandler` 等は禁止)
- builder は SlashCommandBuilder の流れ。`setName` / `setDescription` は必須
- `setContexts` で Guild 内 / DM / プライベートチャンネルを制御
- `setIntegrationTypes` で GuildInstall (guild にインストール) / UserInstall (ユーザーインストール)
- option を追加するときは `.addStringOption(opt => opt.setName(...)...)` 系を builder の中で連鎖
- execute 内では `await interaction.deferReply()` → `await interaction.editReply(...)` の流れを 3 秒以内に始めることに注意

## 3. SubCommand 構造で書く場合

```ts
import { CommandWithSubCommand, SubCommand } from "@/framework/discord/interactions/chatInput";

export const profileCommand = new CommandWithSubCommand((builder) =>
    builder.setName("profile").setDescription("DB を使ったプロフィール例です")
);

profileCommand.register(
    new SubCommand(
        (builder) => builder.setName("view").setDescription("..."),
        async (interaction) => { /* ... */ }
    )
);

profileCommand.register(
    new SubCommand(
        (builder) => builder.setName("edit").setDescription("..."),
        async (interaction) => { /* ... */ }
    )
);
```

SubCommandGroup を使う場合:

```ts
import { CommandWithSubCommand, SubCommand, SubCommandGroup } from "@/framework/discord/interactions/chatInput";

const adminCommand = new CommandWithSubCommand((builder) =>
    builder.setName("admin").setDescription("...")
);

const roleGroup = new SubCommandGroup((builder) =>
    builder.setName("role").setDescription("...")
);
roleGroup.register(
    new SubCommand((builder) => builder.setName("set").setDescription("..."), async (i) => { /* ... */ })
);
adminCommand.register(roleGroup);
```

## 4. register に登録する

[src/events/interactionCreate/commands/chatInput/commandRegister.ts](src/events/interactionCreate/commands/chatInput/commandRegister.ts) の末尾に追加:

```ts
import { fooCommand } from "@/events/interactionCreate/commands/chatInput/items/foo";
// ...
commandHandler.register(fooCommand);
```

import 順は biome の organizeImports が並べ替える。

## 5. Discord に送信

```bash
bun register
```

- `GUILD_ID` が設定されていれば dev guild に即時反映
- 未設定なら bot 参加中の全 guild に PUT (テンプレでは小〜中規模 bot を想定)

## 6. 動作確認

- `bun run check:tsc` (シグネチャ整合)
- `bun test` (handler test は基本不要、既存テストの regression のみ)
- 実 Discord で実行して挙動を確認

## interactions の中で何をするか

- discord.js 値 (`interaction.user.id`, `interaction.options.getString(...)` 等) を **primitive に取り出す** のは items の責務
- そこから usecase / DB query を呼ぶ場合は CONTRIBUTING.md の "discord.js stays at the boundary" に従って **discord.js オブジェクトを usecase に渡さない** (primitive で渡す)
- DB 書き込みが Result を返すなら `handleResult(result, interaction, { category, errorMessage })` で失敗ハンドリングが定型化される

## 参考

- 既存サンプル: [src/events/interactionCreate/commands/chatInput/items/](src/events/interactionCreate/commands/chatInput/items/)
- handler / 型: [src/framework/discord/interactions/chatInput/](src/framework/discord/interactions/chatInput/)
- 規約全般: [CONTRIBUTING.md](CONTRIBUTING.md)
