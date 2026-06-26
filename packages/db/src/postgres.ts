import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { relations } from "./schema/relations";

// Open a drizzle/postgres-js connection. The caller passes the URL (the runtime
// `db`, the migrator script, and the test harness each choose their own), falling
// back to `DATABASE_URL`.
//
// The session TimeZone is pinned to UTC: timestamp columns are `timestamp without
// time zone` (naive, UTC by convention), so comparisons/inserts against `now()` are
// converted using the session TZ. If the host or Postgres default is non-UTC, naive
// timestamps drift — pinning UTC keeps reads and writes environment-independent.
export function createPostgresDb(url?: string) {
    const resolved = url ?? process.env.DATABASE_URL;
    if (!resolved) {
        throw new Error("createPostgresDb: DATABASE_URL (or an explicit url) is required.");
    }
    const client = postgres(resolved, { connection: { TimeZone: "UTC" } });

    return {
        db: drizzle({ client, relations }),
        close: async () => {
            await client.end();
        },
    };
}
