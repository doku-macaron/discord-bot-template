import "@/env";

import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createPGliteDb } from "@/db/pglite";

if (process.env.NODE_ENV !== "development") {
    console.error("Local DB reset can only run with NODE_ENV=development.");
    process.exit(1);
}

const { db, close } = createPGliteDb();

try {
    await migrate(db, {
        migrationsFolder: "./drizzle",
    });

    await db.execute(sql`truncate table members, guilds restart identity cascade`);
    console.log("Local DB reset complete");
} finally {
    await close();
}

process.exit(0);
