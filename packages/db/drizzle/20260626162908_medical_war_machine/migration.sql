CREATE TABLE "job_runs" (
	"id" text PRIMARY KEY,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"job_id" text NOT NULL,
	"guild_id" text,
	"job_key" text NOT NULL,
	"job_type" text NOT NULL,
	"status" text NOT NULL,
	"scheduled_for" timestamp NOT NULL,
	"attempt" integer NOT NULL,
	"worker_id" text NOT NULL,
	"timeout_ms" integer NOT NULL,
	"started_at" timestamp NOT NULL,
	"timeout_at" timestamp NOT NULL,
	"locked_until" timestamp NOT NULL,
	"finished_at" timestamp,
	"heartbeat_at" timestamp,
	"payload" jsonb NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "scheduled_jobs" (
	"id" text PRIMARY KEY,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"guild_id" text,
	"job_key" text NOT NULL,
	"job_type" text NOT NULL,
	"name" text NOT NULL,
	"lifecycle_state" text NOT NULL,
	"schedule_kind" text NOT NULL,
	"interval_ms" integer,
	"next_run_at" timestamp,
	"pending_scheduled_for" timestamp,
	"timeout_ms" integer NOT NULL,
	"max_attempts" integer DEFAULT 1 NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"retry_backoff_ms" integer,
	"payload" jsonb NOT NULL,
	"active_run_id" text,
	"locked_by" text,
	"locked_until" timestamp,
	"timeout_at" timestamp,
	"heartbeat_at" timestamp,
	"last_run_at" timestamp,
	"last_finished_at" timestamp,
	"last_run_status" text,
	"last_error" text
);
--> statement-breakpoint
CREATE INDEX "job_runs_job_started_idx" ON "job_runs" ("job_id","started_at");--> statement-breakpoint
CREATE INDEX "job_runs_guild_started_idx" ON "job_runs" ("guild_id","started_at");--> statement-breakpoint
CREATE INDEX "job_runs_status_started_idx" ON "job_runs" ("status","started_at");--> statement-breakpoint
CREATE INDEX "job_runs_worker_status_idx" ON "job_runs" ("worker_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "scheduled_jobs_global_key_idx" ON "scheduled_jobs" ("job_key") WHERE "guild_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "scheduled_jobs_guild_key_idx" ON "scheduled_jobs" ("guild_id","job_key") WHERE "guild_id" is not null;--> statement-breakpoint
CREATE INDEX "scheduled_jobs_due_idx" ON "scheduled_jobs" ("lifecycle_state","active_run_id","next_run_at");--> statement-breakpoint
CREATE INDEX "scheduled_jobs_guild_due_idx" ON "scheduled_jobs" ("guild_id","lifecycle_state","next_run_at");--> statement-breakpoint
CREATE INDEX "scheduled_jobs_locked_until_idx" ON "scheduled_jobs" ("active_run_id","locked_until");--> statement-breakpoint
CREATE INDEX "scheduled_jobs_type_idx" ON "scheduled_jobs" ("job_type");--> statement-breakpoint
ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_job_id_scheduled_jobs_id_fkey" FOREIGN KEY ("job_id") REFERENCES "scheduled_jobs"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_guild_id_guilds_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("guild_id") ON DELETE CASCADE;