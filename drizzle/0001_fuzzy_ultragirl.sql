ALTER TABLE "guilds" ADD COLUMN "joined_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "guilds" ADD COLUMN "left_at" timestamp;