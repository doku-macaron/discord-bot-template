import { describe, expect, test } from "bun:test";
import { err, ok } from "@/lib/result";
import { handleResult, logResult, logVoidResult } from "@/lib/resultHandler";
import { createRichCommandInteractionMock, type MockReplyRecord } from "@/lib/testing/interactions";

describe("handleResult", () => {
    test("returns data on success without sending any reply", async () => {
        const records: Array<MockReplyRecord> = [];
        const interaction = createRichCommandInteractionMock("cmd", records);

        const data = await handleResult(ok("payload"), interaction);

        expect(data).toBe("payload");
        expect(records).toEqual([]);
    });

    test("returns null and calls replyError on failure", async () => {
        const records: Array<MockReplyRecord> = [];
        const interaction = createRichCommandInteractionMock("cmd", records);

        const data = await handleResult(err(new Error("fail")), interaction);

        expect(data).toBeNull();
        expect(records.length).toBe(1);
        expect(records[0]?.kind).toBe("reply");
        const payload = records[0]?.payload as { content: string };
        expect(payload.content).toContain("fail");
    });

    test("uses options.errorMessage when provided", async () => {
        const records: Array<MockReplyRecord> = [];
        const interaction = createRichCommandInteractionMock("cmd", records);

        await handleResult(err(new Error("internal")), interaction, { errorMessage: "user-facing" });

        const payload = records[0]?.payload as { content: string };
        expect(payload.content).toContain("user-facing");
    });
});

describe("logResult", () => {
    test("returns data on success", () => {
        expect(logResult(ok(123))).toBe(123);
    });

    test("returns null on failure", () => {
        expect(logResult(err(new Error("oops")))).toBeNull();
    });
});

describe("logVoidResult", () => {
    test("returns true on success", () => {
        expect(logVoidResult(ok(undefined))).toBe(true);
    });

    test("returns false on failure", () => {
        expect(logVoidResult(err(new Error("oops")))).toBe(false);
    });
});
