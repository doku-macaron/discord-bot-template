import { createPGliteDb } from "@/db/pglite";
import { createPostgresDb } from "@/db/postgres";
import { isProduction } from "@/isProduction";

const { db: dbInstance, close: closeFn } = isProduction ? createPostgresDb() : createPGliteDb();

export const db = dbInstance;
export const closeDatabase = closeFn;

export type Database = typeof db;
