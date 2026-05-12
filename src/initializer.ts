import { Events } from "discord.js";
import { client } from "@/client";
import { closeDatabase } from "@/db";
import type * as ClientReadyModule from "@/events/clientReady";
import type * as GuildCreateModule from "@/events/guildCreate";
import type * as GuildDeleteModule from "@/events/guildDelete";
import type * as InteractionCreateModule from "@/events/interactionCreate";
import { stopJobs } from "@/framework/jobs/jobRunner";
import { logger } from "@/lib/infra/logger";
import { registerShutdownTask, runShutdown, SHUTDOWN_PRIORITY } from "@/lib/infra/shutdown";
import { isProduction } from "./isProduction";
import { i_clean, i_import, i_watch } from "./lib/import";

function removeClientEventHandlers() {
    client.removeAllListeners(Events.ClientReady);
    client.removeAllListeners(Events.InteractionCreate);
    client.removeAllListeners(Events.GuildCreate);
    client.removeAllListeners(Events.GuildDelete);
}

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

export async function initialize() {
    const { clientReadyEvent } = await i_import<typeof ClientReadyModule>("@/events/clientReady");
    const { interactionCreateEvent } = await i_import<typeof InteractionCreateModule>("@/events/interactionCreate");
    const { guildCreateEvent } = await i_import<typeof GuildCreateModule>("@/events/guildCreate");
    const { guildDeleteEvent } = await i_import<typeof GuildDeleteModule>("@/events/guildDelete");

    removeClientEventHandlers();
    client.once(Events.ClientReady, clientReadyEvent);
    client.on(Events.InteractionCreate, interactionCreateEvent);
    client.on(Events.GuildCreate, guildCreateEvent);
    client.on(Events.GuildDelete, guildDeleteEvent);

    if (client.isReady()) {
        await clientReadyEvent(client);
    }
}

export async function setupDevHotReload() {
    if (isProduction) {
        return;
    }

    if (!process.versions.bun) {
        console.error("Use https://bun.sh/ to run in the developer environment");
        process.exit(1);
    }

    const { createAutoExit } = await import("@/lib/util/autoExit");
    const autoExit = createAutoExit();
    let reloadPromise: Promise<void> | null = null;
    let reloadQueued = false;

    const runReload = async () => {
        do {
            reloadQueued = false;
            stopJobs();
            i_clean();
            await initialize();
        } while (reloadQueued);
    };

    i_watch("./", async () => {
        autoExit.update();

        if (reloadPromise) {
            reloadQueued = true;
            await reloadPromise;
            return;
        }

        reloadPromise = runReload().finally(() => {
            reloadPromise = null;
        });
        await reloadPromise;
    });
}
