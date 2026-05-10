import { exists, writeFile } from "node:fs/promises";

const envPath = ".env";
const envExamplePath = ".env.example";

const envText = ['TOKEN=""', 'CLIENT_ID=""', 'GUILD_ID=""', 'DATABASE_URL=""', 'DATABASE_URL_DEV="./.pglite"', ""].join("\n");

await writeFile(envExamplePath, envText);

if (!(await exists(envPath))) {
    await writeFile(envPath, envText);
    console.log("Created .env file");
}
