import type { ClientEvents, Events } from "discord.js";
import { markGuildLeft } from "@/db/query/guild/markGuildLeft";
import { logger } from "@/lib/logger";

export const guildDeleteEvent: (...args: ClientEvents[Events.GuildDelete]) => void = async (guild) => {
    // `guild.available` is false when Discord experiences an outage, not when the bot was removed.
    // Skip the soft-delete in that case so we don't mark guilds as left during transient downtime.
    if (!guild.available) {
        logger.warn("Bot", `GuildDelete for unavailable guild (likely outage), skipping: ${guild.id}`);
        return;
    }

    try {
        const updated = await markGuildLeft(guild.id);
        if (updated) {
            logger.info("Bot", `Left guild: ${guild.name} (${guild.id})`);
        } else {
            logger.warn("Bot", `GuildDelete for unknown guild (no DB row): ${guild.id}`);
        }
    } catch (unknownError) {
        const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
        logger.error("Database", error);
    }
};
