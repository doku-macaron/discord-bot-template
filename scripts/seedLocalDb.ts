import "@/env";

import { migrate } from "drizzle-orm/pglite/migrator";
import { createPGliteDb } from "@/db/pglite";
import { guilds } from "@/db/schema/guilds";
import { members } from "@/db/schema/members";

if (process.env.NODE_ENV !== "development") {
    console.error("Local DB seed can only run with NODE_ENV=development.");
    process.exit(1);
}

const { db, close } = createPGliteDb();

try {
    await migrate(db, {
        migrationsFolder: "./drizzle",
    });

    await db
        .insert(guilds)
        .values({
            guildId: "template-guild",
            name: "Template Guild",
        })
        .onConflictDoUpdate({
            target: guilds.guildId,
            set: {
                name: "Template Guild",
            },
        });

    const [member] = await db
        .insert(members)
        .values({
            guildId: "template-guild",
            userId: "template-user",
            displayName: "Template User",
            commandCount: 1,
        })
        .onConflictDoUpdate({
            target: [members.guildId, members.userId],
            set: {
                displayName: "Template User",
                commandCount: 1,
            },
        })
        .returning();

    if (!member) {
        throw new Error("Failed to seed template member.");
    }

    console.log(`Local DB seed complete: guild=${member.guildId}, member=${member.userId}`);
} finally {
    await close();
}

process.exit(0);
