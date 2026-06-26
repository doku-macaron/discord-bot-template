import { describe, expect, test } from "bun:test";
import { MessageFlags } from "discord.js";
import { replyError } from "@/lib/discord/replyError";
import { createRichCommandInteractionMock, type MockReplyRecord } from "@/lib/testing/interactions";

describe("replyError", () => {
    test("calls reply with ephemeral flag when interaction is fresh", async () => {
        const records: Array<MockReplyRecord> = [];
        const interaction = createRichCommandInteractionMock("cmd", records);

        await replyError(interaction, new Error("boom"));

        expect(records.length).toBe(1);
        expect(records[0]?.kind).toBe("reply");
        const payload = records[0]?.payload as { flags?: unknown; content?: string };
        expect(payload.flags).toBe(MessageFlags.Ephemeral);
        expect(payload.content).toContain("boom");
    });

    test("calls editReply when interaction is deferred", async () => {
        const records: Array<MockReplyRecord> = [];
        const interaction = createRichCommandInteractionMock("cmd", records, { deferred: true });

        await replyError(interaction, new Error("deferred-boom"));

        expect(records.length).toBe(1);
        expect(records[0]?.kind).toBe("editReply");
        const payload = records[0]?.payload as { content?: string; flags?: unknown };
        expect(payload.content).toContain("deferred-boom");
        expect(payload.flags).toBeUndefined();
    });

    test("calls followUp when interaction has already replied", async () => {
        const records: Array<MockReplyRecord> = [];
        const interaction = createRichCommandInteractionMock("cmd", records, { replied: true });

        await replyError(interaction, new Error("followup-boom"));

        expect(records.length).toBe(1);
        expect(records[0]?.kind).toBe("followUp");
        const payload = records[0]?.payload as { flags?: unknown };
        expect(payload.flags).toBe(MessageFlags.Ephemeral);
    });

    test("includes formatInteractionContext output in the codeBlock", async () => {
        const records: Array<MockReplyRecord> = [];
        const interaction = createRichCommandInteractionMock("ping", records);

        await replyError(interaction, new Error("with-context"));

        const payload = records[0]?.payload as { content: string };
        expect(payload.content).toContain("```ml");
        expect(payload.content).toContain("with-context");
    });
});
