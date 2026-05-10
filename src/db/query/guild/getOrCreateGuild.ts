import { eq } from "drizzle-orm";
import { db } from "@/db";
import { guilds, type InsertGuild, type SelectGuild } from "@/db/schema/guilds";

export async function getOrCreateGuild(input: InsertGuild): Promise<SelectGuild> {
    const now = new Date();
    const [created] = await db
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

    const [guild] = await db.select().from(guilds).where(eq(guilds.guildId, input.guildId)).limit(1);

    if (!guild) {
        throw new Error(`Guild was not found: ${input.guildId}`);
    }

    return guild;
}
