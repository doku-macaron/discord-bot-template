import "@/env";

import { migrate } from "drizzle-orm/pglite/migrator";
import { createPGliteDb } from "@/db/pglite";

if (process.env.NODE_ENV !== "development") {
    console.error("Local migrations can only run with NODE_ENV=development.");
    process.exit(1);
}

const db = createPGliteDb();

await migrate(db, {
    migrationsFolder: "./drizzle",
});

console.log("Local migration complete");
process.exit(0);
