import { and, asc, eq, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { jobRuns } from "../../schema/jobs/jobRuns.schema";
import { type ScheduleKind, scheduledJobs } from "../../schema/jobs/scheduledJobs.schema";
import { defineQuery } from "../defineQuery";

export type ClaimNextScheduledJobInput = {
    workerId: string;
    allowedJobTypes: ReadonlyArray<string>;
    leaseGraceMs: number;
};

export type ClaimedScheduledJob = {
    jobId: string;
    runId: string;
    jobKey: string;
    jobType: string;
    name: string;
    guildId: string | null;
    scheduleKind: ScheduleKind;
    intervalMs: number | null;
    scheduledFor: Date;
    payload: Record<string, unknown>;
    timeoutMs: number;
    attempt: number;
    maxAttempts: number;
};

/**
 * Atomically claim one due job. To avoid a TOCTOU between "read due" and "mark
 * running", the claim is a conditional UPDATE whose target is a `for update skip
 * locked` sub-select, and the same call inserts a `running` row into `job_runs`.
 * `active_run_id is null` is the primary double-execution guard; `job_type = any(...)`
 * keeps a host from claiming a job it can't run.
 *
 * Every `now()` is computed DB-side (no JS Date.now()). The two statements (UPDATE +
 * INSERT) get their atomicity from the caller's `withTransaction`. Returns null when
 * allowedJobTypes is empty or nothing is due.
 */
export const claimNextScheduledJob = defineQuery<[input: ClaimNextScheduledJobInput], ClaimedScheduledJob | null>(async (input, client) => {
    if (input.allowedJobTypes.length === 0) {
        return null;
    }

    const runId = crypto.randomUUID();

    // Pick one due row with `for update skip locked` so concurrent workers don't claim
    // the same row.
    const dueJobId = client
        .select({ id: scheduledJobs.id })
        .from(scheduledJobs)
        .where(
            and(
                eq(scheduledJobs.lifecycleState, "enabled"),
                isNull(scheduledJobs.activeRunId),
                inArray(scheduledJobs.jobType, [...input.allowedJobTypes]),
                isNotNull(scheduledJobs.nextRunAt),
                // `next_run_at` is naive (UTC wall clock); drop `now()` (timestamptz) to naive
                // UTC and compare naive-to-naive so due-ness is independent of the session TZ.
                lte(scheduledJobs.nextRunAt, sql`(now() at time zone 'utc')`)
            )
        )
        .orderBy(asc(scheduledJobs.nextRunAt))
        .for("update", { skipLocked: true })
        .limit(1);

    const [claimed] = await client
        .update(scheduledJobs)
        .set({
            activeRunId: runId,
            lockedBy: input.workerId,
            lastRunAt: sql`now()`,
            timeoutAt: sql`now() + (${scheduledJobs.timeoutMs} * interval '1 millisecond')`,
            lockedUntil: sql`now() + ((${scheduledJobs.timeoutMs} + ${input.leaseGraceMs}) * interval '1 millisecond')`,
            heartbeatAt: sql`now()`,
            attemptCount: sql`${scheduledJobs.attemptCount} + 1`,
            // Pin the claim slot to pending even though it stays null without retries.
            pendingScheduledFor: sql`coalesce(${scheduledJobs.pendingScheduledFor}, ${scheduledJobs.nextRunAt})`,
            updatedAt: sql`now()`,
        })
        .where(inArray(scheduledJobs.id, dueJobId))
        .returning();

    if (!claimed) {
        return null;
    }

    // The claim slot is the coalesced pending_scheduled_for (= the original next_run_at).
    const scheduledFor = claimed.pendingScheduledFor ?? claimed.lastRunAt ?? new Date();
    const startedAt = claimed.lastRunAt ?? new Date();

    await client.insert(jobRuns).values({
        id: runId,
        jobId: claimed.id,
        guildId: claimed.guildId,
        jobKey: claimed.jobKey,
        jobType: claimed.jobType,
        status: "running",
        scheduledFor,
        attempt: claimed.attemptCount,
        workerId: input.workerId,
        timeoutMs: claimed.timeoutMs,
        startedAt,
        // Snapshot the values the DB already computed at claim time.
        timeoutAt: claimed.timeoutAt ?? startedAt,
        lockedUntil: claimed.lockedUntil ?? startedAt,
        payload: claimed.payload,
    });

    return {
        jobId: claimed.id,
        runId,
        jobKey: claimed.jobKey,
        jobType: claimed.jobType,
        name: claimed.name,
        guildId: claimed.guildId,
        scheduleKind: claimed.scheduleKind,
        intervalMs: claimed.intervalMs,
        scheduledFor,
        payload: claimed.payload,
        timeoutMs: claimed.timeoutMs,
        attempt: claimed.attemptCount,
        maxAttempts: claimed.maxAttempts,
    };
});
