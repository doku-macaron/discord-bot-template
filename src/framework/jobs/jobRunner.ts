import type { Job } from "@/framework/jobs/job";
import { logger } from "@/lib/infra/logger";
import { registerShutdownTask, SHUTDOWN_PRIORITY } from "@/lib/infra/shutdown";

const intervals = new Map<string, ReturnType<typeof setInterval>>();
const runningJobs = new Set<string>();
let started = false;
let shutdownRegistered = false;

function isValidIntervalMs(intervalMs: number): boolean {
    return Number.isFinite(intervalMs) && intervalMs > 0;
}

async function runJob(job: Job): Promise<void> {
    if (runningJobs.has(job.name)) {
        logger.warn("Core", `Job '${job.name}' is still running from the previous tick. Skipping this run.`);
        return;
    }
    runningJobs.add(job.name);
    try {
        await job.run();
    } catch (error) {
        const jobError = error instanceof Error ? error : new Error(String(error));
        logger.error("Core", new Error(`Job '${job.name}' failed`, { cause: jobError }));
    } finally {
        runningJobs.delete(job.name);
    }
}

export function startJobs(jobs: ReadonlyArray<Job>): void {
    if (started) {
        logger.warn("Core", "startJobs called more than once. Ignoring subsequent calls.");
        return;
    }
    started = true;

    for (const job of jobs) {
        if (intervals.has(job.name)) {
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

        intervals.set(
            job.name,
            setInterval(() => {
                void runJob(job);
            }, job.intervalMs)
        );
    }

    logger.info("Core", `Started ${intervals.size} scheduled jobs`);

    if (!shutdownRegistered) {
        shutdownRegistered = true;
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
    for (const timer of intervals.values()) {
        clearInterval(timer);
    }
    intervals.clear();
    runningJobs.clear();
    started = false;
}

export function resetJobsForTesting(): void {
    stopJobs();
    shutdownRegistered = false;
}

export function getScheduledJobNamesForTesting(): ReadonlyArray<string> {
    return Array.from(intervals.keys());
}

export function runJobForTesting(job: Job): Promise<void> {
    return runJob(job);
}
