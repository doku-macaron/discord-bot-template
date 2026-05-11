import { eq } from "drizzle-orm";
import { defineQuery } from "@/db/query/defineQuery";
import { guilds, type InsertGuild, type SelectGuild } from "@/db/schema/guilds";

// Lifecycle columns (`joinedAt` / `leftAt`) belong to `recordGuildJoin` /
// `markGuildLeft`, so they are excluded from this function's input.
export type GetOrCreateGuildInput = Pick<InsertGuild, "guildId">;

/**
 * Ensure a row exists for this guild. Used as a lazy populate path so that
 * commands run before the GuildCreate event has been seen still have an FK
 * target. Does NOT touch `joinedAt` / `leftAt` — those belong to
 * `recordGuildJoin` / `markGuildLeft`.
 */
export const getOrCreateGuild = defineQuery<[input: GetOrCreateGuildInput], SelectGuild>(async (input, client) => {
    const [row] = await client.insert(guilds).values(input).onConflictDoNothing().returning();

    if (row) {
        return row;
    }

    const [existing] = await client.select().from(guilds).where(eq(guilds.guildId, input.guildId)).limit(1);

    if (!existing) {
        throw new Error(`Guild was not found: ${input.guildId}`);
    }

    return existing;
});
