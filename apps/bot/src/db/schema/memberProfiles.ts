import { primaryKey, snakeCase, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import type { z } from "zod";
import { guilds } from "@/db/schema/guilds";

export const memberProfiles = snakeCase.table(
    "member_profiles",
    {
        guildId: text()
            .notNull()
            .references(() => guilds.guildId, { onDelete: "cascade" }),
        userId: text().notNull(),
        createdAt: timestamp().notNull().defaultNow(),
        updatedAt: timestamp()
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
        bio: text().notNull().default(""),
    },
    (table) => [primaryKey({ columns: [table.guildId, table.userId] })]
);

export const insertMemberProfileSchema = createInsertSchema(memberProfiles).omit({ createdAt: true, updatedAt: true }).strict();
export const selectMemberProfileSchema = createSelectSchema(memberProfiles).strict();
export const updateMemberProfileSchema = createUpdateSchema(memberProfiles)
    .omit({ guildId: true, userId: true, createdAt: true, updatedAt: true })
    .strict();

export type InsertMemberProfile = z.input<typeof insertMemberProfileSchema>;
export type SelectMemberProfile = z.output<typeof selectMemberProfileSchema>;
export type UpdateMemberProfile = z.input<typeof updateMemberProfileSchema>;
