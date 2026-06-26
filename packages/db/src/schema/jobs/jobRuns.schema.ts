import { index, integer, jsonb, snakeCase, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import type { z } from "zod";
import { scheduledJobs } from "./scheduledJobs.schema";

export const JOB_RUN_STATUSES = ["running", "succeeded", "failed", "timed_out", "canceled", "abandoned"] as const;
export type JobRunStatus = (typeof JOB_RUN_STATUSES)[number];

/**
 * Run history. The scheduler inserts one `running` row on a successful claim and
 * closes it to a terminal status on finalize / stale recovery. The snapshot columns
 * (guild_id, etc.) capture the values at run time so later changes to the definition
 * don't rewrite history. `abandoned` is a run the reaper closed after the worker died
 * or the lease expired.
 */
export const jobRuns = snakeCase.table(
    "job_runs",
    {
        id: text()
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        createdAt: timestamp().notNull().defaultNow(),
        updatedAt: timestamp()
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
        jobId: text()
            .notNull()
            .references(() => scheduledJobs.id, { onDelete: "cascade" }),
        // Run-time snapshot. History should survive guild deletion, so no FK here.
        guildId: text(),
        jobKey: text().notNull(),
        jobType: text().notNull(),
        status: text().$type<JobRunStatus>().notNull(),
        scheduledFor: timestamp().notNull(),
        attempt: integer().notNull(),
        workerId: text().notNull(),
        timeoutMs: integer().notNull(),
        startedAt: timestamp().notNull(),
        timeoutAt: timestamp().notNull(),
        lockedUntil: timestamp().notNull(),
        finishedAt: timestamp(),
        heartbeatAt: timestamp(),
        payload: jsonb().$type<Record<string, unknown>>().notNull(),
        errorMessage: text(),
    },
    (table) => [
        index("job_runs_job_started_idx").on(table.jobId, table.startedAt),
        index("job_runs_guild_started_idx").on(table.guildId, table.startedAt),
        index("job_runs_status_started_idx").on(table.status, table.startedAt),
        index("job_runs_worker_status_idx").on(table.workerId, table.status),
    ]
);

export const insertJobRunSchema = createInsertSchema(jobRuns).omit({ id: true, createdAt: true, updatedAt: true }).strict();
export const selectJobRunSchema = createSelectSchema(jobRuns).strict();
export const updateJobRunSchema = createUpdateSchema(jobRuns).omit({ id: true, createdAt: true, updatedAt: true }).strict();

export type InsertJobRun = z.input<typeof insertJobRunSchema>;
export type SelectJobRun = z.output<typeof selectJobRunSchema>;
export type UpdateJobRun = z.input<typeof updateJobRunSchema>;
