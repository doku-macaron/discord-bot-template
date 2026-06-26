import { getOrCreateGuild } from "@repo/db/query/guild/getOrCreateGuild";
import { getOrCreateGuildSettings } from "@repo/db/query/guild/getOrCreateGuildSettings";
import { updateGuildSettings } from "@repo/db/query/guild/updateGuildSettings";
import type { SelectGuildSettings, UpdateGuildSettings } from "@repo/db/schema/guildSettings.schema";
import { withTransaction } from "@repo/db/transaction";
import type { Result } from "@repo/shared";

export type UpdateGuildSettingsUseCaseInput = {
    guildId: string;
    settings: UpdateGuildSettings;
};

/**
 * Ensure the guild row, ensure the settings row, and apply a partial update.
 * All three steps share one transaction so the FK chain and the write are
 * atomic.
 */
export async function updateGuildSettingsUseCase(input: UpdateGuildSettingsUseCaseInput): Promise<Result<SelectGuildSettings, Error>> {
    return withTransaction(async (tx) => {
        const guild = await getOrCreateGuild({ guildId: input.guildId }, tx);

        await getOrCreateGuildSettings({ guildId: guild.guildId }, tx);

        return updateGuildSettings(
            {
                guildId: guild.guildId,
                settings: input.settings,
            },
            tx
        );
    });
}
