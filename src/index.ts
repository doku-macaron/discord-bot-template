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

await client.login(env.TOKEN);
