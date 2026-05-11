import { describe, expect, test } from "bun:test";
import { executeCommand } from "@/framework/discord/interactions/chatInput/commandExecutor";
import { createRichCommandInteractionMock, type MockReplyRecord } from "@/lib/testing/interactions";

describe("executeCommand", () => {
    test("awaits a plain async executor without calling deferReply", async () => {
        const records: Array<MockReplyRecord> = [];
        const interaction = createRichCommandInteractionMock("plain", records);
        let called = false;

        await executeCommand(async (received) => {
            called = true;
            await received.reply({ content: "ok" });
        }, interaction);

        expect(called).toBe(true);
        expect(records.map((r) => r.kind)).toEqual(["reply"]);
    });

    test("defers and editReplies once for a single-yield async generator", async () => {
        const records: Array<MockReplyRecord> = [];
        const interaction = createRichCommandInteractionMock("gen", records);

        async function* executor(): AsyncGenerator<string, void, { id: string }> {
            yield "first";
        }

        await executeCommand(executor, interaction);

        expect(records.map((r) => r.kind)).toEqual(["deferReply", "editReply"]);
        expect(records[1]?.payload).toBe("first");
    });

    test("editReplies multiple times and feeds last message back to generator", async () => {
        const records: Array<MockReplyRecord> = [];
        const interaction = createRichCommandInteractionMock("gen-multi", records, { editReplyResult: { id: "edited" } });
        const seenIds: Array<string | undefined> = [];

        async function* executor(): AsyncGenerator<string, void, { id: string }> {
            const first = yield "first";
            seenIds.push(first?.id);
            const second = yield "second";
            seenIds.push(second?.id);
        }

        await executeCommand(executor, interaction);

        expect(records.map((r) => r.kind)).toEqual(["deferReply", "editReply", "editReply"]);
        expect(records.map((r) => r.payload)).toEqual([undefined, "first", "second"]);
        expect(seenIds).toEqual(["edited", "edited"]);
    });
});
