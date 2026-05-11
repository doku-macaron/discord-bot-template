import { defineQuery } from "@/db/query/defineQuery";
import { guilds, type InsertGuild, type SelectGuild, type UpdateGuild } from "@/db/schema/guilds";

// `joinedAt` / `leftAt` are lifecycle columns this function owns, so callers
// supply only the identity (`guildId`) and the refreshable label (`name`).
export type RecordGuildJoinInput = Pick<InsertGuild, "guildId" | "name">;

/**
 * Called from the GuildCreate event when the bot joins (or re-joins) a guild.
 * Resets `joinedAt` to now and clears `leftAt`, so a re-invited guild looks
 * fresh while existing rows for currently-present guilds keep their original
 * `joinedAt` only via the lazy `getOrCreateGuild` path (which doesn't touch
 * either column). `name` is refreshed only when the caller provides one.
 */
export const recordGuildJoin = defineQuery<RecordGuildJoinInput, SelectGuild>(async (input, client) => {
    const now = new Date();
    const set: UpdateGuild = {
        joinedAt: now,
        leftAt: null,
    };
    if (input.name !== undefined) {
        set.name = input.name;
    }

    const [row] = await client
        .insert(guilds)
        .values({ ...input, joinedAt: now, leftAt: null })
        .onConflictDoUpdate({ target: guilds.guildId, set })
        .returning();

    if (!row) {
        throw new Error(`Guild was not found: ${input.guildId}`);
    }

    return row;
});
