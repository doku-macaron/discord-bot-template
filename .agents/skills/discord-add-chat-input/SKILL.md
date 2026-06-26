---
name: discord-add-chat-input
description: このテンプレで slash command (chat input) を 1 つ追加するときのワークフロー。`Command` / `CommandWithSubCommand` / `SubCommand` クラスを使い、その種別の `registry.ts` に `.register(...)` を 1 行足すまで。Use when adding a new slash command under `apps/bot/src/events/interactionCreate/commands/chatInput/items/`. SubCommand 構造を含めて扱う。autocomplete を付けたい場合は discord-add-autocomplete を併せて使う。
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

`apps/bot/src/events/interactionCreate/commands/chatInput/items/<name>.ts`

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

## 4. registry に登録する

種別ごとに `registry.ts` が 1 個あり、その種別の handler を 1 つ生成して各 item を `.register(...)` で登録している。slash command を足すには [apps/bot/src/events/interactionCreate/commands/chatInput/registry.ts](../../../apps/bot/src/events/interactionCreate/commands/chatInput/registry.ts) に **import 1 行 + `.register(...)` 1 行** を足すだけ:

```ts
import { fooCommand } from "@/events/interactionCreate/commands/chatInput/items/foo";
// ...
commandHandler.register(fooCommand);
```

- 旧テンプレの `*Register.ts` / `*HandlerInstance.ts` / `.clear()` は無い。種別ごとの `registry.ts` が単一の登録先
- `setup.ts` が 6 種別の handler (`commandHandler` / `contextMenuHandler` / `buttonHandler` / `modalHandler` / `menuHandler` / `autocompleteHandler`) を集めて dispatcher を組む。ここは触らない
- import 順は biome の organizeImports が並べ替える

## 5. Discord に送信

リポジトリルートから:

```bash
bun register
```

- root の `register` script が `@repo/bot` の `scripts/registerCommand.ts` に委譲する (`commandHandler` / `contextMenuHandler` を読んで Discord に PUT)
- `GUILD_ID` が設定されていれば dev guild に即時反映
- 未設定なら bot 参加中の全 guild に PUT (テンプレでは小〜中規模 bot を想定)

## 6. 動作確認

- `bun run check:tsc` (シグネチャ整合)
- `bun test` (handler test は基本不要、既存テストの regression のみ)
- 実 Discord で実行して挙動を確認

## interactions の中で何をするか

- discord.js 値 (`interaction.user.id`, `interaction.options.getString(...)` 等) を **primitive に取り出す** のは items の責務
- そこから usecase / DB query を呼ぶ場合は CONTRIBUTING.md の "discord.js stays at the boundary" に従って **discord.js オブジェクトを usecase に渡さない** (primitive で渡す)
- usecase / query は `@repo/db` パッケージ越し (`@repo/db/query/...`) に呼ぶ。`@repo/db` import は DB module を起動するので、必要な item でだけ import する
- DB 書き込みが `Result<T, AppError>` を返すなら `handleResult(result, interaction, { category, errorMessage })` で失敗ハンドリングが定型化される (`AppError` の kind を見て user 向けメッセージを出し分ける)

## Mention safety / ping opt-in

[apps/bot/src/client.ts](../../../apps/bot/src/client.ts) で `allowedMentions: { parse: [] }` を default にしているため、`reply` / `editReply` / `followUp` / `channel.send` で `content` に含まれた `@everyone` / `@here` / role / user mention は **ping を発火しない** (描画はされる)。`/echo <message>` のようにユーザー入力をそのまま流すコマンドで、bot 権限を踏み台にした不意の broadcast を防ぐためのデフォルト。

意図して ping したいときは send 側で明示的に opt-in する:

```ts
await interaction.reply({
    content: `${userMention(interaction.user.id)} 完了しました`,
    allowedMentions: { parse: [], users: [interaction.user.id] },
});
```

- `users: [...]` / `roles: [...]` で具体的な ID を渡せばその対象だけ ping される
- どうしても `@everyone` を出す必要があるときは `parse: ['everyone']` を明示 (本当に必要かを再考)
- embed の field / description / TextDisplay (Components v2) 内の mention は元々 ping を発火しないので、これらの表示は default のままで問題ない

## 参考

- 既存サンプル: [apps/bot/src/events/interactionCreate/commands/chatInput/items/](../../../apps/bot/src/events/interactionCreate/commands/chatInput/items/) (`ping.ts` = 単一、`profile.ts` = SubCommand + DB)
- registry: [apps/bot/src/events/interactionCreate/commands/chatInput/registry.ts](../../../apps/bot/src/events/interactionCreate/commands/chatInput/registry.ts)
- handler / 型: [apps/bot/src/framework/discord/interactions/chatInput/](../../../apps/bot/src/framework/discord/interactions/chatInput/)
- 規約全般: [CONTRIBUTING.md](../../../CONTRIBUTING.md)
