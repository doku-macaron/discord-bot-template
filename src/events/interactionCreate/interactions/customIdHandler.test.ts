import { describe, expect, test } from "bun:test";
import { type Interaction, MessageFlags, type RepliableInteraction } from "discord.js";
import { CustomIdHandler, type CustomIdItem } from "@/events/interactionCreate/interactions/customIdHandler";

type TestInteraction = Interaction & RepliableInteraction & { customId: string };
type ReplyPayload = {
    content?: string;
    flags?: unknown;
};

function createInteraction(
    customId: string,
    replies: Array<ReplyPayload>,
    options?: { deferred?: boolean; replied?: boolean }
): TestInteraction {
    return {
        customId,
        deferred: options?.deferred ?? false,
        replied: options?.replied ?? false,
        reply: async (payload: ReplyPayload) => {
            replies.push(payload);
        },
    } as unknown as TestInteraction;
}

function createItem(data: string | RegExp, values: Array<string>): CustomIdItem<TestInteraction> {
    return {
        data,
        execute: async (interaction) => {
            values.push(interaction.customId);
        },
    };
}

describe("CustomIdHandler", () => {
    test("executes exact customId handlers", async () => {
        const values: Array<string> = [];
        const replies: Array<ReplyPayload> = [];
        const handler = new CustomIdHandler<CustomIdItem<TestInteraction>, TestInteraction>("button", "unavailable");

        handler.register(createItem("profile:edit-button", values));

        await handler.execute(createInteraction("profile:edit-button", replies));

        expect(values).toEqual(["profile:edit-button"]);
        expect(replies).toEqual([]);
    });

    test("executes regex customId handlers", async () => {
        const values: Array<string> = [];
        const replies: Array<ReplyPayload> = [];
        const handler = new CustomIdHandler<CustomIdItem<TestInteraction>, TestInteraction>("button", "unavailable");

        handler.register(createItem(/^profile:edit-button:\d+$/, values));

        await handler.execute(createInteraction("profile:edit-button:123", replies));

        expect(values).toEqual(["profile:edit-button:123"]);
        expect(replies).toEqual([]);
    });

    test("replies when customId is unregistered", async () => {
        const replies: Array<ReplyPayload> = [];
        const handler = new CustomIdHandler<CustomIdItem<TestInteraction>, TestInteraction>("button", "unavailable");

        await handler.execute(createInteraction("unknown", replies));

        expect(replies).toEqual([{ content: "unavailable", flags: MessageFlags.Ephemeral }]);
    });

    test("does not reply to already deferred unregistered interactions", async () => {
        const replies: Array<ReplyPayload> = [];
        const handler = new CustomIdHandler<CustomIdItem<TestInteraction>, TestInteraction>("button", "unavailable");

        await handler.execute(createInteraction("unknown", replies, { deferred: true }));

        expect(replies).toEqual([]);
    });
});
