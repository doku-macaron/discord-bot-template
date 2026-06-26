import { describe, expect, test } from "bun:test";
import { CooldownStore, createCooldownKey } from "@/lib/util/cooldown";

describe("CooldownStore", () => {
    test("allows the first hit and blocks until the window resets", () => {
        let now = 1_000;
        const cooldown = new CooldownStore({
            windowMs: 5_000,
            now: () => now,
        });

        expect(cooldown.hit("profile:edit:user-1")).toEqual({
            allowed: true,
            remaining: 0,
            resetAt: new Date(6_000),
        });

        expect(cooldown.hit("profile:edit:user-1")).toEqual({
            allowed: false,
            retryAfterMs: 5_000,
            resetAt: new Date(6_000),
        });

        now = 6_000;

        expect(cooldown.hit("profile:edit:user-1")).toEqual({
            allowed: true,
            remaining: 0,
            resetAt: new Date(11_000),
        });
    });

    test("supports multiple hits within the same window", () => {
        const cooldown = new CooldownStore({
            windowMs: 10_000,
            limit: 2,
            now: () => 1_000,
        });

        expect(cooldown.hit("ping:user-1")).toMatchObject({
            allowed: true,
            remaining: 1,
        });
        expect(cooldown.hit("ping:user-1")).toMatchObject({
            allowed: true,
            remaining: 0,
        });
        expect(cooldown.hit("ping:user-1")).toMatchObject({
            allowed: false,
            retryAfterMs: 10_000,
        });
    });

    test("resets and prunes entries", () => {
        let now = 1_000;
        const cooldown = new CooldownStore({
            windowMs: 1_000,
            now: () => now,
        });

        cooldown.hit("key-a");
        cooldown.reset("key-a");

        expect(cooldown.hit("key-a")).toMatchObject({
            allowed: true,
        });

        cooldown.hit("key-b");
        now = 2_000;
        cooldown.pruneExpired();

        expect(cooldown.hit("key-b")).toMatchObject({
            allowed: true,
            remaining: 0,
        });
    });
});

describe("createCooldownKey", () => {
    test("joins present key parts", () => {
        expect(createCooldownKey("command", undefined, "guild-1", null, "user-1")).toBe("command:guild-1:user-1");
    });
});
