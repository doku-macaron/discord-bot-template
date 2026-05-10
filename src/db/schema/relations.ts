import { defineRelations } from "drizzle-orm";
import { guilds } from "@/db/schema/guilds";
import { members } from "@/db/schema/members";

const tables = { guilds, members };

export const relations = defineRelations(tables, (r) => ({
    guilds: {
        members: r.many.members(),
    },
    members: {
        guild: r.one.guilds({
            from: r.members.guildId,
            to: r.guilds.guildId,
        }),
    },
}));
