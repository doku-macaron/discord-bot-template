import { closeDatabase } from "@repo/db";
import { Events } from "discord.js";
import { client } from "@/client";
import type * as ClientEventRegisterModule from "@/events/clientEventRegister";
import { createClientEventRegistryReloader } from "@/framework/discord/clientEvents";
import { stopSchedulerWorker } from "@/jobs/schedulerHost";
import { logger } from "@/lib/infra/logger";
import { registerShutdownTask, runShutdown, SHUTDOWN_PRIORITY } from "@/lib/infra/shutdown";
import { isProduction } from "./isProduction";
import { i_clean, i_import, i_watch } from "./lib/import";

const reloadClientEventRegistry = createClientEventRegistryReloader(client);

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
    // Re-import the event registry and let the reloader swap listeners atomically:
    // the previous attachment is disposed before the freshly imported one is applied,
    // so a hot reload never leaves duplicate handlers attached to the client.
    const clientEventEntries = await reloadClientEventRegistry.reload(async () => {
        const module = await i_import<typeof ClientEventRegisterModule>("@/events/clientEventRegister");
        return module.clientEventEntries;
    });

    // When the client is already logged in (i.e. this is a hot reload, not first boot),
    // the `once` ClientReady listener will never fire again — invoke it manually so
    // reload-time setup (jobs, etc.) runs against the live client.
    if (client.isReady()) {
        await clientEventEntries.emit(Events.ClientReady, client);
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
            // Stop the worker before reload so the restarted clientReady picks up edited
            // handlers (no-op when the scheduler is disabled / not started).
            await stopSchedulerWorker();
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
