import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { type InsertMember, members, type SelectMember } from "@/db/schema/members";
import type { DbClient } from "@/db/transaction";

export async function getOrCreateMember(input: InsertMember, client: DbClient = db): Promise<SelectMember> {
    const [created] = await client
        .insert(members)
        .values(input)
        .onConflictDoUpdate({
            target: [members.guildId, members.userId],
            set: {
                displayName: input.displayName ?? "",
                updatedAt: new Date(),
            },
        })
        .returning();

    if (created) {
        return created;
    }

    const [member] = await client
        .select()
        .from(members)
        .where(and(eq(members.guildId, input.guildId), eq(members.userId, input.userId)))
        .limit(1);

    if (!member) {
        throw new Error(`Member was not found: ${input.guildId}/${input.userId}`);
    }

    return member;
}
