import { and, eq } from "drizzle-orm";
import { memberProfiles, type SelectMemberProfile } from "../../schema/memberProfiles.schema";
import { defineQuery } from "../defineQuery";

export type FindMemberProfileInput = {
    guildId: string;
    userId: string;
};

/**
 * Read-only lookup. Returns `null` when the row does not exist yet — useful
 * for prefilling UIs (modal default values) without creating a partial row
 * as a side effect.
 */
export const findMemberProfile = defineQuery<[input: FindMemberProfileInput], SelectMemberProfile | null>(async (input, client) => {
    const [row] = await client
        .select()
        .from(memberProfiles)
        .where(and(eq(memberProfiles.guildId, input.guildId), eq(memberProfiles.userId, input.userId)))
        .limit(1);

    return row ?? null;
});
