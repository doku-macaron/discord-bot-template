import type { PgTransactionConfig } from "drizzle-orm/pg-core";
import { type Database, db } from "@/db";
import { err, ok, type Result } from "@/lib/util/result";

export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

// A handle that supports the drizzle query builder: either the global `db`
// or a `tx` passed by `withTransaction`. Queries accept `client: DbClient = db`
// so the same function works standalone and inside a transaction.
export type DbClient = Database | Transaction;

export async function withTransaction<T>(
    callback: (tx: Transaction) => Promise<T>,
    config?: PgTransactionConfig
): Promise<Result<T, Error>> {
    try {
        const data = await db.transaction(callback, config);
        return ok(data);
    } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
    }
}
