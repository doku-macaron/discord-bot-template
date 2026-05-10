import "@/env";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { schema } from "@/db/schema";

export function createPGliteDb() {
    return drizzle({
        client: new PGlite(process.env.DATABASE_URL_DEV),
        schema,
        casing: "snake_case",
    });
}
