import { type SQL, sql } from "drizzle-orm";
import {
    type ScheduledJobLifecycleState,
    type ScheduleKind,
    type SelectScheduledJob,
    scheduledJobs,
} from "../../schema/jobs/scheduledJobs.schema";
import { defineQuery } from "../defineQuery";

export type UpsertScheduledJobDefinitionInput = {
    guildId: string | null;
    jobKey: string;
    jobType: string;
    name: string;
    scheduleKind: ScheduleKind;
    intervalMs: number | null;
    timeoutMs: number;
    payload: Record<string, unknown>;
    /** Applied on INSERT only. `"now"` means the DB `now()`. Expresses run-on-start. */
    initialNextRunAt: Date | "now" | null;
    /** Applied on INSERT only. Defaults to `enabled`. */
    initialLifecycleState?: ScheduledJobLifecycleState;
    /**
     * When an existing row is stopped due to an incident (`disabled` / `config_error`
     * with no active run), re-arm it to `enabled` + next_run_at. Opt-in for built-in
     * infra jobs that should always run. `paused` (an intentional stop) and running jobs
     * are left untouched.
     */
    rearmIfStopped?: boolean;
};

/**
 * Upsert a job definition: the shared entry point for seeding built-in jobs (and future
 * dashboard-created jobs). On conflict it updates only the *definition* columns and
 * leaves next_run_at / lifecycle_state / pending_scheduled_for / attempt_count alone, so
 * re-seeding never clobbers a schedule state an admin changed deliberately.
 *
 * `initial*` apply to the INSERT branch only. The global vs guild-scoped partial unique
 * indexes differ, so the conflict target branches on guildId.
 */
export const upsertScheduledJobDefinition = defineQuery<[input: UpsertScheduledJobDefinitionInput], SelectScheduledJob>(
    async (input, client) => {
        const initialNextRunAt: Date | SQL | null = input.initialNextRunAt === "now" ? sql`now()` : input.initialNextRunAt;

        const values = {
            guildId: input.guildId,
            jobKey: input.jobKey,
            jobType: input.jobType,
            name: input.name,
            lifecycleState: input.initialLifecycleState ?? ("enabled" as ScheduledJobLifecycleState),
            scheduleKind: input.scheduleKind,
            intervalMs: input.intervalMs,
            nextRunAt: initialNextRunAt,
            timeoutMs: input.timeoutMs,
            payload: input.payload,
        };

        // Definition columns only. Schedule state (next_run_at / lifecycle_state /
        // pending_scheduled_for / attempt_count) is preserved to respect admin changes.
        const set: Record<string, unknown> = {
            name: input.name,
            jobType: input.jobType,
            scheduleKind: input.scheduleKind,
            intervalMs: input.intervalMs,
            timeoutMs: input.timeoutMs,
            payload: input.payload,
            updatedAt: sql`now()`,
        };

        if (input.rearmIfStopped) {
            // Only re-arm an incident-stopped job (disabled / config_error, no active run);
            // leave paused and running jobs as-is.
            const stopped = sql`${scheduledJobs.lifecycleState} in ('disabled', 'config_error') and ${scheduledJobs.activeRunId} is null`;
            // Embedding a raw JS Date in a sql template bypasses the column's timestamp codec
            // and becomes driver-dependent (postgres.js sends Date.toString(), which Postgres
            // rejects). The INSERT .values() side gets the codec; here, cast an explicit ISO
            // string to ::timestamp to pin the type.
            const rearmTimestamp: SQL =
                initialNextRunAt instanceof Date ? sql`${initialNextRunAt.toISOString()}::timestamp` : (initialNextRunAt ?? sql`now()`);
            set.lifecycleState = sql`case when ${stopped} then 'enabled' else ${scheduledJobs.lifecycleState} end`;
            set.nextRunAt = sql`case when ${stopped} then coalesce(${scheduledJobs.nextRunAt}, ${rearmTimestamp}) else ${scheduledJobs.nextRunAt} end`;
            set.attemptCount = sql`case when ${stopped} then 0 else ${scheduledJobs.attemptCount} end`;
            set.pendingScheduledFor = sql`case when ${stopped} then null else ${scheduledJobs.pendingScheduledFor} end`;
        }

        // global vs guild-scoped use different partial unique indexes, so branch the
        // conflict target.
        const conflict =
            input.guildId === null
                ? { target: scheduledJobs.jobKey, targetWhere: sql`${scheduledJobs.guildId} is null`, set }
                : {
                      target: [scheduledJobs.guildId, scheduledJobs.jobKey],
                      targetWhere: sql`${scheduledJobs.guildId} is not null`,
                      set,
                  };

        // values carries SQL for nextRunAt and conflict.set carries CASE expressions, both
        // looser than the strict zod-derived types; drizzle accepts SQL at the value level.
        const insert = client.insert(scheduledJobs).values(values as typeof scheduledJobs.$inferInsert);
        const [row] = await insert.onConflictDoUpdate(conflict as Parameters<typeof insert.onConflictDoUpdate>[0]).returning();

        if (!row) {
            throw new Error(`Failed to upsert scheduled job definition: ${input.guildId ?? "global"}/${input.jobKey}`);
        }

        return row;
    }
);
