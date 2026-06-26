import { hostname } from "node:os";
import { createSchedulerWorker, type SchedulerLogger, type SchedulerWorker } from "@repo/scheduler";
import { botJobRegistry } from "@/jobs/handlers/botJobRegistry";
import { schedulerStore } from "@/jobs/handlers/schedulerStore";
import { logger } from "@/lib/infra/logger";
import { registerShutdownTask, SHUTDOWN_PRIORITY } from "@/lib/infra/shutdown";

// Pin the worker singleton to globalThis so a dev hot reload (which re-imports this
// module) keeps the same worker instead of starting a second one.
type SchedulerHostState = {
    worker: SchedulerWorker | null;
    shutdownRegistered: boolean;
};

const STATE_KEY = Symbol.for("@repo/bot/schedulerHost");
const globalStore = globalThis as Record<PropertyKey, unknown>;

if (!globalStore[STATE_KEY]) {
    globalStore[STATE_KEY] = { worker: null, shutdownRegistered: false } satisfies SchedulerHostState;
}

const state = globalStore[STATE_KEY] as SchedulerHostState;

const schedulerLogger: SchedulerLogger = {
    info: (message) => logger.info("Core", message),
    warn: (message) => logger.warn("Core", message),
    error: (error) => logger.error("Core", error instanceof Error ? error : new Error(String(error))),
};

function makeWorkerId(): string {
    return `bot:${hostname()}:${process.pid}`;
}

/**
 * Start the scheduler worker (idempotent — returns the existing worker if already
 * started). Registers a shutdown task at SHUTDOWN_PRIORITY.JOBS so polling stops (and
 * in-flight jobs are fast-aborted) before the Discord client and DB are closed.
 */
export function startSchedulerWorker(): SchedulerWorker {
    if (state.worker) {
        return state.worker;
    }

    const worker = createSchedulerWorker({
        store: schedulerStore,
        registry: botJobRegistry,
        workerId: makeWorkerId(),
        logger: schedulerLogger,
    });
    worker.start();
    state.worker = worker;

    if (!state.shutdownRegistered) {
        state.shutdownRegistered = true;
        registerShutdownTask({
            name: "scheduler-worker",
            priority: SHUTDOWN_PRIORITY.JOBS,
            run: () => stopSchedulerWorker(),
        });
    }

    return worker;
}

/**
 * Stop the worker: halt polling, send an abort to in-flight jobs, and wait briefly. Any
 * remainder is left to process exit + the next startup's stale recovery. Called from
 * both hot reload and shutdown; a no-op when no worker is running.
 */
export async function stopSchedulerWorker(): Promise<void> {
    if (!state.worker) {
        return;
    }
    await state.worker.stop();
    state.worker = null;
}
