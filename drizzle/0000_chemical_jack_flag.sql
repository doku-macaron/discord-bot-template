CREATE TABLE "guilds" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "members_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"display_name" text DEFAULT '' NOT NULL,
	"command_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "members_guild_id_user_id_unique" UNIQUE("guild_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_guild_id_guilds_guild_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("guild_id") ON DELETE cascade ON UPDATE no action;