import { describe, expect, test } from "bun:test";
import { SubCommand } from "@/events/interactionCreate/commands/chatInput/_core/subCommand";
import { createRichCommandInteractionMock, type MockReplyRecord } from "@/lib/testing/interactions";

describe("SubCommand", () => {
    test("invokes the executor", async () => {
        const records: Array<MockReplyRecord> = [];
        const interaction = createRichCommandInteractionMock("parent", records);
        let received = false;

        const sub = new SubCommand(
            (builder) => {
                builder.setName("child").setDescription("child");
            },
            async () => {
                received = true;
            }
        );

        await sub.execute(interaction);

        expect(received).toBe(true);
    });

    test("propagates executor errors", async () => {
        const records: Array<MockReplyRecord> = [];
        const interaction = createRichCommandInteractionMock("parent", records);
        const failure = new Error("sub-boom");

        const sub = new SubCommand(
            (builder) => {
                builder.setName("child").setDescription("child");
            },
            async () => {
                throw failure;
            }
        );

        await expect(sub.execute(interaction)).rejects.toBe(failure);
    });
});
