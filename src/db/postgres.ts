import "@/env";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schema } from "@/db/schema";

export function createPostgresDb() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is required in production.");
    }

    return drizzle({
        client: postgres(process.env.DATABASE_URL),
        schema,
        casing: "snake_case",
    });
}
