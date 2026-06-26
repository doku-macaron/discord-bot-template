import path from "node:path";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createPostgresDb } from "@/postgres";
import { guildSettings } from "@/schema/guildSettings.schema";
import { guilds } from "@/schema/guilds.schema";
import { memberProfiles } from "@/schema/memberProfiles.schema";
import { assertDevDatabaseUrl } from "./localDbGuard";

if (process.env.NODE_ENV !== "development") {
    console.error("Local DB seed can only run with NODE_ENV=development.");
    process.exit(1);
}

const { db, close } = createPostgresDb(assertDevDatabaseUrl());

try {
    await migrate(db, {
        migrationsFolder: path.resolve(import.meta.dir, "..", "drizzle"),
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

    console.info(`Local DB seed complete: guild=${profile.guildId}, user=${profile.userId}`);
} finally {
    await close();
}

process.exit(0);
