import { logger } from "@/lib/logger";

export type ShutdownTask = {
    name: string;
    /** Lower values run first. Default 100. */
    priority?: number;
    run: () => Promise<void> | void;
};

export const SHUTDOWN_PRIORITY = {
    JOBS: 10,
    DISCORD_CLIENT: 100,
    DATABASE: 200,
} as const;

const DEFAULT_PRIORITY = 100;

const tasks: Array<ShutdownTask> = [];
let inflight = 0;
let waiters: Array<() => void> = [];
let shuttingDown = false;

export function registerShutdownTask(task: ShutdownTask): void {
    tasks.push(task);
}

export function isShuttingDown(): boolean {
    return shuttingDown;
}

export function trackInflight(work: () => Promise<void>): Promise<void> {
    if (shuttingDown) {
        logger.warn("Core", "Rejecting new interaction during shutdown");
        return Promise.resolve();
    }
    inflight += 1;
    return work().finally(() => {
        inflight -= 1;
        if (inflight === 0) {
            const pending = waiters;
            waiters = [];
            for (const resolve of pending) {
                resolve();
            }
        }
    });
}

function waitForInflight(timeoutMs: number): Promise<void> {
    if (inflight === 0) {
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            waiters = waiters.filter((w) => w !== onDone);
            logger.warn("Core", `Forced shutdown with ${inflight} in-flight interactions`);
            resolve();
        }, timeoutMs);

        const onDone = () => {
            clearTimeout(timer);
            resolve();
        };
        waiters.push(onDone);
    });
}

async function runWithTimeout(task: ShutdownTask, timeoutMs: number): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        await Promise.race([
            Promise.resolve().then(() => task.run()),
            new Promise<void>((resolve) => {
                timer = setTimeout(() => {
                    logger.warn("Core", `Shutdown task "${task.name}" timed out after ${timeoutMs}ms`);
                    resolve();
                }, timeoutMs);
            }),
        ]);
    } finally {
        if (timer !== undefined) {
            clearTimeout(timer);
        }
    }
}

export async function runShutdown(signal: string, options: { inflightTimeoutMs?: number; taskTimeoutMs?: number } = {}): Promise<void> {
    if (shuttingDown) {
        return;
    }
    shuttingDown = true;

    const inflightTimeoutMs = options.inflightTimeoutMs ?? 10_000;
    const taskTimeoutMs = options.taskTimeoutMs ?? 5_000;

    logger.info("Core", `Received ${signal}, shutting down (in-flight=${inflight})`);
    await waitForInflight(inflightTimeoutMs);

    const ordered = [...tasks].sort((a, b) => (a.priority ?? DEFAULT_PRIORITY) - (b.priority ?? DEFAULT_PRIORITY));

    for (const task of ordered) {
        try {
            await runWithTimeout(task, taskTimeoutMs);
        } catch (error) {
            logger.error("Core", error instanceof Error ? error : new Error(String(error)));
        }
    }
}

export function resetShutdownForTesting(): void {
    tasks.length = 0;
    inflight = 0;
    waiters = [];
    shuttingDown = false;
}
