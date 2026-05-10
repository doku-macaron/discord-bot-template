import { eq } from "drizzle-orm";
import { db } from "@/db";
import { guilds, type SelectGuild } from "@/db/schema/guilds";

export async function markGuildLeft(guildId: string): Promise<SelectGuild | null> {
    const [updated] = await db.update(guilds).set({ leftAt: new Date() }).where(eq(guilds.guildId, guildId)).returning();

    return updated ?? null;
}
