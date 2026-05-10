import { describe, expect, test } from "bun:test";
import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { Command, CommandHandler } from "@/events/interactionCreate/command/commandHandler";

type ReplyPayload = {
    content?: string;
    flags?: unknown;
};

function createCommandInteraction(commandName: string, replies: Array<ReplyPayload>): ChatInputCommandInteraction {
    return {
        commandName,
        deferred: false,
        replied: false,
        reply: async (payload: ReplyPayload) => {
            replies.push(payload);
        },
    } as unknown as ChatInputCommandInteraction;
}

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

        const replies: Array<ReplyPayload> = [];
        await handler.execute(createCommandInteraction("ping", replies));

        expect(called).toEqual(["ping"]);
        expect(replies).toEqual([]);
    });

    test("replies ephemerally for unregistered command", async () => {
        const handler = new CommandHandler();
        const replies: Array<ReplyPayload> = [];

        await handler.execute(createCommandInteraction("unknown", replies));

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

        const replies: Array<ReplyPayload> = [];
        const run = handler.execute(createCommandInteraction("broken", replies));

        await expect(run).rejects.toBe(failure);
    });
});
