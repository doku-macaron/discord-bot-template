import { integer, snakeCase, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import type { z } from "zod";
import { guilds } from "@/db/schema/guilds";

export const members = snakeCase.table(
    "members",
    {
        id: integer().primaryKey().generatedAlwaysAsIdentity(),
        createdAt: timestamp().notNull().defaultNow(),
        updatedAt: timestamp()
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
        guildId: text()
            .notNull()
            .references(() => guilds.guildId, {
                onDelete: "cascade",
            }),
        userId: text().notNull(),
        displayName: text().notNull().default(""),
        commandCount: integer().notNull().default(0),
    },
    (table) => [unique("members_guild_id_user_id_unique").on(table.guildId, table.userId)]
);

export const insertMemberSchema = createInsertSchema(members).omit({ createdAt: true, updatedAt: true }).strict();
export const selectMemberSchema = createSelectSchema(members).strict();
export const updateMemberSchema = createUpdateSchema(members)
    .omit({ guildId: true, userId: true, createdAt: true, updatedAt: true })
    .strict();

export type InsertMember = z.input<typeof insertMemberSchema>;
export type SelectMember = z.output<typeof selectMemberSchema>;
export type UpdateMember = z.input<typeof updateMemberSchema>;
