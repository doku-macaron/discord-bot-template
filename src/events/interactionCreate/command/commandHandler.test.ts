import { describe, expect, test } from "bun:test";
import { MessageFlags } from "discord.js";
import { Command, CommandHandler } from "@/events/interactionCreate/command/commandHandler";
import { createCommandInteractionMock, type MockReplyPayload } from "@/lib/testing/interactions";

describe("CommandHandler", () => {
    test("routes to registered command by name", async () => {
        const handler = new CommandHandler();
        const called: Array<string> = [];

        handler.register(
            new Command(
                (builder) => builder.setName("ping").setDescription("ping"),
                async (interaction) => {
                    called.push(interaction.commandName);
                }
            )
        );

        const replies: Array<MockReplyPayload> = [];
        await handler.execute(createCommandInteractionMock("ping", replies));

        expect(called).toEqual(["ping"]);
        expect(replies).toEqual([]);
    });

    test("replies ephemerally for unregistered command", async () => {
        const handler = new CommandHandler();
        const replies: Array<MockReplyPayload> = [];

        await handler.execute(createCommandInteractionMock("unknown", replies));

        expect(replies).toEqual([{ content: "未登録のコマンドです。", flags: MessageFlags.Ephemeral }]);
    });

    test("propagates errors thrown by the executor", async () => {
        const handler = new CommandHandler();
        const failure = new Error("boom");

        handler.register(
            new Command(
                (builder) => builder.setName("broken").setDescription("broken"),
                async () => {
                    throw failure;
                }
            )
        );

        const replies: Array<MockReplyPayload> = [];
        const run = handler.execute(createCommandInteractionMock("broken", replies));

        await expect(run).rejects.toBe(failure);
    });
});
