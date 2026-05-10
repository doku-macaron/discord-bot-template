/** biome-ignore-all lint/style/noDefaultExport: drizzle-kit requires a default export */
import type { Config } from "drizzle-kit";

export default {
    schema: ["src/db/schema/guilds.ts", "src/db/schema/members.ts", "src/db/schema/relations.ts"],
    out: "drizzle",
    dialect: "postgresql",
    driver: "pglite",
    casing: "snake_case",
    dbCredentials: {
        url: process.env.DATABASE_URL_DEV || "./.pglite",
    },
} satisfies Config;
