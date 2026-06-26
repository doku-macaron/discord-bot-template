import { and, eq, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { jobRuns } from "../../schema/jobs/jobRuns.schema";
import { scheduledJobs } from "../../schema/jobs/scheduledJobs.schema";
import { defineQuery } from "../defineQuery";

export type RecoverStaleScheduledJobRunsInput = {
    limit?: number;
    /**
     * When set, only recover stale runs of these job types. With multiple worker hosts
     * sharing a DB, each passes its own allowedJobTypes so it never abandons / disables
     * another host's jobs (same partitioning as the claim path). Omit to target all types.
     */
    allowedJobTypes?: string[];
};

const DEFAULT_LIMIT = 100;

/**
 * Recover active runs whose lease (`locked_until`) has expired — a worker that died or
 * a handler that never returned after timeout. Closed on startup and by the periodic
 * reaper: the `job_runs` row becomes `abandoned`, and the `scheduled_jobs` lease columns
 * are nulled with lifecycle disabled and next_run_at null. It does not retry immediately
 * (the old handler may still be running in-process).
 *
 * `for update skip locked` selects targets so concurrent reapers don't double-process a
 * row. Multi-statement atomicity comes from the caller's `withTransaction`. Returns the
 * number recovered.
 */
export const recoverStaleScheduledJobRuns = defineQuery<[input: RecoverStaleScheduledJobRunsInput], number>(async (input, client) => {
    const limit = input.limit ?? DEFAULT_LIMIT;
    const typeFilter = input.allowedJobTypes !== undefined ? inArray(scheduledJobs.jobType, input.allowedJobTypes) : undefined;

    const targets = await client
        .select({ id: scheduledJobs.id, activeRunId: scheduledJobs.activeRunId })
        .from(scheduledJobs)
        .where(and(isNotNull(scheduledJobs.activeRunId), lt(scheduledJobs.lockedUntil, sql`now()`), typeFilter))
        .limit(limit)
        .for("update", { skipLocked: true });

    if (targets.length === 0) {
        return 0;
    }

    const jobIds = targets.map((row) => row.id);
    const runIds = targets.map((row) => row.activeRunId).filter((value): value is string => value !== null);

    if (runIds.length > 0) {
        await client
            .update(jobRuns)
            .set({ status: "abandoned", finishedAt: sql`now()`, updatedAt: sql`now()` })
            .where(and(inArray(jobRuns.id, runIds), eq(jobRuns.status, "running")));
    }

    await client
        .update(scheduledJobs)
        .set({
            activeRunId: null,
            lockedBy: null,
            lockedUntil: null,
            timeoutAt: null,
            heartbeatAt: null,
            nextRunAt: null,
            pendingScheduledFor: null,
            attemptCount: 0,
            lifecycleState: "disabled",
            lastRunStatus: "abandoned",
            lastFinishedAt: sql`now()`,
            updatedAt: sql`now()`,
        })
        .where(inArray(scheduledJobs.id, jobIds));

    return targets.length;
});
