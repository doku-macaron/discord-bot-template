import type { ClientEvents, Events } from "discord.js";

export const clientReadyEvent: (...args: ClientEvents[Events.ClientReady]) => void = async (client) => {
    console.log(`Logged in as ${client.user.tag}`);
};
