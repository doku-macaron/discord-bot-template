import { defineQuery } from "@/db/query/defineQuery";
import { guilds, type InsertGuild, type SelectGuild, type UpdateGuild } from "@/db/schema/guilds";

// `joinedAt` / `leftAt` are lifecycle columns this function owns; callers
// only supply identity.
export type RecordGuildJoinInput = Pick<InsertGuild, "guildId">;

/**
 * Called from the GuildCreate event when the bot joins (or re-joins) a guild.
 * Resets `joinedAt` to now and clears `leftAt`, so a re-invited guild looks
 * fresh while existing rows for currently-present guilds keep their original
 * `joinedAt` via the lazy `getOrCreateGuild` path (which doesn't touch
 * either column).
 */
export const recordGuildJoin = defineQuery<[input: RecordGuildJoinInput], SelectGuild>(async (input, client) => {
    const now = new Date();
    const set: UpdateGuild = {
        joinedAt: now,
        leftAt: null,
    };

    const [row] = await client
        .insert(guilds)
        .values({ guildId: input.guildId, joinedAt: now, leftAt: null })
        .onConflictDoUpdate({ target: guilds.guildId, set })
        .returning();

    if (!row) {
        throw new Error(`Guild was not found: ${input.guildId}`);
    }

    return row;
});
