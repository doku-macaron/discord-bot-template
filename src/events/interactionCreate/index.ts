import { type ClientEvents, type Events, MessageFlags } from "discord.js";
import {
    autocompleteHandler,
    buttonHandler,
    commandHandler,
    contextMenuHandler,
    menuHandler,
    modalHandler,
} from "@/events/interactionCreate/setup";
import { buildInteractionContext } from "@/lib/discord/interactionContext";
import { replyError } from "@/lib/discord/replyError";
import { logger } from "@/lib/infra/logger";
import { isShuttingDown, trackInflight } from "@/lib/infra/shutdown";

export const interactionCreateEvent: (...args: ClientEvents[Events.InteractionCreate]) => void = (interaction) => {
    if (isShuttingDown()) {
        if (interaction.isRepliable()) {
            void interaction
                .reply({
                    content: "Bot is shutting down. Please try again shortly.",
                    flags: MessageFlags.Ephemeral,
                })
                .catch((replyErrorUnknown: unknown) => {
                    const replyError = replyErrorUnknown instanceof Error ? replyErrorUnknown : new Error(String(replyErrorUnknown));
                    logger.error("Bot", replyError, buildInteractionContext(interaction));
                });
        }
        return;
    }

    trackInflight(async () => {
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
            if (interaction.isContextMenuCommand()) {
                await contextMenuHandler.execute(interaction);
                return;
            }
            if (interaction.isAutocomplete()) {
                await autocompleteHandler.execute(interaction);
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
    });
};
