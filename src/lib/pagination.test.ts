import { describe, expect, test } from "bun:test";
import { buildPaginationCustomId, clampPage, nextPage, paginationCustomIdPattern, parsePaginationCustomId } from "@/lib/pagination";

describe("pagination customId", () => {
    test("builds and parses customId", () => {
        const customId = buildPaginationCustomId("help", "next", 2);
        expect(customId).toBe("help:pagination:next:2");

        const parsed = parsePaginationCustomId(customId);
        expect(parsed).toEqual({ feature: "help", action: "next", page: 2 });
    });

    test("returns null for non-matching customId", () => {
        expect(parsePaginationCustomId("help:other:next:2")).toBeNull();
        expect(parsePaginationCustomId("profile:edit-button")).toBeNull();
    });

    test("pattern matches buildPaginationCustomId output for the same feature", () => {
        const pattern = paginationCustomIdPattern("help");
        expect(pattern.test("help:pagination:first:0")).toBe(true);
        expect(pattern.test("help:pagination:next:42")).toBe(true);
        expect(pattern.test("help:pagination:indicator")).toBe(false);
        expect(pattern.test("other:pagination:next:1")).toBe(false);
    });
});

describe("clampPage", () => {
    test("clamps below zero", () => {
        expect(clampPage(-5, 3)).toBe(0);
    });

    test("clamps above total", () => {
        expect(clampPage(10, 3)).toBe(2);
    });

    test("returns zero when totalPages is zero or negative", () => {
        expect(clampPage(5, 0)).toBe(0);
        expect(clampPage(5, -1)).toBe(0);
    });
});

describe("nextPage", () => {
    test("first jumps to 0", () => {
        expect(nextPage("first", 4, 5)).toBe(0);
    });

    test("last jumps to totalPages - 1", () => {
        expect(nextPage("last", 0, 5)).toBe(4);
    });

    test("prev decrements with clamp", () => {
        expect(nextPage("prev", 2, 5)).toBe(1);
        expect(nextPage("prev", 0, 5)).toBe(0);
    });

    test("next increments with clamp", () => {
        expect(nextPage("next", 2, 5)).toBe(3);
        expect(nextPage("next", 4, 5)).toBe(4);
    });
});
