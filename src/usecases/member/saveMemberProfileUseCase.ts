import { getOrCreateGuild } from "@/db/query/guild/getOrCreateGuild";
import { getOrCreateMember } from "@/db/query/member/getOrCreateMember";
import type { SelectMember } from "@/db/schema/members";
import { withTransaction } from "@/db/transaction";
import type { Result } from "@/lib/util/result";

export type SaveMemberProfileInput = {
    guildId: string;
    guildName: string;
    userId: string;
    displayName: string;
};

export async function saveMemberProfileUseCase(input: SaveMemberProfileInput): Promise<Result<SelectMember, Error>> {
    return withTransaction(async (tx) => {
        await getOrCreateGuild(
            {
                guildId: input.guildId,
                name: input.guildName,
            },
            tx
        );

        const member = await getOrCreateMember(
            {
                guildId: input.guildId,
                userId: input.userId,
                displayName: input.displayName,
            },
            tx
        );

        return member;
    });
}
