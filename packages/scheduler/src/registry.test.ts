import { describe, expect, test } from "bun:test";
import { DuplicateHandlerError } from "@/errors";
import { createHandlerRegistry } from "@/registry";
import type { ScheduledJobHandler } from "@/types";

function handler(type: string): ScheduledJobHandler<unknown> {
    return { type, parsePayload: (p) => p, run: () => {} };
}

describe("createHandlerRegistry", () => {
    test("derives allowedJobTypes from the registered handlers", () => {
        const registry = createHandlerRegistry([handler("a"), handler("b")]);
        expect(registry.allowedJobTypes().sort()).toEqual(["a", "b"]);
        expect(registry.has("a")).toBe(true);
        expect(registry.has("c")).toBe(false);
        expect(registry.get("b")?.type).toBe("b");
    });

    test("rejects duplicate types", () => {
        expect(() => createHandlerRegistry([handler("dup"), handler("dup")])).toThrow(DuplicateHandlerError);
    });
});
