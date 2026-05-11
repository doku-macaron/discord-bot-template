import { eq } from "drizzle-orm";
import { db } from "@/db";
import { guilds, type SelectGuild, type UpdateGuild } from "@/db/schema/guilds";
import type { DbClient } from "@/db/transaction";

export async function markGuildLeft(guildId: string, client: DbClient = db): Promise<SelectGuild | null> {
    // `updatedAt` is refreshed by the schema's $onUpdate hook on every UPDATE.
    const set: UpdateGuild = { leftAt: new Date() };
    const [updated] = await client.update(guilds).set(set).where(eq(guilds.guildId, guildId)).returning();

    return updated ?? null;
}
