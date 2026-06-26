import { getOrCreateGuild } from "@repo/db/query/guild/getOrCreateGuild";
import { getOrCreateMemberProfile } from "@repo/db/query/member/getOrCreateMemberProfile";
import { updateMemberProfileBio } from "@repo/db/query/member/updateMemberProfileBio";
import type { SelectMemberProfile } from "@repo/db/schema/memberProfiles.schema";
import { withTransaction } from "@repo/db/transaction";
import type { Result } from "@repo/shared";

export type SaveMemberProfileInput = {
    guildId: string;
    userId: string;
    bio: string;
};

/**
 * Ensure the guild row, ensure the member profile row, and write the supplied
 * bio — all in one transaction so the FK chain and the write are atomic.
 */
export async function saveMemberProfileUseCase(input: SaveMemberProfileInput): Promise<Result<SelectMemberProfile, Error>> {
    return withTransaction(async (tx) => {
        const guild = await getOrCreateGuild({ guildId: input.guildId }, tx);

        await getOrCreateMemberProfile({ guildId: guild.guildId, userId: input.userId }, tx);

        return updateMemberProfileBio(
            {
                guildId: guild.guildId,
                userId: input.userId,
                bio: input.bio,
            },
            tx
        );
    });
}
