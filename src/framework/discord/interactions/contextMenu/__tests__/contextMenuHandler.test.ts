import { describe, expect, test } from "bun:test";
import { ApplicationCommandType, MessageFlags } from "discord.js";
import { ContextMenuCommand, ContextMenuHandler } from "@/framework/discord/interactions/contextMenu/contextMenuHandler";
import { createContextMenuInteractionMock, type MockReplyPayload } from "@/lib/testing/interactions";

describe("ContextMenuHandler", () => {
    test("routes to registered context menu command by name", async () => {
        const handler = new ContextMenuHandler();
        const called: Array<string> = [];

        handler.register(
            new ContextMenuCommand(
                (builder) => builder.setName("Get user profile").setType(ApplicationCommandType.User),
                async (interaction) => {
                    called.push(interaction.commandName);
                }
            )
        );

        const replies: Array<MockReplyPayload> = [];
        await handler.execute(createContextMenuInteractionMock("Get user profile", replies));

        expect(called).toEqual(["Get user profile"]);
        expect(replies).toEqual([]);
    });

    test("replies ephemerally for unregistered command", async () => {
        const handler = new ContextMenuHandler();
        const replies: Array<MockReplyPayload> = [];

        await handler.execute(createContextMenuInteractionMock("unknown", replies));

        expect(replies).toEqual([{ content: "未登録のコマンドです。", flags: MessageFlags.Ephemeral }]);
    });

    test("propagates errors thrown by the executor", async () => {
        const handler = new ContextMenuHandler();
        const failure = new Error("boom");

        handler.register(
            new ContextMenuCommand(
                (builder) => builder.setName("broken").setType(ApplicationCommandType.User),
                async () => {
                    throw failure;
                }
            )
        );

        const replies: Array<MockReplyPayload> = [];
        const run = handler.execute(createContextMenuInteractionMock("broken", replies));

        await expect(run).rejects.toBe(failure);
    });
});
