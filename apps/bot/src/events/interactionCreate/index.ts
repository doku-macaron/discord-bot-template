import type { ClientEvents, Events } from "discord.js";
import { dispatchInteraction } from "@/events/interactionCreate/setup";

export const interactionCreateEvent: (...args: ClientEvents[Events.InteractionCreate]) => void = (interaction) => {
    dispatchInteraction(interaction);
};
