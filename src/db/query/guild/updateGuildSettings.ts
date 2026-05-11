import { eq } from "drizzle-orm";
import { defineQuery } from "@/db/query/defineQuery";
import { guildSettings, type SelectGuildSettings, type UpdateGuildSettings } from "@/db/schema/guildSettings";

export type UpdateGuildSettingsInput = {
    guildId: string;
    settings: UpdateGuildSettings;
};

/**
 * Apply a partial update to an existing `guild_settings` row. Callers are
 * responsible for ensuring the row exists first (typically via
 * `getOrCreateGuildSettings` inside the same `withTransaction`).
 */
export const updateGuildSettings = defineQuery<[input: UpdateGuildSettingsInput], SelectGuildSettings>(async (input, client) => {
    const [row] = await client.update(guildSettings).set(input.settings).where(eq(guildSettings.guildId, input.guildId)).returning();

    if (!row) {
        throw new Error(`Guild settings were not found: ${input.guildId}`);
    }

    return row;
});
