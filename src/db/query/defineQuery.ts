import { db } from "@/db";
import type { DbClient } from "@/db/transaction";

/**
 * Wraps a query so the global `db` is supplied automatically when the caller
 * does not pass a client. The implementation body always receives a non-null
 * `DbClient` as its last parameter, so individual queries never reach for `db`
 * directly and the "use `tx` inside `withTransaction`" rule is enforced at the
 * type level.
 *
 * `TArgs` is a tuple of the leading positional parameters; `client: DbClient`
 * is always appended. Callers may omit the trailing client and the helper
 * substitutes the global `db`.
 *
 * The inner function must declare every parameter explicitly (no default values
 * and no rest parameters) — the helper detects whether the caller supplied a
 * client by comparing `args.length` to `fn.length`.
 */
export function defineQuery<TArgs extends readonly unknown[], TResult>(
    fn: (...args: [...TArgs, client: DbClient]) => Promise<TResult>
): (...args: TArgs | [...TArgs, client: DbClient]) => Promise<TResult> {
    return ((...args: unknown[]) => {
        if (args.length < fn.length) {
            args.push(db);
        }
        return fn(...(args as Parameters<typeof fn>));
    }) as (...args: TArgs | [...TArgs, client: DbClient]) => Promise<TResult>;
}
