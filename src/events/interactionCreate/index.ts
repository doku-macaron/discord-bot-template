import { type ClientEvents, type Events, type InteractionReplyOptions, MessageFlags } from "discord.js";
import { commandHandler } from "@/events/interactionCreate/command/commandHandlerInstance";

export const interactionCreateEvent: (...args: ClientEvents[Events.InteractionCreate]) => void = async (interaction) => {
    if (!interaction.isChatInputCommand()) {
        return;
    }

    try {
        await commandHandler.execute(interaction);
    } catch (error) {
        console.error(error);

        const payload: InteractionReplyOptions = {
            content: "エラーが発生しました。時間をおいて再度お試しください。",
            flags: MessageFlags.Ephemeral,
        };

        if (interaction.deferred || interaction.replied) {
            await interaction.followUp(payload);
            return;
        }

        await interaction.reply(payload);
    }
};
