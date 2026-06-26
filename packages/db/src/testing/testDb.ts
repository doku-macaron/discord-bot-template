import { randomUUID } from "node:crypto";
import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import type { Database } from "../db";
import { relations } from "../schema/relations";

// Postgres-backed isolation for query / usecase integration tests. Each call gets a
// private `test_<uuid>` schema, so tests never see each other's rows; `close()` drops
// it. Pass the returned `db` into a usecase via its `{ db }` seam (see usecase-add).
//
// How isolation works: migrations run once per process into `public` (cached), then
// each test clones `public`'s table structure into a fresh schema with
// `CREATE TABLE … (LIKE … INCLUDING ALL)` + FK reattach. Cloning avoids re-running
// migrations per schema (which would record into a shared `drizzle` journal and skip
// table creation). The connection pins `search_path` to the unique schema so every
// unqualified table name drizzle emits resolves there.
//
// Requires a reachable test database via `DATABASE_URL_TEST` (start it with
// `bun run db:up`). Point it at a DB separate from your dev DB so tests never reset
// dev data.

const MIGRATIONS_FOLDER = path.resolve(import.meta.dir, "..", "..", "drizzle");

// Silence NOTICE chatter (e.g. from DROP SCHEMA CASCADE) so test output stays clean.
const onnotice = () => {};

function resolveTestUrl(): string {
    const url = process.env.DATABASE_URL_TEST;
    if (!url) {
        throw new Error(
            "DATABASE_URL_TEST is not set. Start the test DB with `bun run db:up` and set DATABASE_URL_TEST " +
                "(e.g. postgres://discord_bot:discord_bot@localhost:5432/discord_bot_test)."
        );
    }
    return url;
}

type TemplateMeta = {
    tables: ReadonlyArray<string>;
    fks: ReadonlyArray<{ table: string; conname: string; condef: string }>;
};

let templateReady: Promise<TemplateMeta> | undefined;

// Migrate `public` once per process and capture the table/FK metadata used to clone.
function ensureTemplate(): Promise<TemplateMeta> {
    templateReady ??= (async () => {
        const client = postgres(resolveTestUrl(), { max: 1, onnotice });
        try {
            await migrate(drizzle({ client, relations }), { migrationsFolder: MIGRATIONS_FOLDER });
            // `SET search_path TO public` is load-bearing: `pg_get_constraintdef` omits
            // the schema for referenced tables visible on the search_path, so FK defs come
            // out unqualified (`REFERENCES guilds(...)`) and resolve inside each clone schema.
            await client`SET search_path TO public`;
            const tableRows = await client<{ tablename: string }[]>`
                SELECT tablename
                FROM pg_tables
                WHERE schemaname = 'public' AND tablename <> '__drizzle_migrations'
                ORDER BY tablename
            `;
            const fkRows = await client<{ tablename: string; conname: string; condef: string }[]>`
                SELECT c.conrelid::regclass::text AS tablename,
                       c.conname AS conname,
                       pg_get_constraintdef(c.oid) AS condef
                FROM pg_constraint c
                JOIN pg_namespace n ON n.oid = c.connamespace
                WHERE n.nspname = 'public' AND c.contype = 'f'
            `;
            return {
                tables: tableRows.map((r) => r.tablename),
                fks: fkRows.map((r) => ({ table: r.tablename, conname: r.conname, condef: r.condef })),
            } satisfies TemplateMeta;
        } finally {
            await client.end();
        }
    })().catch((error) => {
        templateReady = undefined;
        throw error;
    });
    return templateReady;
}

// Build one SQL string that creates the unique schema and clones every table + FK.
// Sent as a single simple query, Postgres runs it as one implicit transaction.
function buildCloneSql(schemaName: string, meta: TemplateMeta): string {
    const statements: Array<string> = [`CREATE SCHEMA "${schemaName}";`];
    for (const tablename of meta.tables) {
        statements.push(`CREATE TABLE "${schemaName}"."${tablename}" (LIKE "public"."${tablename}" INCLUDING ALL);`);
    }
    if (meta.fks.length > 0) {
        statements.push(`SET search_path TO "${schemaName}";`);
        for (const { table, conname, condef } of meta.fks) {
            const bare = table.replace(/^"?public"?\./, "").replace(/"/g, "");
            statements.push(`ALTER TABLE "${schemaName}"."${bare}" ADD CONSTRAINT "${conname}" ${condef};`);
        }
    }
    return statements.join("\n");
}

export async function createTestDb(): Promise<{ db: Database; close: () => Promise<void> }> {
    const meta = await ensureTemplate();
    const url = resolveTestUrl();
    const schemaName = `test_${randomUUID().replaceAll("-", "")}`;

    const setup = postgres(url, { max: 1, onnotice });
    try {
        await setup.unsafe(buildCloneSql(schemaName, meta));
    } finally {
        await setup.end();
    }

    const client = postgres(url, { max: 2, onnotice, connection: { search_path: schemaName, TimeZone: "UTC" } });
    const testDb = drizzle({ client, relations }) as Database;

    return {
        db: testDb,
        close: async () => {
            await client.end();
            const admin = postgres(url, { max: 1, onnotice });
            try {
                await admin.unsafe(`DROP SCHEMA "${schemaName}" CASCADE`);
            } finally {
                await admin.end();
            }
        },
    };
}
