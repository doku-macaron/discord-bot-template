import { describe, expect, test } from "bun:test";
import { MessageFlags } from "discord.js";
import { CustomIdHandler, type CustomIdItem } from "@/events/interactionCreate/components/customIdHandler";
import { type CustomIdInteractionMock, createCustomIdInteractionMock, type MockReplyPayload } from "@/lib/testing/interactions";

function createItem(data: string | RegExp, values: Array<string>): CustomIdItem<CustomIdInteractionMock> {
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
        const replies: Array<MockReplyPayload> = [];
        const handler = new CustomIdHandler<CustomIdItem<CustomIdInteractionMock>, CustomIdInteractionMock>("button", "unavailable");

        handler.register(createItem("profile:edit-button", values));

        await handler.execute(createCustomIdInteractionMock("profile:edit-button", replies));

        expect(values).toEqual(["profile:edit-button"]);
        expect(replies).toEqual([]);
    });

    test("executes regex customId handlers", async () => {
        const values: Array<string> = [];
        const replies: Array<MockReplyPayload> = [];
        const handler = new CustomIdHandler<CustomIdItem<CustomIdInteractionMock>, CustomIdInteractionMock>("button", "unavailable");

        handler.register(createItem(/^profile:edit-button:\d+$/, values));

        await handler.execute(createCustomIdInteractionMock("profile:edit-button:123", replies));

        expect(values).toEqual(["profile:edit-button:123"]);
        expect(replies).toEqual([]);
    });

    test("replies when customId is unregistered", async () => {
        const replies: Array<MockReplyPayload> = [];
        const handler = new CustomIdHandler<CustomIdItem<CustomIdInteractionMock>, CustomIdInteractionMock>("button", "unavailable");

        await handler.execute(createCustomIdInteractionMock("unknown", replies));

        expect(replies).toEqual([{ content: "unavailable", flags: MessageFlags.Ephemeral }]);
    });

    test("does not reply to already deferred unregistered interactions", async () => {
        const replies: Array<MockReplyPayload> = [];
        const handler = new CustomIdHandler<CustomIdItem<CustomIdInteractionMock>, CustomIdInteractionMock>("button", "unavailable");

        await handler.execute(createCustomIdInteractionMock("unknown", replies, { deferred: true }));

        expect(replies).toEqual([]);
    });
});
