import { db } from "@/db";
import type { DbClient } from "@/db/transaction";

/**
 * Wraps a query so the global `db` is supplied automatically when the caller
 * does not pass a client. The implementation body always receives a non-null
 * `DbClient`, so individual queries never reach for `db` directly and the
 * "use `tx` inside `withTransaction`" rule is enforced at the type level.
 */
export function defineQuery<TInput, TResult>(
    fn: (input: TInput, client: DbClient) => Promise<TResult>
): (input: TInput, client?: DbClient) => Promise<TResult> {
    return (input, client) => fn(input, client ?? db);
}
