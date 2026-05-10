import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import type { z } from "zod";

export const guilds = pgTable("guilds", {
    guildId: text().primaryKey(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp()
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
    name: text().notNull().default(""),
    joinedAt: timestamp().notNull().defaultNow(),
    leftAt: timestamp(),
});

export const insertGuildSchema = createInsertSchema(guilds).omit({ createdAt: true, updatedAt: true }).strict();
export const selectGuildSchema = createSelectSchema(guilds).strict();
export const updateGuildSchema = createUpdateSchema(guilds).omit({ guildId: true, createdAt: true, updatedAt: true }).strict();

export type InsertGuild = z.input<typeof insertGuildSchema>;
export type SelectGuild = z.output<typeof selectGuildSchema>;
export type UpdateGuild = z.input<typeof updateGuildSchema>;
