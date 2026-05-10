import "@/env";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { relations } from "@/db/schema";
import { getEnv } from "@/env";

export function createPGliteDb() {
    const env = getEnv("pglite");
    const client = new PGlite(env.DATABASE_URL_DEV);

    return {
        db: drizzle({ client, relations }),
        close: async () => {
            await client.close();
        },
    };
}
