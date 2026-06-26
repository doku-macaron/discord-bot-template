import path from "node:path";
import { getTableName, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createPostgresDb } from "@/postgres";
import { schema } from "@/schema";
import { assertDevDatabaseUrl } from "./localDbGuard";

if (process.env.NODE_ENV !== "development") {
    console.error("Local DB reset can only run with NODE_ENV=development.");
    process.exit(1);
}

const { db, close } = createPostgresDb(assertDevDatabaseUrl());

try {
    await migrate(db, {
        migrationsFolder: path.resolve(import.meta.dir, "..", "drizzle"),
    });

    // Truncate every auto-collected table in one statement. `CASCADE` resolves FK
    // order, so the schema barrel's tables can be handed to Postgres unsorted.
    const tableNames = Object.values(schema).map((table) => getTableName(table));
    if (tableNames.length === 0) {
        console.warn("No tables discovered under packages/db/src/schema/*.schema.ts — nothing to truncate.");
    } else {
        const identifiers = sql.join(
            tableNames.map((name) => sql.identifier(name)),
            sql.raw(", ")
        );
        await db.execute(sql`truncate table ${identifiers} restart identity cascade`);
        console.info(`Local DB reset complete (truncated ${tableNames.length} tables).`);
    }
} finally {
    await close();
}

process.exit(0);
