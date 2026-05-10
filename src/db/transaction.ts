import { type Database, db } from "@/db";
import { err, ok, type Result } from "@/lib/result";

export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export async function withTransaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<Result<T, Error>> {
    try {
        const data = await db.transaction(callback);
        return ok(data);
    } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
    }
}
