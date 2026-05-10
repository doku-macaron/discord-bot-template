import { describe, expect, test } from "bun:test";
import { err, isErr, isOk, ok, unwrapOr, unwrapOrThrow } from "@/lib/result";

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
});
