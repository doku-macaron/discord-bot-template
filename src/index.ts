import "@/env";

import { client } from "@/client";
import { getEnv } from "@/env";
import { initialize, setupProcessHandlers } from "@/initializer";

const env = getEnv("bot");

setupProcessHandlers();
initialize();

await client.login(env.TOKEN);
