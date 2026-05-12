import "@/env";

import { client } from "@/client";
import { getEnv } from "@/env";
import { initialize, setupDevHotReload, setupProcessHandlers } from "@/initializer";

const env = getEnv("bot");

setupProcessHandlers();
await initialize();
await setupDevHotReload();

await client.login(env.TOKEN);
