import { Events } from "discord.js";
import { defineClientEvent } from "@/framework/discord/clientEvents";
import { logger } from "@/lib/infra/logger";
import { markGuildLeftUseCase } from "@/usecases/guild/markGuildLeftUseCase";

export const guildDeleteEvent = defineClientEvent(Events.GuildDelete, (guild) => {
    // `guild.available` is false when Discord experiences an outage, not when the bot was removed.
    // Skip the soft-delete in that case so we don't mark guilds as left during transient downtime.
    if (!guild.available) {
        logger.warn("Bot", `GuildDelete for unavailable guild (likely outage), skipping: ${guild.id}`);
        return;
    }
    void markGuildLeftUseCase({ guildId: guild.id, name: guild.name });
});
