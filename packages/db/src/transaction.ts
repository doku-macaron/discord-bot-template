import { err, ok, type Result } from "@repo/shared";
import type { PgTransactionConfig } from "drizzle-orm/pg-core";
import { type Database, db } from "./db";

export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

// A handle that supports the drizzle query builder: either the global `db` or a
// `tx` passed by `withTransaction`. Queries accept `client: DbClient = db` so the
// same function works standalone and inside a transaction.
export type DbClient = Database | Transaction;

// Re-export so usecases can type their test seam (`options?: { db?: Database }`)
// without importing the connection module directly.
export type { Database } from "./db";

export type WithTransactionOptions = {
    // Defaults to the global `db`. Tests inject a real handle (`createTestDb()`).
    db?: Database;
    config?: PgTransactionConfig;
};

// Resolve the client a read-only (non-transactional) usecase passes to its queries:
// the injected `options.db` when present, otherwise the global `db` (the same default
// `defineQuery` auto-fills). Keeps the default `db` reference inside the db package.
export function resolveDbClient(options?: { db?: Database }): DbClient {
    return options?.db ?? db;
}

export async function withTransaction<T>(
    callback: (tx: Transaction) => Promise<T>,
    options?: WithTransactionOptions
): Promise<Result<T, Error>> {
    const runner = options?.db ?? db;
    try {
        const data = await runner.transaction(callback, options?.config);
        return ok(data);
    } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
    }
}
