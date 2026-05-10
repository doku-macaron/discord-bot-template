import "@/env";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schema } from "@/db/schema";
import { getEnv } from "@/env";

export function createPostgresDb() {
    const env = getEnv("postgres");

    return drizzle({
        client: postgres(env.DATABASE_URL),
        schema,
        casing: "snake_case",
    });
}
