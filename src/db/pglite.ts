import "@/env";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { schema } from "@/db/schema";
import { getEnv } from "@/env";

export function createPGliteDb() {
    const env = getEnv("pglite");

    return drizzle({
        client: new PGlite(env.DATABASE_URL_DEV),
        schema,
        casing: "snake_case",
    });
}
