// Local seed / reset are destructive (truncate / upsert), so verify the target is the
// dev DB before connecting. Guards against accidentally pointing at a test or
// production database.
const DEV_DATABASE_NAME = "discord_bot";

export function assertDevDatabaseUrl(): string {
    const url = process.env.DATABASE_URL_MIGRATOR ?? process.env.DATABASE_URL;
    if (!url) {
        console.error("DATABASE_URL is required. Start the dev DB with `bun run db:up`.");
        process.exit(1);
    }
    let dbName: string;
    try {
        dbName = new URL(url).pathname.replace(/^\//, "");
    } catch {
        console.error(`DATABASE_URL is not a valid URL: ${url}`);
        process.exit(1);
    }
    if (dbName !== DEV_DATABASE_NAME) {
        console.error(`Refusing to run a local seed/reset against "${dbName}". Only the dev DB "${DEV_DATABASE_NAME}" is allowed.`);
        process.exit(1);
    }
    return url;
}
