import { afterEach, describe, expect, test } from "bun:test";
import { captureException, type ErrorReporter, resetErrorReporter, setErrorReporter } from "@/lib/errorReporter";

afterEach(() => {
    resetErrorReporter();
});

describe("errorReporter", () => {
    test("forwards captureException to the registered reporter", () => {
        const calls: Array<{ error: Error; category?: string }> = [];
        const reporter: ErrorReporter = {
            captureException: (error, context) => {
                calls.push({ error, category: context?.category });
            },
        };
        setErrorReporter(reporter);

        const error = new Error("boom");
        captureException(error, { category: "Bot" });

        expect(calls).toEqual([{ error, category: "Bot" }]);
    });

    test("default reporter is a no-op", () => {
        expect(() => captureException(new Error("noop"))).not.toThrow();
    });

    test("swallows reporter errors so logger.error cannot loop", () => {
        setErrorReporter({
            captureException: () => {
                throw new Error("reporter exploded");
            },
        });

        expect(() => captureException(new Error("real"))).not.toThrow();
    });

    test("swallows async reporter rejections", async () => {
        setErrorReporter({
            captureException: () => Promise.reject(new Error("async fail")),
        });

        captureException(new Error("real"));
        await new Promise((resolve) => setTimeout(resolve, 0));
    });

    test("swallows thenable (non-Promise) rejections", async () => {
        function makeRejectingThenable(): PromiseLike<void> {
            const obj: Record<string, unknown> = {};
            // biome-ignore lint/suspicious/noThenProperty: intentionally testing thenable detection
            obj.then = (_resolve: unknown, reject: ((reason: unknown) => void) | undefined) => {
                reject?.(new Error("thenable fail"));
            };
            return obj as unknown as PromiseLike<void>;
        }

        setErrorReporter({
            captureException: () => makeRejectingThenable() as unknown as Promise<void>,
        });

        expect(() => captureException(new Error("real"))).not.toThrow();
        await new Promise((resolve) => setTimeout(resolve, 0));
    });
});
