import { eq } from "drizzle-orm";
import { db } from "@/db";
import { guilds, type InsertGuild, type SelectGuild } from "@/db/schema/guilds";
import type { DbClient } from "@/db/transaction";

/**
 * Lazy populate / refresh `guilds.name`. Does NOT touch `joinedAt` / `leftAt`:
 * lifecycle tracking belongs to the GuildCreate / GuildDelete event handlers
 * (`recordGuildJoin` / `markGuildLeft`). If a command runs before the
 * GuildCreate event has fired for a brand-new guild, the INSERT path here
 * still picks up the default `joinedAt = now()`.
 */
export async function getOrCreateGuild(input: InsertGuild, client: DbClient = db): Promise<SelectGuild> {
    const [created] = await client
        .insert(guilds)
        .values(input)
        .onConflictDoUpdate({
            target: guilds.guildId,
            set: {
                name: input.name ?? "",
                updatedAt: new Date(),
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
