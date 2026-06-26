import { eq } from "drizzle-orm";
import { defineQuery } from "@/db/query/defineQuery";
import { guildSettings, type InsertGuildSettings, type SelectGuildSettings } from "@/db/schema/guildSettings";

// Setting values (`modRoleId` etc.) belong to `updateGuildSettings`; callers
// only supply identity.
export type GetOrCreateGuildSettingsInput = Pick<InsertGuildSettings, "guildId">;

/**
 * Ensure a `guild_settings` row exists. Used as a lazy populate path so that
 * the first time an admin command writes a setting, we don't have to special-
 * case "first write vs subsequent update".
 */
export const getOrCreateGuildSettings = defineQuery<[input: GetOrCreateGuildSettingsInput], SelectGuildSettings>(async (input, client) => {
    const [row] = await client.insert(guildSettings).values(input).onConflictDoNothing().returning();

    if (row) {
        return row;
    }

    const [existing] = await client.select().from(guildSettings).where(eq(guildSettings.guildId, input.guildId)).limit(1);

    if (!existing) {
        throw new Error(`Guild settings were not found: ${input.guildId}`);
    }

    return existing;
});
