// Public types for the scheduler core. No dependency on discord.js or the database:
// the actual claim / finalize / stale recovery is delegated by the host (the bot) via
// the `SchedulerStore` port, which it implements against its DB queries.

export type ScheduledJobContext<TPayload> = {
    jobId: string;
    jobKey: string;
    guildId: string | null;
    runId: string;
    scheduledFor: Date;
    payload: TPayload;
    /** Best effort: a handler that ignores it may keep running past the timeout. */
    signal: AbortSignal;
};

export type ScheduledJobHandler<TPayload> = {
    type: string;
    parsePayload: (payload: unknown) => TPayload;
    run: (context: ScheduledJobContext<TPayload>) => Promise<void> | void;
};

export type ScheduleKind = "interval" | "once";

/** Terminal run status the worker reports to the store. */
export type RunStatus = "succeeded" | "failed" | "timed_out";

/** One claimed job returned by store.claimNext. */
export type ClaimedJob = {
    jobId: string;
    runId: string;
    jobKey: string;
    jobType: string;
    guildId: string | null;
    scheduleKind: ScheduleKind;
    intervalMs: number | null;
    scheduledFor: Date;
    payload: unknown;
    timeoutMs: number;
    attempt: number;
};

export type FinalizeRunInput = {
    jobId: string;
    runId: string;
    runStatus: RunStatus;
    errorMessage: string | null;
};

/**
 * The only path the scheduler core takes to the database. The host implements this
 * adapter by calling its DB queries. Multi-statement atomicity (the claim UPDATE +
 * job_runs insert, etc.) is the adapter's responsibility (wrap in a transaction).
 */
export type SchedulerStore = {
    claimNext(input: { workerId: string; allowedJobTypes: string[]; leaseGraceMs: number }): Promise<ClaimedJob | null>;
    finalize(input: FinalizeRunInput): Promise<void>;
    /**
     * `allowedJobTypes` are the types this worker's registry can run. The reaper only
     * recovers stale runs of those types, so a worker sharing a DB with another host
     * never closes the other host's jobs (same partitioning as claim).
     */
    recoverStale(input: { limit?: number; allowedJobTypes: string[] }): Promise<number>;
};

export type SchedulerLogger = {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (error: unknown) => void;
};
