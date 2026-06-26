import { defineRelations } from "drizzle-orm";
import { guildSettings } from "@/db/schema/guildSettings";
import { guilds } from "@/db/schema/guilds";
import { memberProfiles } from "@/db/schema/memberProfiles";

const tables = { guilds, guildSettings, memberProfiles };

export const relations = defineRelations(tables, (r) => ({
    guilds: {
        settings: r.one.guildSettings({
            from: r.guilds.guildId,
            to: r.guildSettings.guildId,
        }),
        memberProfiles: r.many.memberProfiles(),
    },
    guildSettings: {
        guild: r.one.guilds({
            from: r.guildSettings.guildId,
            to: r.guilds.guildId,
        }),
    },
    memberProfiles: {
        guild: r.one.guilds({
            from: r.memberProfiles.guildId,
            to: r.guilds.guildId,
        }),
    },
}));
