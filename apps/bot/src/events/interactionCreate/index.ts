import { Events } from "discord.js";
import { dispatchInteraction } from "@/events/interactionCreate/setup";
import { defineClientEvent } from "@/framework/discord/clientEvents";

export const interactionCreateEvent = defineClientEvent(Events.InteractionCreate, (interaction) => {
    dispatchInteraction(interaction);
});
