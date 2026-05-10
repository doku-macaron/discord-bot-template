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
    "# Production PostgreSQL connection URL. Required for NODE_ENV=production and Docker.",
    'DATABASE_URL=""',
    "",
    "# Local PGlite database path for NODE_ENV=development.",
    'DATABASE_URL_DEV="./.pglite"',
    "",
    "# Optional Discord webhook URL for error reports.",
    'WEBHOOK_URL=""',
    "",
].join("\n");

await writeFile(envExamplePath, envText);

if (!(await exists(envPath))) {
    await writeFile(envPath, envText);
    console.log("Created .env file");
}
