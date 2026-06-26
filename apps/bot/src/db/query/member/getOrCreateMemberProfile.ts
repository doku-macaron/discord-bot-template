import { and, eq } from "drizzle-orm";
import { defineQuery } from "@/db/query/defineQuery";
import { type InsertMemberProfile, memberProfiles, type SelectMemberProfile } from "@/db/schema/memberProfiles";

// `bio` is owned by `updateMemberProfileBio`; callers only supply identity.
export type GetOrCreateMemberProfileInput = Pick<InsertMemberProfile, "guildId" | "userId">;

/**
 * Ensure a `member_profiles` row exists for this (guild, user) pair so the FK
 * is satisfied before subsequent writes. Does NOT touch `bio` — that's owned
 * by `updateMemberProfileBio`.
 */
export const getOrCreateMemberProfile = defineQuery<[input: GetOrCreateMemberProfileInput], SelectMemberProfile>(async (input, client) => {
    const [row] = await client.insert(memberProfiles).values(input).onConflictDoNothing().returning();

    if (row) {
        return row;
    }

    const [existing] = await client
        .select()
        .from(memberProfiles)
        .where(and(eq(memberProfiles.guildId, input.guildId), eq(memberProfiles.userId, input.userId)))
        .limit(1);

    if (!existing) {
        throw new Error(`Member profile was not found: ${input.guildId}/${input.userId}`);
    }

    return existing;
});
