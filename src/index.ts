import "@/env";

import { client } from "@/client";
import { initialize, setupProcessHandlers } from "@/initializer";

if (!process.env.TOKEN) {
    throw new Error("TOKEN is required to start the bot.");
}

setupProcessHandlers();
initialize();

await client.login(process.env.TOKEN);
