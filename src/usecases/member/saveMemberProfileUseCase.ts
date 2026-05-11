import { getOrCreateGuild } from "@/db/query/guild/getOrCreateGuild";
import { getOrCreateMember } from "@/db/query/member/getOrCreateMember";
import type { SelectMember } from "@/db/schema/members";
import { err, ok, type Result } from "@/lib/util/result";

export type SaveMemberProfileInput = {
    guildId: string;
    guildName: string;
    userId: string;
    displayName: string;
};

export async function saveMemberProfileUseCase(input: SaveMemberProfileInput): Promise<Result<SelectMember, Error>> {
    try {
        await getOrCreateGuild({
            guildId: input.guildId,
            name: input.guildName,
        });

        const member = await getOrCreateMember({
            guildId: input.guildId,
            userId: input.userId,
            displayName: input.displayName,
        });

        return ok(member);
    } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
    }
}
