import { createPostgresDb } from "./postgres";

// The canonical bot-runtime connection. `defineQuery` auto-fills this `db` when a
// caller omits the client, and `withTransaction` (in `./transaction`) runs against it.
//
// Connection is lazy: the Proxy below resolves a real connection on first property
// access, so importing `@repo/db` never opens a socket at module-load time (keeps
// command registration, tests, and tooling that only touch types from connecting).
//
// `DATABASE_URL` is required (dev points it at the Docker Postgres from `bun db:up`,
// production at the managed database). There is no PGlite fallback.
function createBotConnection() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        throw new Error("DATABASE_URL is required. Start the dev database with `bun run db:up`, then run `bun run db:migrate:local`.");
    }
    return createPostgresDb(url);
}

type BotConnection = ReturnType<typeof createBotConnection>;

let connection: BotConnection | undefined;

function getConnection(): BotConnection {
    connection ??= createBotConnection();
    return connection;
}

export type Database = BotConnection["db"];

export const db = new Proxy({} as Database, {
    get(_target, property) {
        const realDb = getConnection().db;
        const value = Reflect.get(realDb, property, realDb);
        return typeof value === "function" ? value.bind(realDb) : value;
    },
}) as Database;

export async function closeDatabase() {
    if (!connection) {
        return;
    }
    await connection.close();
    connection = undefined;
}
