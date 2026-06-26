import path from "node:path";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createPostgresDb } from "@/postgres";

// Run as a Bun script (not `drizzle-kit migrate`) so `bun --env-file=...` reliably
// loads the connection URL into the child process. Prefer `DATABASE_URL_MIGRATOR`,
// falling back to `DATABASE_URL` (same resolution as drizzle.config.ts).
const url = process.env.DATABASE_URL_MIGRATOR ?? process.env.DATABASE_URL;
if (!url) {
    console.error("DATABASE_URL_MIGRATOR (or DATABASE_URL) is required. Start the dev DB with `bun run db:up`.");
    process.exit(1);
}

const { db, close } = createPostgresDb(url);

await migrate(db, {
    migrationsFolder: path.resolve(import.meta.dir, "..", "drizzle"),
});

await close();

console.info("Postgres migration complete");
process.exit(0);
