import { describe, expect, test } from "bun:test";
import { err, isErr, isOk, ok, unwrapOr, unwrapOrThrow } from "@/lib/util/result";

describe("Result", () => {
    test("wraps success values", () => {
        const result = ok("done");

        expect(isOk(result)).toBe(true);
        expect(unwrapOr(result, "fallback")).toBe("done");
        expect(unwrapOrThrow(result)).toBe("done");
    });

    test("wraps errors", () => {
        const error = new Error("failed");
        const result = err(error);

        expect(isErr(result)).toBe(true);
        expect(unwrapOr(result, "fallback")).toBe("fallback");
        expect(() => unwrapOrThrow(result)).toThrow(error);
    });

    test("unwrapOrThrow converts non-Error rejection values into Error", () => {
        const result = err("string-fail");

        try {
            unwrapOrThrow(result);
            throw new Error("unwrapOrThrow should have thrown");
        } catch (thrown) {
            expect(thrown).toBeInstanceOf(Error);
            expect((thrown as Error).message).toBe("string-fail");
        }
    });
});
