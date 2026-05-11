import { and, eq } from "drizzle-orm";
import { defineQuery } from "@/db/query/defineQuery";
import { memberProfiles, type SelectMemberProfile, type UpdateMemberProfile } from "@/db/schema/memberProfiles";

export type UpdateMemberProfileBioInput = {
    guildId: string;
    userId: string;
    bio: string;
};

/**
 * Update the bio on an existing `member_profiles` row. Callers are responsible
 * for ensuring the row exists first (typically via `getOrCreateMemberProfile`
 * inside the same `withTransaction`).
 */
export const updateMemberProfileBio = defineQuery<[input: UpdateMemberProfileBioInput], SelectMemberProfile>(async (input, client) => {
    const set: UpdateMemberProfile = { bio: input.bio };
    const [row] = await client
        .update(memberProfiles)
        .set(set)
        .where(and(eq(memberProfiles.guildId, input.guildId), eq(memberProfiles.userId, input.userId)))
        .returning();

    if (!row) {
        throw new Error(`Member profile was not found: ${input.guildId}/${input.userId}`);
    }

    return row;
});
