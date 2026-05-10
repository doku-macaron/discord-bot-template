import { relations } from "drizzle-orm";
import { guilds } from "@/db/schema/guilds";
import { members } from "@/db/schema/members";

export const guildRelations = relations(guilds, ({ many }) => ({
    members: many(members),
}));

export const memberRelations = relations(members, ({ one }) => ({
    guild: one(guilds, {
        fields: [members.guildId],
        references: [guilds.guildId],
    }),
}));
