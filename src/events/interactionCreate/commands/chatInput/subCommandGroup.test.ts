import { describe, expect, test } from "bun:test";
import { MessageFlags } from "discord.js";
import { SubCommand } from "@/events/interactionCreate/commands/chatInput/subCommand";
import { SubCommandGroup } from "@/events/interactionCreate/commands/chatInput/subCommandGroup";
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

describe("SubCommandGroup", () => {
    test("routes to registered subcommand inside the group", async () => {
        const records: Array<MockReplyRecord> = [];
        const interaction = createRichCommandInteractionMock("parent", records, { subcommand: "alpha" });
        const hit: { value: string | null } = { value: null };

        const group = new SubCommandGroup((builder) => {
            builder.setName("grp").setDescription("grp");
        });
        group.register(makeSub("alpha", hit));
        group.register(makeSub("beta", hit));

        await group.execute(interaction);

        expect(hit.value).toBe("alpha");
        expect(records).toEqual([]);
    });

    test("replies ephemerally for unknown subcommand inside group", async () => {
        const records: Array<MockReplyRecord> = [];
        const interaction = createRichCommandInteractionMock("parent", records, { subcommand: "missing" });
        const hit: { value: string | null } = { value: null };

        const group = new SubCommandGroup((builder) => {
            builder.setName("grp").setDescription("grp");
        });
        group.register(makeSub("alpha", hit));

        await group.execute(interaction);

        expect(records).toEqual([
            {
                kind: "reply",
                payload: { content: "未登録のサブコマンドです。", flags: MessageFlags.Ephemeral },
            },
        ]);
    });

    test("skips duplicate registration without throwing", () => {
        const hit: { value: string | null } = { value: null };
        const group = new SubCommandGroup((builder) => {
            builder.setName("grp").setDescription("grp");
        });
        group.register(makeSub("alpha", hit));
        group.register(makeSub("alpha", hit));

        expect(group.handlers.length).toBe(1);
    });
});
