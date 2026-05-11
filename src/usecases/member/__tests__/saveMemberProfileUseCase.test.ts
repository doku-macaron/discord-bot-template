import { beforeEach, describe, expect, mock, test } from "bun:test";

// Sentinel tx — the test asserts that the same reference is propagated to both
// queries, so identity is what we care about, not shape.
const fakeTx = { __tag: "fake-tx" } as const;

let transactionShouldThrow: Error | undefined;

mock.module("@/db", () => ({
    db: {
        transaction: async <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => {
            if (transactionShouldThrow) {
                throw transactionShouldThrow;
            }
            return callback(fakeTx);
        },
    },
}));

const guildClients: Array<unknown> = [];
let guildShouldThrow: Error | undefined;

mock.module("@/db/query/guild/getOrCreateGuild", () => ({
    getOrCreateGuild: async (_input: unknown, client: unknown) => {
        guildClients.push(client);
        if (guildShouldThrow) {
            throw guildShouldThrow;
        }
        return { guildId: "g1", name: "Guild" };
    },
}));

const memberClients: Array<unknown> = [];

mock.module("@/db/query/member/getOrCreateMember", () => ({
    getOrCreateMember: async (_input: unknown, client: unknown) => {
        memberClients.push(client);
        return {
            guildId: "g1",
            userId: "u1",
            displayName: "Display",
        };
    },
}));

const { saveMemberProfileUseCase } = await import("@/usecases/member/saveMemberProfileUseCase");

const baseInput = {
    guildId: "g1",
    guildName: "Guild",
    userId: "u1",
    displayName: "Display",
} as const;

beforeEach(() => {
    guildClients.length = 0;
    memberClients.length = 0;
    guildShouldThrow = undefined;
    transactionShouldThrow = undefined;
});

describe("saveMemberProfileUseCase", () => {
    test("runs both queries with the same tx handle and returns ok with the member", async () => {
        const result = await saveMemberProfileUseCase({ ...baseInput });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.guildId).toBe("g1");
            expect(result.data.userId).toBe("u1");
            expect(result.data.displayName).toBe("Display");
        }

        expect(guildClients).toEqual([fakeTx]);
        expect(memberClients).toEqual([fakeTx]);
        // The whole point of the refactor: both queries share the same tx reference.
        expect(guildClients[0]).toBe(memberClients[0]);
    });

    test("returns err Result when a query throws (tx rolls back)", async () => {
        const boom = new Error("guild write failed");
        guildShouldThrow = boom;

        const result = await saveMemberProfileUseCase({ ...baseInput });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBe(boom);
        }
        // The member query must NOT have been called because the first one threw
        // before reaching it inside the same transaction callback.
        expect(memberClients).toEqual([]);
    });

    test("returns err Result when withTransaction itself throws (e.g. connection failure)", async () => {
        const boom = new Error("transaction open failed");
        transactionShouldThrow = boom;

        const result = await saveMemberProfileUseCase({ ...baseInput });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBe(boom);
        }
        expect(guildClients).toEqual([]);
        expect(memberClients).toEqual([]);
    });
});
