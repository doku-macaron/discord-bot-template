import "@/events/interactionCreate/command/commandRegister";

import type { ClientEvents, Events } from "discord.js";
import { commandHandler } from "@/events/interactionCreate/command/commandHandlerInstance";
import { buttonHandler } from "@/events/interactionCreate/interactions/buttonRegister";
import { menuHandler } from "@/events/interactionCreate/interactions/menuRegister";
import { modalHandler } from "@/events/interactionCreate/interactions/modalRegister";
import { buildInteractionContext } from "@/lib/interactionContext";
import { logger } from "@/lib/logger";
import { replyError } from "@/lib/replyError";

export const interactionCreateEvent: (...args: ClientEvents[Events.InteractionCreate]) => void = async (interaction) => {
    try {
        if (interaction.isButton()) {
            await buttonHandler.execute(interaction);
            return;
        }
        if (interaction.isModalSubmit()) {
            await modalHandler.execute(interaction);
            return;
        }
        if (interaction.isAnySelectMenu()) {
            await menuHandler.execute(interaction);
            return;
        }
        if (interaction.isChatInputCommand()) {
            await commandHandler.execute(interaction);
            return;
        }

        throw new Error(`Unhandled interaction type: ${interaction.type}`);
    } catch (unknownError) {
        const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
        const context = buildInteractionContext(interaction);

        logger.error("Bot", error, context);

        if (interaction.isRepliable()) {
            try {
                await replyError(interaction, error, context);
            } catch (replyErrorUnknown) {
                const replyError = replyErrorUnknown instanceof Error ? replyErrorUnknown : new Error(String(replyErrorUnknown));
                logger.error("Bot", replyError, context);
            }
        }
    }
};
