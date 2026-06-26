import { Events } from "discord.js";
import { defineClientEvent } from "@/framework/discord/clientEvents";
import { recordGuildJoinUseCase } from "@/usecases/guild/recordGuildJoinUseCase";

export const guildCreateEvent = defineClientEvent(Events.GuildCreate, (guild) => {
    void recordGuildJoinUseCase({ guildId: guild.id, name: guild.name });
});
