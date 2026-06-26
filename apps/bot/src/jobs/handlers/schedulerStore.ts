import { claimNextScheduledJob } from "@repo/db/query/scheduledJob/claimNextScheduledJob";
import { finalizeScheduledJobRun } from "@repo/db/query/scheduledJob/finalizeScheduledJobRun";
import { recoverStaleScheduledJobRuns } from "@repo/db/query/scheduledJob/recoverStaleScheduledJobRuns";
import { withTransaction } from "@repo/db/transaction";
import type { SchedulerStore } from "@repo/scheduler";

/**
 * Adapter wiring the scheduler core's `SchedulerStore` port to the `@repo/db` queries.
 * The multi-statement atomicity of claim (UPDATE + job_runs insert), finalize (2
 * UPDATEs), and stale recovery is guaranteed here by wrapping each in `withTransaction`.
 * Job bodies run outside these (short-lived) transactions, in the worker.
 */
export const schedulerStore: SchedulerStore = {
    claimNext: async (input) => {
        const result = await withTransaction((tx) => claimNextScheduledJob(input, tx));
        if (!result.success) {
            throw result.error;
        }
        const claimed = result.data;
        if (!claimed) {
            return null;
        }
        return {
            jobId: claimed.jobId,
            runId: claimed.runId,
            jobKey: claimed.jobKey,
            jobType: claimed.jobType,
            guildId: claimed.guildId,
            scheduleKind: claimed.scheduleKind,
            intervalMs: claimed.intervalMs,
            scheduledFor: claimed.scheduledFor,
            payload: claimed.payload,
            timeoutMs: claimed.timeoutMs,
            attempt: claimed.attempt,
        };
    },
    finalize: async (input) => {
        const result = await withTransaction((tx) =>
            finalizeScheduledJobRun(
                { jobId: input.jobId, runId: input.runId, runStatus: input.runStatus, errorMessage: input.errorMessage },
                tx
            )
        );
        if (!result.success) {
            throw result.error;
        }
    },
    recoverStale: async (input) => {
        const result = await withTransaction((tx) =>
            recoverStaleScheduledJobRuns({ limit: input.limit, allowedJobTypes: input.allowedJobTypes }, tx)
        );
        if (!result.success) {
            throw result.error;
        }
        return result.data;
    },
};
