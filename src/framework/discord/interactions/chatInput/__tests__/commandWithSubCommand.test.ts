import { describe, expect, test } from "bun:test";
import { MessageFlags } from "discord.js";
import { CommandWithSubCommand } from "@/framework/discord/interactions/chatInput/commandWithSubCommand";
import { SubCommand } from "@/framework/discord/interactions/chatInput/subCommand";
import { SubCommandGroup } from "@/framework/discord/interactions/chatInput/subCommandGroup";
import { createRichCommandInteractionMock, type MockReplyRecord } from "@/lib/testing/interactions";

function makeSub(name: string, hit: { value: string | null }) {
    return new SubCommand(
        (builder) => {
            builder.setName(name).setDescription(name);
        },
        async () => {
            hit.value = name;
        }
    );
}

describe("CommandWithSubCommand", () => {
    test("routes to a top-level subcommand by name", async () => {
        const records: Array<MockReplyRecord> = [];
        const interaction = createRichCommandInteractionMock("parent", records, { subcommand: "alpha" });
        const hit: { value: string | null } = { value: null };

        const command = new CommandWithSubCommand((builder) => {
            builder.setName("parent").setDescription("parent");
        });
        command.register(makeSub("alpha", hit));

        await command.execute(interaction);

        expect(hit.value).toBe("alpha");
        expect(records).toEqual([]);
    });

    test("routes through a subcommand group", async () => {
        const records: Array<MockReplyRecord> = [];
        const interaction = createRichCommandInteractionMock("parent", records, {
            group: "grp",
            subcommand: "inner",
        });
        const hit: { value: string | null } = { value: null };

        const command = new CommandWithSubCommand((builder) => {
            builder.setName("parent").setDescription("parent");
        });
        const group = new SubCommandGroup((builder) => {
            builder.setName("grp").setDescription("grp");
        });
        group.register(makeSub("inner", hit));
        command.register(group);

        await command.execute(interaction);

        expect(hit.value).toBe("inner");
        expect(records).toEqual([]);
    });

    test("replies ephemerally when subcommand is missing", async () => {
        const records: Array<MockReplyRecord> = [];
        const interaction = createRichCommandInteractionMock("parent", records);

        const command = new CommandWithSubCommand((builder) => {
            builder.setName("parent").setDescription("parent");
        });

        await command.execute(interaction);

        expect(records).toEqual([
            {
                kind: "reply",
                payload: { content: "サブコマンドが指定されていません。", flags: MessageFlags.Ephemeral },
            },
        ]);
    });

    test("replies ephemerally for unknown subcommand group", async () => {
        const records: Array<MockReplyRecord> = [];
        const interaction = createRichCommandInteractionMock("parent", records, { group: "ghost", subcommand: "x" });

        const command = new CommandWithSubCommand((builder) => {
            builder.setName("parent").setDescription("parent");
        });

        await command.execute(interaction);

        expect(records).toEqual([
            {
                kind: "reply",
                payload: { content: "未登録のコマンドグループです。", flags: MessageFlags.Ephemeral },
            },
        ]);
    });

    test("replies ephemerally for unknown subcommand at top level", async () => {
        const records: Array<MockReplyRecord> = [];
        const interaction = createRichCommandInteractionMock("parent", records, { subcommand: "missing" });

        const command = new CommandWithSubCommand((builder) => {
            builder.setName("parent").setDescription("parent");
        });

        await command.execute(interaction);

        expect(records).toEqual([
            {
                kind: "reply",
                payload: { content: "未登録のサブコマンドです。", flags: MessageFlags.Ephemeral },
            },
        ]);
    });

    test("skips duplicate subcommand and subcommand group registration", () => {
        const hit: { value: string | null } = { value: null };
        const command = new CommandWithSubCommand((builder) => {
            builder.setName("parent").setDescription("parent");
        });
        command.register(makeSub("dup", hit));
        command.register(makeSub("dup", hit));

        const group = new SubCommandGroup((builder) => {
            builder.setName("g").setDescription("g");
        });
        command.register(group);
        command.register(group);

        expect(command.handlers.length).toBe(2);
    });
});
