import { describe, expect, test } from "bun:test";
import { parseDuration, parseTargetTime } from "@/lib/util/parseTime";

describe("parseDuration", () => {
    test("parses single-unit durations", () => {
        expect(parseDuration("45s")).toBe(45_000);
        expect(parseDuration("5m")).toBe(300_000);
        expect(parseDuration("2h")).toBe(7_200_000);
    });

    test("accumulates multiple units", () => {
        expect(parseDuration("1h30m")).toBe(5_400_000);
        expect(parseDuration("1h 30m 15s")).toBe(5_415_000);
    });

    test("is case-insensitive and trims whitespace", () => {
        expect(parseDuration("  1H30M  ")).toBe(5_400_000);
    });

    test("returns null for unparseable or zero-total inputs", () => {
        expect(parseDuration("")).toBeNull();
        expect(parseDuration("abc")).toBeNull();
        expect(parseDuration("0s")).toBeNull();
        expect(parseDuration("3d")).toBeNull();
    });
});

describe("parseTargetTime", () => {
    const now = new Date("2026-05-12T10:00:00.000Z");

    test("returns a future ISO-parseable datetime as-is", () => {
        const result = parseTargetTime("2026-05-12T12:00:00.000Z", now);
        expect(result?.toISOString()).toBe("2026-05-12T12:00:00.000Z");
    });

    test("rejects past ISO datetimes", () => {
        expect(parseTargetTime("2026-05-12T09:00:00.000Z", now)).toBeNull();
    });

    test("interprets HH:MM later today as today", () => {
        // now = 10:00 UTC = 19:00 JST (host TZ-dependent). Use a value clearly in the future
        // in local time to avoid TZ flakiness: 1 hour past local "now".
        const localNow = new Date(2026, 4, 12, 10, 0, 0);
        const target = parseTargetTime("11:30", localNow);
        expect(target?.getHours()).toBe(11);
        expect(target?.getMinutes()).toBe(30);
        expect(target?.getDate()).toBe(12);
    });

    test("rolls HH:MM to next day when already past", () => {
        const localNow = new Date(2026, 4, 12, 15, 0, 0);
        const target = parseTargetTime("09:00", localNow);
        expect(target?.getHours()).toBe(9);
        expect(target?.getMinutes()).toBe(0);
        expect(target?.getDate()).toBe(13);
    });

    test("rejects malformed HH:MM", () => {
        const localNow = new Date(2026, 4, 12, 10, 0, 0);
        expect(parseTargetTime("25:00", localNow)).toBeNull();
        expect(parseTargetTime("10:99", localNow)).toBeNull();
        expect(parseTargetTime("not a time", localNow)).toBeNull();
    });
});
