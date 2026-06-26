import { beforeEach, describe, expect, mock, test } from "bun:test";

// Sentinel tx — the test asserts that the same reference is propagated to
// every query, so identity is what we care about, not shape.
const fakeTx = { __tag: "fake-tx" } as const;

let transactionShouldThrow: Error | undefined;

// Mock the transaction boundary directly: replicate `withTransaction`'s contract
// (run the callback with a sentinel tx, return a Result, convert throws to err).
mock.module("@repo/db/transaction", () => ({
    withTransaction: async <T>(callback: (tx: unknown) => Promise<T>) => {
        try {
            if (transactionShouldThrow) {
                throw transactionShouldThrow;
            }
            const data = await callback(fakeTx);
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
        }
    },
}));

const guildClients: Array<unknown> = [];

mock.module("@repo/db/query/guild/getOrCreateGuild", () => ({
    getOrCreateGuild: async (_input: unknown, client: unknown) => {
        guildClients.push(client);
        return { guildId: "g1" };
    },
}));

const profileClients: Array<unknown> = [];

mock.module("@repo/db/query/member/getOrCreateMemberProfile", () => ({
    getOrCreateMemberProfile: async (_input: unknown, client: unknown) => {
        profileClients.push(client);
        return { guildId: "g1", userId: "u1", bio: "" };
    },
}));

const bioCalls: Array<{ input: unknown; client: unknown }> = [];
let bioShouldThrow: Error | undefined;

mock.module("@repo/db/query/member/updateMemberProfileBio", () => ({
    updateMemberProfileBio: async (input: unknown, client: unknown) => {
        bioCalls.push({ input, client });
        if (bioShouldThrow) {
            throw bioShouldThrow;
        }
        const typed = input as { guildId: string; userId: string; bio: string };
        return { guildId: typed.guildId, userId: typed.userId, bio: typed.bio };
    },
}));

const { saveMemberProfileUseCase } = await import("@/usecases/member/saveMemberProfileUseCase");

const baseInput = {
    guildId: "g1",
    userId: "u1",
    bio: "Hello",
} as const;

beforeEach(() => {
    guildClients.length = 0;
    profileClients.length = 0;
    bioCalls.length = 0;
    bioShouldThrow = undefined;
    transactionShouldThrow = undefined;
});

describe("saveMemberProfileUseCase", () => {
    test("runs all three queries with the same tx and returns ok with the saved profile", async () => {
        const result = await saveMemberProfileUseCase({ ...baseInput });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.guildId).toBe("g1");
            expect(result.data.userId).toBe("u1");
            expect(result.data.bio).toBe("Hello");
        }

        // Every query gets the same `tx` reference — the whole point of the
        // shared transaction.
        expect(guildClients[0]).toBe(fakeTx);
        expect(profileClients[0]).toBe(fakeTx);
        expect(bioCalls[0]?.client).toBe(fakeTx);
    });

    test("wraps a query throw into an unexpected AppError carrying the original cause", async () => {
        const boom = new Error("bio write failed");
        bioShouldThrow = boom;

        const result = await saveMemberProfileUseCase({ ...baseInput });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.kind).toBe("unexpected");
            expect(result.error.cause).toBe(boom);
        }
    });

    test("wraps a withTransaction throw into an unexpected AppError and runs no queries", async () => {
        const boom = new Error("transaction open failed");
        transactionShouldThrow = boom;

        const result = await saveMemberProfileUseCase({ ...baseInput });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.kind).toBe("unexpected");
            expect(result.error.cause).toBe(boom);
        }
        expect(guildClients).toEqual([]);
        expect(profileClients).toEqual([]);
        expect(bioCalls).toEqual([]);
    });

    test("returns a validation AppError (and opens no transaction) when the bio is too long", async () => {
        const result = await saveMemberProfileUseCase({ ...baseInput, bio: "a".repeat(201) });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.kind).toBe("validation");
            expect(result.error.userMessage).toBeDefined();
        }
        expect(bioCalls).toEqual([]);
    });
});
