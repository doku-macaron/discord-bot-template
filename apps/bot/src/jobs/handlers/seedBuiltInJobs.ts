import { upsertScheduledJobDefinition } from "@repo/db/query/scheduledJob/upsertScheduledJobDefinition";
import { BUILTIN_UPTIME } from "@/jobs/builtInJobs";

/**
 * Seed the built-in job definitions. `initialNextRunAt` applies on INSERT only, so this
 * is safe to call every startup without clobbering admin changes. `rearmIfStopped`
 * re-arms a built-in that an incident left disabled, so infra jobs don't stay dead.
 */
export async function seedBuiltInJobs(): Promise<void> {
    await upsertScheduledJobDefinition({
        guildId: null,
        jobKey: BUILTIN_UPTIME.jobKey,
        jobType: BUILTIN_UPTIME.jobType,
        name: BUILTIN_UPTIME.name,
        scheduleKind: "interval",
        intervalMs: BUILTIN_UPTIME.intervalMs,
        timeoutMs: BUILTIN_UPTIME.timeoutMs,
        payload: {},
        // Don't run immediately on boot; first fire after one interval.
        initialNextRunAt: new Date(Date.now() + BUILTIN_UPTIME.intervalMs),
        rearmIfStopped: true,
    });
}
