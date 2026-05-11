import { eq } from "drizzle-orm";
import { db } from "@/db";
import { guilds, type InsertGuild, type SelectGuild, type UpdateGuild } from "@/db/schema/guilds";
import type { DbClient } from "@/db/transaction";

// Lifecycle columns (`joinedAt` / `leftAt`) belong to `recordGuildJoin` /
// `markGuildLeft`, so they are excluded from this function's input.
export type GetOrCreateGuildInput = Pick<InsertGuild, "guildId" | "name">;

/**
 * Lazy populate / refresh `guilds.name`. Does NOT touch `joinedAt` / `leftAt`.
 * If a command runs before the GuildCreate event has fired for a brand-new
 * guild, the INSERT path here still picks up the default `joinedAt = now()`.
 *
 * Only fields the caller actually provides are refreshed on conflict. Omitting
 * `name` leaves the existing row's name intact rather than overwriting it with
 * the column default.
 */
export async function getOrCreateGuild(input: GetOrCreateGuildInput, client: DbClient = db): Promise<SelectGuild> {
    const [row] =
        input.name === undefined
            ? await client.insert(guilds).values(input).onConflictDoNothing().returning()
            : await client
                  .insert(guilds)
                  .values(input)
                  .onConflictDoUpdate({
                      target: guilds.guildId,
                      set: { name: input.name } satisfies UpdateGuild,
                  })
                  .returning();

    if (row) {
        return row;
    }

    // `onConflictDoNothing` returns no row when the row already exists; fall back to SELECT.
    const [existing] = await client.select().from(guilds).where(eq(guilds.guildId, input.guildId)).limit(1);

    if (!existing) {
        throw new Error(`Guild was not found: ${input.guildId}`);
    }

    return existing;
}
