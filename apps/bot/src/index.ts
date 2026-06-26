import "@/env";

import { client } from "@/client";
import { getEnv } from "@/env";
import { initialize, setupDevHotReload, setupProcessHandlers } from "@/initializer";

const env = getEnv("bot");

setupProcessHandlers();

if (process.env.NODE_ENV !== "production" && typeof Bun === "undefined") {
    throw new Error("Development mode must be run with Bun.");
}

await initialize();
await setupDevHotReload();

// Optional internal HTTP API. Off by default; enable with BOT_API_ENABLED=true.
// Dynamically imported so the server (and hono) load only when enabled.
const botApiEnv = getEnv("botApi");
if (botApiEnv.BOT_API_ENABLED) {
    if (!botApiEnv.BOT_API_TOKEN) {
        throw new Error("BOT_API_TOKEN is required when BOT_API_ENABLED=true.");
    }
    const { startBotApiServer } = await import("@/server");
    startBotApiServer(botApiEnv);
}

await client.login(env.TOKEN);
