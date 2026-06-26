import { ok } from "@repo/shared";
import { logger } from "@/lib/infra/logger";
import { isClientReady } from "@/lib/infra/readyState";
import { registerShutdownTask, SHUTDOWN_PRIORITY } from "@/lib/infra/shutdown";
import { createApp } from "@/server/app";

export type BotApiServerEnv = {
    BOT_API_HOST: string;
    BOT_API_PORT: number;
    BOT_API_TOKEN: string;
};

/**
 * Start the bot's internal HTTP API. The server listens immediately; `/ready` returns
 * 503 until the Discord client is ready. On shutdown it stops accepting before the
 * Discord client is destroyed (priority below DISCORD_CLIENT).
 *
 * Opt-in: only started when BOT_API_ENABLED=true (see src/index.ts).
 */
export function startBotApiServer(env: BotApiServerEnv): ReturnType<typeof Bun.serve> {
    const app = createApp({
        adminToken: env.BOT_API_TOKEN,
        isReady: isClientReady,
        ping: () => ok({ pong: true as const }),
    });

    const server = Bun.serve({ hostname: env.BOT_API_HOST, port: env.BOT_API_PORT, fetch: app.fetch });
    logger.info("Bot", `internal API listening on ${env.BOT_API_HOST}:${server.port}`);

    registerShutdownTask({
        name: "bot-api-server",
        priority: SHUTDOWN_PRIORITY.BOT_API_SERVER,
        run: async () => {
            await server.stop();
        },
    });

    return server;
}
