import { exists, writeFile } from "node:fs/promises";

const envPath = ".env";
const envExamplePath = ".env.example";

const envText = [
    "# Discord bot token from the Developer Portal.",
    'TOKEN=""',
    "",
    "# Discord application/client ID. Used for command registration and invite URLs.",
    'CLIENT_ID=""',
    "",
    "# Optional development guild ID. When empty, bun register broadcasts to all bot guilds.",
    'GUILD_ID=""',
    "",
    "# PostgreSQL connection URL (runtime). For local dev, start the DB with `bun db:up`.",
    'DATABASE_URL="postgres://discord_bot:discord_bot@localhost:5432/discord_bot"',
    "",
    "# Optional migrator connection URL. Falls back to DATABASE_URL when empty.",
    'DATABASE_URL_MIGRATOR=""',
    "",
    "# Optional test database URL for createTestDb-backed integration tests (`@repo/db/testing/testDb`).",
    'DATABASE_URL_TEST=""',
    "",
    "# Optional Discord webhook URL for error reports.",
    'WEBHOOK_URL=""',
    "",
    "# ===== Optional features (off by default) =====",
    "",
    "# Internal HTTP API (server/): /health, /ready, and a bearer-authed /api/ping.",
    'BOT_API_ENABLED="false"',
    'BOT_API_HOST="0.0.0.0"',
    'BOT_API_PORT="8080"',
    "# Required when BOT_API_ENABLED=true (bearer token for /api/*).",
    'BOT_API_TOKEN=""',
    "",
].join("\n");

await writeFile(envExamplePath, envText);

if (!(await exists(envPath))) {
    await writeFile(envPath, envText);
    console.log("Created .env file");
}
