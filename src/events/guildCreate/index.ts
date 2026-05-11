import type { ClientEvents, Events } from "discord.js";
import { recordGuildJoinUseCase } from "@/usecases/guild/recordGuildJoinUseCase";

export const guildCreateEvent: (...args: ClientEvents[Events.GuildCreate]) => void = (guild) => {
    void recordGuildJoinUseCase({ guildId: guild.id, name: guild.name });
};
