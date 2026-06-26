import { sql } from "drizzle-orm";
import { index, integer, jsonb, snakeCase, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import type { z } from "zod";
import { guilds } from "../guilds.schema";

export const SCHEDULED_JOB_LIFECYCLE_STATES = ["enabled", "paused", "disabled", "config_error"] as const;
export type ScheduledJobLifecycleState = (typeof SCHEDULED_JOB_LIFECYCLE_STATES)[number];

export const SCHEDULE_KINDS = ["interval", "once"] as const;
export type ScheduleKind = (typeof SCHEDULE_KINDS)[number];

/**
 * The job definition and its current position in the scheduler. Per-run success /
 * failure / timeout lives in `job_runs`; this table holds only the definition, the
 * next claim target, and the in-flight lease.
 *
 * The primary guard against double execution is `active_run_id is null`. Claims are a
 * conditional update keyed on `active_run_id`, with `for update skip locked` to avoid
 * contention between workers (expressed in the claim query). `guild_id` is the target
 * guild for guild-scoped jobs; global jobs are null.
 */
export const scheduledJobs = snakeCase.table(
    "scheduled_jobs",
    {
        id: text()
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        createdAt: timestamp().notNull().defaultNow(),
        updatedAt: timestamp()
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
        // Target guild for guild-scoped jobs; null for global jobs. Cascade so a guild's
        // jobs are removed when the bot leaves it.
        guildId: text().references(() => guilds.guildId, { onDelete: "cascade" }),
        jobKey: text().notNull(),
        jobType: text().notNull(),
        name: text().notNull(),
        lifecycleState: text().$type<ScheduledJobLifecycleState>().notNull(),
        scheduleKind: text().$type<ScheduleKind>().notNull(),
        intervalMs: integer(),
        nextRunAt: timestamp(),
        // The original scheduled slot during a retry. Basically null in the simple case.
        pendingScheduledFor: timestamp(),
        timeoutMs: integer().notNull(),
        maxAttempts: integer().notNull().default(1),
        attemptCount: integer().notNull().default(0),
        retryBackoffMs: integer(),
        payload: jsonb().$type<Record<string, unknown>>().notNull(),
        // The id of the in-flight run. The concrete double-execution guard.
        activeRunId: text(),
        lockedBy: text(),
        // Lease for stale recovery: `timeout_at + lease_grace_ms`.
        lockedUntil: timestamp(),
        timeoutAt: timestamp(),
        // Observability only; not used to extend the lease.
        heartbeatAt: timestamp(),
        lastRunAt: timestamp(),
        lastFinishedAt: timestamp(),
        lastRunStatus: text(),
        lastError: text(),
    },
    (table) => [
        // global job: job_key is unique among guild_id is null rows.
        uniqueIndex("scheduled_jobs_global_key_idx").on(table.jobKey).where(sql`${table.guildId} is null`),
        // guild-scoped job: (guild_id, job_key) is unique.
        uniqueIndex("scheduled_jobs_guild_key_idx").on(table.guildId, table.jobKey).where(sql`${table.guildId} is not null`),
        index("scheduled_jobs_due_idx").on(table.lifecycleState, table.activeRunId, table.nextRunAt),
        index("scheduled_jobs_guild_due_idx").on(table.guildId, table.lifecycleState, table.nextRunAt),
        index("scheduled_jobs_locked_until_idx").on(table.activeRunId, table.lockedUntil),
        index("scheduled_jobs_type_idx").on(table.jobType),
    ]
);

export const insertScheduledJobSchema = createInsertSchema(scheduledJobs).omit({ id: true, createdAt: true, updatedAt: true }).strict();
export const selectScheduledJobSchema = createSelectSchema(scheduledJobs).strict();
export const updateScheduledJobSchema = createUpdateSchema(scheduledJobs).omit({ id: true, createdAt: true, updatedAt: true }).strict();

export type InsertScheduledJob = z.input<typeof insertScheduledJobSchema>;
export type SelectScheduledJob = z.output<typeof selectScheduledJobSchema>;
export type UpdateScheduledJob = z.input<typeof updateScheduledJobSchema>;
