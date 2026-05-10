import { guilds } from "@/db/schema/guilds";
import { members } from "@/db/schema/members";
import { guildRelations, memberRelations } from "@/db/schema/relations";

export const schema = {
    guilds,
    guildRelations,
    members,
    memberRelations,
};
