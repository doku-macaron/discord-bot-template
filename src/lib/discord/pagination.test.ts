import { describe, expect, test } from "bun:test";
import {
    buildPaginationCustomId,
    buildPaginationRow,
    clampPage,
    nextPage,
    paginationCustomIdPattern,
    parsePaginationCustomId,
} from "@/lib/discord/pagination";

type ButtonSnapshot = { customId: string; label: string; disabled: boolean };

function snapshotRow(row: ReturnType<typeof buildPaginationRow>): Array<ButtonSnapshot> {
    return row.toJSON().components.map((component) => {
        const button = component as { custom_id?: string; label?: string; disabled?: boolean };
        return {
            customId: button.custom_id ?? "",
            label: button.label ?? "",
            disabled: button.disabled === true,
        };
    });
}

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

describe("buildPaginationRow", () => {
    test("first page disables first/prev and indicator", () => {
        const snapshot = snapshotRow(buildPaginationRow("help", 0, 5));

        expect(snapshot).toEqual([
            { customId: "help:pagination:first:0", label: "«", disabled: true },
            { customId: "help:pagination:prev:0", label: "‹", disabled: true },
            { customId: "help:pagination:indicator", label: "1 / 5", disabled: true },
            { customId: "help:pagination:next:0", label: "›", disabled: false },
            { customId: "help:pagination:last:0", label: "»", disabled: false },
        ]);
    });

    test("middle page enables all navigation", () => {
        const snapshot = snapshotRow(buildPaginationRow("help", 2, 5));

        expect(snapshot.map((b) => b.disabled)).toEqual([false, false, true, false, false]);
        expect(snapshot.map((b) => b.customId)).toEqual([
            "help:pagination:first:2",
            "help:pagination:prev:2",
            "help:pagination:indicator",
            "help:pagination:next:2",
            "help:pagination:last:2",
        ]);
        expect(snapshot[2]?.label).toBe("3 / 5");
    });

    test("last page disables next/last", () => {
        const snapshot = snapshotRow(buildPaginationRow("help", 4, 5));

        expect(snapshot.map((b) => b.disabled)).toEqual([false, false, true, true, true]);
        expect(snapshot[2]?.label).toBe("5 / 5");
    });

    test("clamps currentPage beyond totalPages", () => {
        const snapshot = snapshotRow(buildPaginationRow("help", 99, 3));

        expect(snapshot.map((b) => b.customId)).toEqual([
            "help:pagination:first:2",
            "help:pagination:prev:2",
            "help:pagination:indicator",
            "help:pagination:next:2",
            "help:pagination:last:2",
        ]);
        expect(snapshot[2]?.label).toBe("3 / 3");
        expect(snapshot.map((b) => b.disabled)).toEqual([false, false, true, true, true]);
    });

    test("empty (totalPages <= 0) disables all and shows 0 / 0", () => {
        const snapshot = snapshotRow(buildPaginationRow("help", 0, 0));

        expect(snapshot.map((b) => b.disabled)).toEqual([true, true, true, true, true]);
        expect(snapshot[2]?.label).toBe("0 / 0");
    });
});
