import { describe, expect, mock, test } from "bun:test";

mock.module("@/db", () => ({
    db: {
        transaction: async <T>(callback: (tx: Record<string, unknown>) => Promise<T>) => callback({}),
    },
}));

const { withTransaction } = await import("@/db/transaction");

describe("withTransaction", () => {
    test("returns ok with the callback result on success", async () => {
        const result = await withTransaction(async () => 42);

        expect(result).toEqual({ success: true, data: 42 });
    });

    test("returns err with the original Error when callback throws an Error", async () => {
        const failure = new Error("tx-fail");

        const result = await withTransaction(async () => {
            throw failure;
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBe(failure);
        }
    });

    test("wraps non-Error throws into an Error", async () => {
        const result = await withTransaction(async () => {
            throw "string-fail";
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(Error);
            expect(result.error.message).toBe("string-fail");
        }
    });
});
