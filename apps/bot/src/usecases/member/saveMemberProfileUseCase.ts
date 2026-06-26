import { getOrCreateGuild } from "@repo/db/query/guild/getOrCreateGuild";
import { getOrCreateMemberProfile } from "@repo/db/query/member/getOrCreateMemberProfile";
import { updateMemberProfileBio } from "@repo/db/query/member/updateMemberProfileBio";
import type { SelectMemberProfile } from "@repo/db/schema/memberProfiles.schema";
import { withTransaction } from "@repo/db/transaction";
import { err, ok, type Result } from "@repo/shared";
import { type AppError, fromUnknownError, validationError } from "@repo/shared/error/appError";

const BIO_MAX_LENGTH = 200;

export type SaveMemberProfileInput = {
    guildId: string;
    userId: string;
    bio: string;
};

/**
 * Ensure the guild row, ensure the member profile row, and write the supplied bio —
 * all in one transaction so the FK chain and the write are atomic. Returns a
 * kind-discriminated `AppError`: a `validation` error for an over-long bio, otherwise
 * an `unexpected` error wrapping the underlying failure.
 */
export async function saveMemberProfileUseCase(input: SaveMemberProfileInput): Promise<Result<SelectMemberProfile, AppError>> {
    if (input.bio.length > BIO_MAX_LENGTH) {
        return err(
            validationError(
                `bio length ${input.bio.length} exceeds ${BIO_MAX_LENGTH}`,
                `自己紹介は${BIO_MAX_LENGTH}文字以内で入力してください。`
            )
        );
    }

    const result = await withTransaction(async (tx) => {
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

    if (!result.success) {
        return err(fromUnknownError("failed to save member profile", result.error));
    }

    return ok(result.data);
}
