import { eq } from "drizzle-orm";
import { db } from "@/db";
import { guilds, type InsertGuild, type SelectGuild } from "@/db/schema/guilds";

export async function getOrCreateGuild(input: InsertGuild): Promise<SelectGuild> {
    const [created] = await db
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

    const [guild] = await db.select().from(guilds).where(eq(guilds.guildId, input.guildId)).limit(1);

    if (!guild) {
        throw new Error(`Guild was not found: ${input.guildId}`);
    }

    return guild;
}
