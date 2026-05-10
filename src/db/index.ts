import { createPGliteDb } from "@/db/pglite";
import { createPostgresDb } from "@/db/postgres";
import { isProduction } from "@/isProduction";

export const db = isProduction ? createPostgresDb() : createPGliteDb();

export type Database = typeof db;
