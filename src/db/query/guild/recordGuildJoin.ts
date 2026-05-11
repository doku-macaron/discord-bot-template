import { db } from "@/db";
import { guilds, type InsertGuild, type SelectGuild, type UpdateGuild } from "@/db/schema/guilds";
import type { DbClient } from "@/db/transaction";

/**
 * Called from the GuildCreate event when the bot joins (or re-joins) a guild.
 * Resets `joinedAt` to now and clears `leftAt`, so a re-invited guild looks
 * fresh while existing rows for currently-present guilds keep their original
 * `joinedAt` only via the lazy `getOrCreateGuild` path (which doesn't touch
 * either column). `name` is refreshed only when the caller provides one.
 */
export async function recordGuildJoin(input: InsertGuild, client: DbClient = db): Promise<SelectGuild> {
    const now = new Date();
    const set: UpdateGuild = {
        joinedAt: now,
        leftAt: null,
    };
    if (input.name !== undefined) {
        set.name = input.name;
    }

    // `joinedAt` / `leftAt` are lifecycle columns owned by this function (and
    // `markGuildLeft`). Callers do not — and should not — set them, so we
    // ignore those fields on `input` and write the canonical values directly.
    const [row] = await client
        .insert(guilds)
        .values({ ...input, joinedAt: now, leftAt: null })
        .onConflictDoUpdate({ target: guilds.guildId, set })
        .returning();

    if (!row) {
        throw new Error(`Guild was not found: ${input.guildId}`);
    }

    return row;
}
