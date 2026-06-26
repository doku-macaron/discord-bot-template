import { describe, expect, test } from "bun:test";
import {
    type AppError,
    externalError,
    fromUnknownError,
    isAppError,
    notFoundError,
    permissionDeniedError,
    rateLimitedError,
    toError,
    unexpectedError,
    validationError,
} from "@/error/appError";

describe("AppError helpers", () => {
    test("validationError preserves message and userMessage", () => {
        const e = validationError("internal detail", "user-facing");
        expect(e.kind).toBe("validation");
        expect(e.message).toBe("internal detail");
        expect(e.userMessage).toBe("user-facing");
    });

    test("notFoundError without userMessage leaves it undefined", () => {
        const e = notFoundError("row missing");
        expect(e.kind).toBe("not_found");
        expect(e.userMessage).toBeUndefined();
    });

    test("permissionDeniedError carries kind", () => {
        const e = permissionDeniedError("missing perm");
        expect(e.kind).toBe("permission_denied");
    });

    test("externalError preserves cause", () => {
        const cause = new Error("downstream");
        const e = externalError("call failed", cause);
        expect(e.kind).toBe("external");
        expect(e.cause).toBe(cause);
    });

    test("rateLimitedError carries kind", () => {
        const e = rateLimitedError("slow down");
        expect(e.kind).toBe("rate_limited");
    });

    test("unexpectedError carries kind and cause", () => {
        const cause = { weird: true };
        const e = unexpectedError("boom", cause);
        expect(e.kind).toBe("unexpected");
        expect(e.cause).toBe(cause);
    });

    test("fromUnknownError wraps arbitrary throw value into unexpected", () => {
        const e = fromUnknownError("op failed", "not even an error");
        expect(e.kind).toBe("unexpected");
        expect(e.message).toBe("op failed");
        expect(e.cause).toBe("not even an error");
    });
});

describe("isAppError", () => {
    test("returns true for AppError shapes", () => {
        const e: AppError = { kind: "validation", message: "x" };
        expect(isAppError(e)).toBe(true);
    });

    test("returns false for plain Error", () => {
        expect(isAppError(new Error("nope"))).toBe(false);
    });

    test("returns false for objects with wrong kind value", () => {
        expect(isAppError({ kind: "totally_made_up", message: "x" })).toBe(false);
    });

    test("returns false for null and primitives", () => {
        expect(isAppError(null)).toBe(false);
        expect(isAppError("string")).toBe(false);
        expect(isAppError(42)).toBe(false);
    });
});

describe("toError", () => {
    test("returns the same Error instance when given Error without override", () => {
        const err = new Error("hi");
        expect(toError(err)).toBe(err);
    });

    test("wraps AppError into Error preserving message and cause", () => {
        const cause = new Error("root");
        const wrapped = toError(unexpectedError("wrap me", cause));
        expect(wrapped).toBeInstanceOf(Error);
        expect(wrapped.message).toBe("wrap me");
        expect(wrapped.cause).toBe(cause);
    });

    test("appends cause stack as 'Caused by:' so logger/replyError keep the root frame", () => {
        const cause = new Error("root failure");
        const wrapped = toError(unexpectedError("wrap me", cause));
        expect(wrapped.stack).toContain("Caused by:");
        expect(wrapped.stack).toContain(cause.stack ?? "root failure");
    });

    test("does not append a Caused-by section when cause is not an Error", () => {
        const wrapped = toError(unexpectedError("wrap me", "plain string"));
        expect(wrapped.stack).not.toContain("Caused by:");
    });

    test("messageOverride on AppError builds a new Error with the override message and chained stack", () => {
        const cause = new Error("root failure");
        const wrapped = toError(unexpectedError("dev message", cause), "user-facing override");
        expect(wrapped.message).toBe("user-facing override");
        expect(wrapped.stack).toContain("Caused by:");
        expect(wrapped.stack).toContain(cause.stack ?? "root failure");
    });

    test("messageOverride on Error chains the original Error as cause and appends its stack", () => {
        const original = new Error("original");
        const wrapped = toError(original, "user-facing override");
        expect(wrapped).not.toBe(original);
        expect(wrapped.message).toBe("user-facing override");
        expect(wrapped.cause).toBe(original);
        expect(wrapped.stack).toContain("Caused by:");
        expect(wrapped.stack).toContain(original.stack ?? "original");
    });

    test("messageOverride equal to the Error's message returns the same instance", () => {
        const err = new Error("same");
        expect(toError(err, "same")).toBe(err);
    });
});
