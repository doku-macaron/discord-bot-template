import { and, eq, sql } from "drizzle-orm";
import { defineQuery } from "@/db/query/defineQuery";
import { members, type SelectMember } from "@/db/schema/members";

export type IncrementMemberCommandCountInput = {
    guildId: string;
    userId: string;
};

export const incrementMemberCommandCount = defineQuery<IncrementMemberCommandCountInput, SelectMember>(async (input, client) => {
    const [member] = await client
        .update(members)
        .set({
            commandCount: sql<number>`${members.commandCount} + 1`,
        })
        .where(and(eq(members.guildId, input.guildId), eq(members.userId, input.userId)))
        .returning();

    if (!member) {
        throw new Error(`Member was not found: ${input.guildId}/${input.userId}`);
    }

    return member;
});
