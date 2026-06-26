/** biome-ignore-all lint/style/noDefaultExport: drizzle-kit requires a default export */
import type { Config } from "drizzle-kit";

// Auto-collect `*.schema.ts`; a new table is picked up by adding a file.
// packages/db is the source of truth for migrations.
export default {
    schema: ["./src/schema/**/*.schema.ts", "./src/schema/relations.ts"],
    out: "drizzle",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL_MIGRATOR ?? process.env.DATABASE_URL ?? "",
    },
} satisfies Config;
