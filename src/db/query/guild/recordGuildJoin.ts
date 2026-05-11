import { eq } from "drizzle-orm";
import { db } from "@/db";
import { guilds, type InsertGuild, type SelectGuild } from "@/db/schema/guilds";
import type { DbClient } from "@/db/transaction";

/**
 * Called from the GuildCreate event when the bot joins (or re-joins) a guild.
 * Resets `joinedAt` to now and clears `leftAt`, so a re-invited guild looks
 * fresh while existing rows for currently-present guilds keep their original
 * `joinedAt` only via the lazy `getOrCreateGuild` path (which doesn't touch
 * either column).
 */
export async function recordGuildJoin(input: InsertGuild, client: DbClient = db): Promise<SelectGuild> {
    const now = new Date();
    const [created] = await client
        .insert(guilds)
        .values({ ...input, joinedAt: input.joinedAt ?? now, leftAt: input.leftAt ?? null })
        .onConflictDoUpdate({
            target: guilds.guildId,
            set: {
                name: input.name ?? "",
                updatedAt: now,
                joinedAt: now,
                leftAt: null,
            },
        })
        .returning();

    if (created) {
        return created;
    }

    const [guild] = await client.select().from(guilds).where(eq(guilds.guildId, input.guildId)).limit(1);

    if (!guild) {
        throw new Error(`Guild was not found: ${input.guildId}`);
    }

    return guild;
}
