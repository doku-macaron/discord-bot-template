import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { type InsertMember, members, type SelectMember, type UpdateMember } from "@/db/schema/members";
import type { DbClient } from "@/db/transaction";

/**
 * Only fields the caller actually provides are refreshed on conflict. Omitting
 * `displayName` leaves the existing row's displayName intact rather than
 * overwriting it with the column default — important because a user may have
 * saved a displayName via the profile modal that we don't want to wipe when
 * another caller forgets to pass one.
 */
export async function getOrCreateMember(input: InsertMember, client: DbClient = db): Promise<SelectMember> {
    const [row] =
        input.displayName === undefined
            ? await client.insert(members).values(input).onConflictDoNothing().returning()
            : await client
                  .insert(members)
                  .values(input)
                  .onConflictDoUpdate({
                      target: [members.guildId, members.userId],
                      set: { displayName: input.displayName } satisfies UpdateMember,
                  })
                  .returning();

    if (row) {
        return row;
    }

    // `onConflictDoNothing` returns no row when the row already exists; fall back to SELECT.
    const [existing] = await client
        .select()
        .from(members)
        .where(and(eq(members.guildId, input.guildId), eq(members.userId, input.userId)))
        .limit(1);

    if (!existing) {
        throw new Error(`Member was not found: ${input.guildId}/${input.userId}`);
    }

    return existing;
}
