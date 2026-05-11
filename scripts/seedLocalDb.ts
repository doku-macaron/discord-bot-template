import "@/env";

import { migrate } from "drizzle-orm/pglite/migrator";
import { createPGliteDb } from "@/db/pglite";
import { guildSettings } from "@/db/schema/guildSettings";
import { guilds } from "@/db/schema/guilds";
import { memberProfiles } from "@/db/schema/memberProfiles";

if (process.env.NODE_ENV !== "development") {
    console.error("Local DB seed can only run with NODE_ENV=development.");
    process.exit(1);
}

const { db, close } = createPGliteDb();

try {
    await migrate(db, {
        migrationsFolder: "./drizzle",
    });

    await db.insert(guilds).values({ guildId: "template-guild" }).onConflictDoNothing();

    await db.insert(guildSettings).values({ guildId: "template-guild" }).onConflictDoNothing();

    const [profile] = await db
        .insert(memberProfiles)
        .values({
            guildId: "template-guild",
            userId: "template-user",
            bio: "Hello! I'm a template member.",
        })
        .onConflictDoUpdate({
            target: [memberProfiles.guildId, memberProfiles.userId],
            set: { bio: "Hello! I'm a template member." },
        })
        .returning();

    if (!profile) {
        throw new Error("Failed to seed template member profile.");
    }

    console.log(`Local DB seed complete: guild=${profile.guildId}, user=${profile.userId}`);
} finally {
    await close();
}

process.exit(0);
