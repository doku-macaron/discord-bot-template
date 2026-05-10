import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { members, type SelectMember } from "@/db/schema/members";

type IncrementMemberCommandCountInput = {
    guildId: string;
    userId: string;
};

export async function incrementMemberCommandCount(input: IncrementMemberCommandCountInput): Promise<SelectMember> {
    const [member] = await db
        .update(members)
        .set({
            commandCount: sql`${members.commandCount} + 1`,
            updatedAt: new Date(),
        })
        .where(and(eq(members.guildId, input.guildId), eq(members.userId, input.userId)))
        .returning();

    if (!member) {
        throw new Error(`Member was not found: ${input.guildId}/${input.userId}`);
    }

    return member;
}
