import { eq } from "drizzle-orm";
import { guilds, type SelectGuild, type UpdateGuild } from "../../schema/guilds.schema";
import { defineQuery } from "../defineQuery";

// `updatedAt` is refreshed by the schema's $onUpdate hook on every UPDATE.
export const markGuildLeft = defineQuery<[guildId: string], SelectGuild | null>(async (guildId, client) => {
    const set: UpdateGuild = { leftAt: new Date() };
    const [updated] = await client.update(guilds).set(set).where(eq(guilds.guildId, guildId)).returning();

    return updated ?? null;
});
