import { and, eq, type SQL, sql } from "drizzle-orm";
import { type JobRunStatus, jobRuns } from "../../schema/jobs/jobRuns.schema";
import { type ScheduledJobLifecycleState, scheduledJobs } from "../../schema/jobs/scheduledJobs.schema";
import { defineQuery } from "../defineQuery";

export type FinalizeRunStatus = "succeeded" | "failed" | "timed_out";

export type FinalizeScheduledJobRunInput = {
    jobId: string;
    runId: string;
    runStatus: FinalizeRunStatus;
    errorMessage: string | null;
};

export type FinalizeScheduledJobRunResult = {
    /** false when active_run_id didn't match (a late runner is prevented from overwriting state). */
    applied: boolean;
};

/** Retry interval when retry_backoff_ms is unset. */
const DEFAULT_RETRY_BACKOFF_MS = 60_000;

/**
 * Finalize a run. Keying the conditional update on `active_run_id = runId` stops a late
 * runner from overwriting DB state.
 *
 * Policy:
 * - succeeded + interval: next_run_at = now() + interval_ms, enabled, retry slot cleared
 * - succeeded + once: next_run_at = null, disabled
 * - failed/timed_out with attempt_count < max_attempts: retry — next_run_at = now() +
 *   (retry_backoff_ms ?? default), enabled, keep pending_scheduled_for + attempt_count
 * - failed/timed_out, retries exhausted: next_run_at = null, disabled, retry slot cleared
 *
 * The two statements (scheduled_jobs UPDATE + job_runs UPDATE) get their atomicity from
 * the caller's `withTransaction`.
 */
export const finalizeScheduledJobRun = defineQuery<[input: FinalizeScheduledJobRunInput], FinalizeScheduledJobRunResult>(
    async (input, client) => {
        const [job] = await client
            .select({
                scheduleKind: scheduledJobs.scheduleKind,
                intervalMs: scheduledJobs.intervalMs,
                attemptCount: scheduledJobs.attemptCount,
                maxAttempts: scheduledJobs.maxAttempts,
                retryBackoffMs: scheduledJobs.retryBackoffMs,
            })
            .from(scheduledJobs)
            .where(eq(scheduledJobs.id, input.jobId))
            .limit(1);

        if (!job) {
            return { applied: false };
        }

        const isFailure = input.runStatus === "failed" || input.runStatus === "timed_out";
        const canRetry = isFailure && job.attemptCount < job.maxAttempts;

        let nextLifecycleState: ScheduledJobLifecycleState;
        let nextRunAt: SQL | null;
        let nextPendingScheduledFor: SQL | null;
        let nextAttemptCount: SQL | number;
        if (input.runStatus === "succeeded" && job.scheduleKind === "interval") {
            // No catch-up (finished_at + interval_ms).
            nextLifecycleState = "enabled";
            nextRunAt = sql`now() + (${job.intervalMs ?? 0} * interval '1 millisecond')`;
            nextPendingScheduledFor = null;
            nextAttemptCount = 0;
        } else if (input.runStatus === "succeeded") {
            // once succeeded.
            nextLifecycleState = "disabled";
            nextRunAt = null;
            nextPendingScheduledFor = null;
            nextAttemptCount = 0;
        } else if (canRetry) {
            // Failed but retry budget remains; keep the original slot and attempt_count.
            nextLifecycleState = "enabled";
            nextRunAt = sql`now() + (${job.retryBackoffMs ?? DEFAULT_RETRY_BACKOFF_MS} * interval '1 millisecond')`;
            nextPendingScheduledFor = sql`${scheduledJobs.pendingScheduledFor}`;
            nextAttemptCount = sql`${scheduledJobs.attemptCount}`;
        } else {
            // Failed, retries exhausted.
            nextLifecycleState = "disabled";
            nextRunAt = null;
            nextPendingScheduledFor = null;
            nextAttemptCount = 0;
        }

        const [updated] = await client
            .update(scheduledJobs)
            .set({
                activeRunId: null,
                lockedBy: null,
                lockedUntil: null,
                timeoutAt: null,
                heartbeatAt: null,
                nextRunAt,
                pendingScheduledFor: nextPendingScheduledFor,
                attemptCount: nextAttemptCount,
                lifecycleState: nextLifecycleState,
                lastFinishedAt: sql`now()`,
                lastRunStatus: input.runStatus,
                lastError: input.errorMessage,
                updatedAt: sql`now()`,
            })
            .where(and(eq(scheduledJobs.id, input.jobId), eq(scheduledJobs.activeRunId, input.runId)))
            .returning({ id: scheduledJobs.id });

        if (!updated) {
            return { applied: false };
        }

        const runStatus: JobRunStatus = input.runStatus;
        await client
            .update(jobRuns)
            .set({ status: runStatus, finishedAt: sql`now()`, errorMessage: input.errorMessage, updatedAt: sql`now()` })
            .where(eq(jobRuns.id, input.runId));

        return { applied: true };
    }
);
