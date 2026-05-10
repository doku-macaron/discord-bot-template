import type { Job } from "@/jobs/job";
import { logger } from "@/lib/logger";
import { registerShutdownTask, SHUTDOWN_PRIORITY } from "@/lib/shutdown";

const intervals = new Map<string, ReturnType<typeof setInterval>>();
let started = false;
let shutdownRegistered = false;

async function runJob(job: Job): Promise<void> {
    try {
        await job.run();
    } catch (error) {
        const jobError = error instanceof Error ? error : new Error(String(error));
        logger.error("Core", new Error(`Job '${job.name}' failed`, { cause: jobError }));
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
    started = false;
}
