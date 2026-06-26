// Default barrel for the bot runtime: the connection, types, and the transaction
// helper. The `schema` aggregate is collected via `Bun.Glob` (see `./schema`), so it
// is exported from `@repo/db/schema`, not from here, to keep this entry import-light.
export { closeDatabase, type Database, db } from "./db";
export { relations } from "./schema/relations";
export { type DbClient, resolveDbClient, type Transaction, type WithTransactionOptions, withTransaction } from "./transaction";
