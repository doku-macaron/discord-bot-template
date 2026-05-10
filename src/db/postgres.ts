import "@/env";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { relations } from "@/db/schema";
import { getEnv } from "@/env";

export function createPostgresDb() {
    const env = getEnv("postgres");
    const client = postgres(env.DATABASE_URL);

    return {
        db: drizzle({ client, relations }),
        close: async () => {
            await client.end();
        },
    };
}
