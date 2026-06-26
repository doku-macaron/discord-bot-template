import type { Job } from "@/framework/jobs/job";
import { logger } from "@/lib/infra/logger";
import { registerShutdownTask, SHUTDOWN_PRIORITY } from "@/lib/infra/shutdown";

type JobRunnerState = {
    intervals: Map<string, ReturnType<typeof setInterval>>;
    runningJobs: Set<string>;
    started: boolean;
    shutdownRegistered: boolean;
};

const JOB_RUNNER_STATE = Symbol.for("discord-bot-template.jobRunner");
const globalStore = globalThis as Record<PropertyKey, unknown>;

if (!globalStore[JOB_RUNNER_STATE]) {
    globalStore[JOB_RUNNER_STATE] = {
        intervals: new Map<string, ReturnType<typeof setInterval>>(),
        runningJobs: new Set<string>(),
        started: false,
        shutdownRegistered: false,
    };
}

const state = globalStore[JOB_RUNNER_STATE] as JobRunnerState;

function isValidIntervalMs(intervalMs: number): boolean {
    return Number.isFinite(intervalMs) && intervalMs > 0;
}

async function runJob(job: Job): Promise<void> {
    if (state.runningJobs.has(job.name)) {
        logger.warn("Core", `Job '${job.name}' is still running from the previous tick. Skipping this run.`);
        return;
    }
    state.runningJobs.add(job.name);
    try {
        await job.run();
    } catch (error) {
        const jobError = error instanceof Error ? error : new Error(String(error));
        logger.error("Core", new Error(`Job '${job.name}' failed`, { cause: jobError }));
    } finally {
        state.runningJobs.delete(job.name);
    }
}

export function startJobs(jobs: ReadonlyArray<Job>): void {
    if (state.started) {
        logger.warn("Core", "startJobs called more than once. Ignoring subsequent calls.");
        return;
    }
    state.started = true;

    for (const job of jobs) {
        if (state.intervals.has(job.name)) {
            logger.warn("Core", `Job '${job.name}' is already registered. Skipping.`);
            continue;
        }

        if (!isValidIntervalMs(job.intervalMs)) {
            logger.warn("Core", `Job '${job.name}' has invalid intervalMs (${job.intervalMs}). Skipping.`);
            continue;
        }

        if (job.runOnStart) {
            void runJob(job);
        }

        state.intervals.set(
            job.name,
            setInterval(() => {
                void runJob(job);
            }, job.intervalMs)
        );
    }

    logger.info("Core", `Started ${state.intervals.size} scheduled jobs`);

    if (!state.shutdownRegistered) {
        state.shutdownRegistered = true;
        registerShutdownTask({
            name: "scheduled-jobs",
            priority: SHUTDOWN_PRIORITY.JOBS,
            run: () => {
                stopJobs();
            },
        });
    }
}

export function stopJobs(): void {
    for (const timer of state.intervals.values()) {
        clearInterval(timer);
    }
    state.intervals.clear();
    state.runningJobs.clear();
    state.started = false;
}

export function resetJobsForTesting(): void {
    stopJobs();
    state.shutdownRegistered = false;
}

export function getScheduledJobNamesForTesting(): ReadonlyArray<string> {
    return Array.from(state.intervals.keys());
}

export function runJobForTesting(job: Job): Promise<void> {
    return runJob(job);
}
