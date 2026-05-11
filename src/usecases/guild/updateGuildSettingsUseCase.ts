import { getOrCreateGuild } from "@/db/query/guild/getOrCreateGuild";
import { getOrCreateGuildSettings } from "@/db/query/guild/getOrCreateGuildSettings";
import { updateGuildSettings } from "@/db/query/guild/updateGuildSettings";
import type { SelectGuildSettings, UpdateGuildSettings } from "@/db/schema/guildSettings";
import { withTransaction } from "@/db/transaction";
import type { Result } from "@/lib/util/result";

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
