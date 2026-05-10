import type { ClientEvents, Events } from "discord.js";
import { getOrCreateGuild } from "@/db/query/guild/getOrCreateGuild";
import { logger } from "@/lib/logger";

export const guildCreateEvent: (...args: ClientEvents[Events.GuildCreate]) => void = async (guild) => {
    try {
        await getOrCreateGuild({ guildId: guild.id, name: guild.name });
        logger.info("Bot", `Joined guild: ${guild.name} (${guild.id})`);
    } catch (unknownError) {
        const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
        logger.error("Database", error);
    }
};
