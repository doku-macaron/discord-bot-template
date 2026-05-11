import { guildSettings } from "@/db/schema/guildSettings";
import { guilds } from "@/db/schema/guilds";
import { memberProfiles } from "@/db/schema/memberProfiles";

export { relations } from "@/db/schema/relations";

export const schema = {
    guilds,
    guildSettings,
    memberProfiles,
};
