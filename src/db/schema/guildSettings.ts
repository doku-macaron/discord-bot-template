import { snakeCase, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import type { z } from "zod";
import { guilds } from "@/db/schema/guilds";

export const guildSettings = snakeCase.table("guild_settings", {
    guildId: text()
        .primaryKey()
        .references(() => guilds.guildId, { onDelete: "cascade" }),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp()
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
    modRoleId: text(),
    archiveChannelId: text(),
});

export const insertGuildSettingsSchema = createInsertSchema(guildSettings).omit({ createdAt: true, updatedAt: true }).strict();
export const selectGuildSettingsSchema = createSelectSchema(guildSettings).strict();
export const updateGuildSettingsSchema = createUpdateSchema(guildSettings)
    .omit({ guildId: true, createdAt: true, updatedAt: true })
    .strict();

export type InsertGuildSettings = z.input<typeof insertGuildSettingsSchema>;
export type SelectGuildSettings = z.output<typeof selectGuildSettingsSchema>;
export type UpdateGuildSettings = z.input<typeof updateGuildSettingsSchema>;
