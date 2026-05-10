import { Events } from "discord.js";
import { client } from "@/client";
import { closeDatabase } from "@/db";
import { clientReadyEvent } from "@/events/clientReady";
import { interactionCreateEvent } from "@/events/interactionCreate";
import { logger } from "@/lib/logger";
import { registerShutdownTask, runShutdown, SHUTDOWN_PRIORITY } from "@/lib/shutdown";

export function setupProcessHandlers() {
    process.on("uncaughtException", (error) => {
        logger.error("Core", error instanceof Error ? error : new Error(String(error)));
    });

    process.on("unhandledRejection", (reason) => {
        logger.error("Core", reason instanceof Error ? reason : new Error(String(reason)));
    });

    registerShutdownTask({
        name: "discord-client",
        priority: SHUTDOWN_PRIORITY.DISCORD_CLIENT,
        run: async () => {
            await client.destroy();
        },
    });

    registerShutdownTask({
        name: "database",
        priority: SHUTDOWN_PRIORITY.DATABASE,
        run: async () => {
            await closeDatabase();
        },
    });

    let exiting = false;
    const shutdown = (signal: NodeJS.Signals) => {
        if (exiting) {
            return;
        }
        exiting = true;
        runShutdown(signal).finally(() => {
            process.exit(0);
        });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}

export function initialize() {
    client.once(Events.ClientReady, clientReadyEvent);
    client.on(Events.InteractionCreate, interactionCreateEvent);
}
