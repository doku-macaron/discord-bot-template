import { eq } from "drizzle-orm";
import { db } from "@/db";
import { guilds, type SelectGuild } from "@/db/schema/guilds";
import type { DbClient } from "@/db/transaction";

export async function markGuildLeft(guildId: string, client: DbClient = db): Promise<SelectGuild | null> {
    const now = new Date();
    const [updated] = await client.update(guilds).set({ leftAt: now, updatedAt: now }).where(eq(guilds.guildId, guildId)).returning();

    return updated ?? null;
}
