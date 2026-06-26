import type { HandlerRegistry } from "./registry";
import type { ClaimedJob, RunStatus, ScheduledJobHandler, SchedulerLogger, SchedulerStore } from "./types";

export type SchedulerWorkerOptions = {
    store: SchedulerStore;
    registry: HandlerRegistry;
    /** Worker instance id (e.g. `bot:${hostname}:${pid}`). Stored on locked_by / job_runs.worker_id. */
    workerId: string;
    pollIntervalMs?: number;
    reaperIntervalMs?: number;
    leaseGraceMs?: number;
    /** After fast-abort, wait this long for in-flight jobs to settle; the rest is left to stale recovery. */
    jobShutdownTimeoutMs?: number;
    logger?: SchedulerLogger;
};

export type SchedulerWorker = {
    start: () => void;
    stop: () => Promise<void>;
    /** Poll immediately if idle. */
    wake: () => void;
};

const DEFAULT_POLL_INTERVAL_MS = 5_000;
const DEFAULT_REAPER_INTERVAL_MS = 30_000;
const DEFAULT_LEASE_GRACE_MS = 10_000;
const DEFAULT_JOB_SHUTDOWN_TIMEOUT_MS = 3_000;

const noopLogger: SchedulerLogger = {
    info: () => {},
    warn: () => {},
    error: () => {},
};

function summarizeError(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}

type RunningEntry = {
    controller: AbortController;
    settled: Promise<void>;
};

export function createSchedulerWorker(options: SchedulerWorkerOptions): SchedulerWorker {
    const { store, registry, workerId } = options;
    const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    const reaperIntervalMs = options.reaperIntervalMs ?? DEFAULT_REAPER_INTERVAL_MS;
    const leaseGraceMs = options.leaseGraceMs ?? DEFAULT_LEASE_GRACE_MS;
    const jobShutdownTimeoutMs = options.jobShutdownTimeoutMs ?? DEFAULT_JOB_SHUTDOWN_TIMEOUT_MS;
    const logger = options.logger ?? noopLogger;

    let started = false;
    let stopping = false;
    let polling = false;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let reaperTimer: ReturnType<typeof setInterval> | undefined;
    const running = new Map<string, RunningEntry>();

    async function recover(): Promise<void> {
        try {
            const recovered = await store.recoverStale({ allowedJobTypes: registry.allowedJobTypes() });
            if (recovered > 0) {
                logger.info(`recovered ${recovered} stale job run(s)`);
            }
        } catch (error) {
            logger.error(error);
        }
    }

    function startRun(job: ClaimedJob): void {
        const handler = registry.get(job.jobType);
        if (!handler) {
            // allowedJobTypes filters these out; close as failed as a safety net.
            void store
                .finalize({ jobId: job.jobId, runId: job.runId, runStatus: "failed", errorMessage: `No handler for type "${job.jobType}"` })
                .catch((error) => logger.error(error));
            return;
        }
        const controller = new AbortController();
        const entry: RunningEntry = {
            controller,
            settled: runClaimed(job, handler, controller).finally(() => {
                running.delete(job.runId);
            }),
        };
        running.set(job.runId, entry);
    }

    async function runClaimed(job: ClaimedJob, handler: ScheduledJobHandler<unknown>, controller: AbortController): Promise<void> {
        const timer = setTimeout(() => controller.abort(), job.timeoutMs);
        // If the handler ignores the signal and never returns, the finally's clearTimeout
        // is never reached; unref so the ref'd timer doesn't keep the event loop alive.
        unrefTimer(timer);
        let thrown: { error: unknown } | null = null;
        try {
            const payload = handler.parsePayload(job.payload);
            await handler.run({
                jobId: job.jobId,
                jobKey: job.jobKey,
                guildId: job.guildId,
                runId: job.runId,
                scheduledFor: job.scheduledFor,
                payload,
                signal: controller.signal,
            });
        } catch (error) {
            thrown = { error };
            logger.error(error);
        } finally {
            clearTimeout(timer);
        }

        // If the timeout fired, it's timed_out regardless of how the handler returned.
        // Only a throw without an abort is failed (includes payload validation).
        let runStatus: RunStatus;
        let errorMessage: string | null;
        if (controller.signal.aborted) {
            runStatus = "timed_out";
            errorMessage = thrown ? summarizeError(thrown.error) : null;
        } else if (thrown) {
            runStatus = "failed";
            errorMessage = summarizeError(thrown.error);
        } else {
            runStatus = "succeeded";
            errorMessage = null;
        }

        try {
            await store.finalize({ jobId: job.jobId, runId: job.runId, runStatus, errorMessage });
        } catch (error) {
            logger.error(error);
        }
    }

    async function pollOnce(): Promise<void> {
        if (stopping) {
            return;
        }
        const allowedJobTypes = registry.allowedJobTypes();
        // Keep claiming until nothing is due; running a handler doesn't block polling.
        while (!stopping) {
            let job: ClaimedJob | null;
            try {
                job = await store.claimNext({ workerId, allowedJobTypes, leaseGraceMs });
            } catch (error) {
                logger.error(error);
                return;
            }
            if (!job) {
                return;
            }
            startRun(job);
        }
    }

    async function runPoll(): Promise<void> {
        if (polling || stopping) {
            return;
        }
        polling = true;
        try {
            await pollOnce();
        } finally {
            polling = false;
        }
    }

    function start(): void {
        if (started) {
            return;
        }
        started = true;
        stopping = false;
        pollTimer = setInterval(() => void runPoll(), pollIntervalMs);
        reaperTimer = setInterval(() => void recover(), reaperIntervalMs);
        // Run stale recovery once on startup, then the first poll.
        void recover().then(() => runPoll());
    }

    async function stop(): Promise<void> {
        if (!started) {
            return;
        }
        stopping = true;
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = undefined;
        }
        if (reaperTimer) {
            clearInterval(reaperTimer);
            reaperTimer = undefined;
        }

        // fast-abort: signal running jobs immediately.
        for (const entry of running.values()) {
            entry.controller.abort();
        }

        // Wait briefly for cooperative handlers to settle; the rest is left to process
        // exit and the next startup's stale recovery.
        const settles = [...running.values()].map((entry) => entry.settled);
        if (settles.length > 0) {
            await Promise.race([Promise.allSettled(settles), delay(jobShutdownTimeoutMs)]);
        }

        started = false;
    }

    function wake(): void {
        if (!started || stopping) {
            return;
        }
        void runPoll();
    }

    return { start, stop, wake };
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        // Don't keep the process alive just for the wait.
        unrefTimer(setTimeout(resolve, ms));
    });
}

// Keep a timer from holding the event loop open (only Node/Bun timers have unref).
function unrefTimer(timer: ReturnType<typeof setTimeout>): void {
    if (typeof timer === "object" && timer !== null && "unref" in timer && typeof timer.unref === "function") {
        timer.unref();
    }
}
