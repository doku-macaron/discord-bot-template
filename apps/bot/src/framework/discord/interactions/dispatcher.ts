import { type Interaction, MessageFlags } from "discord.js";
import type { AutocompleteHandler } from "@/framework/discord/interactions/autocomplete";
import type { CommandHandler } from "@/framework/discord/interactions/chatInput";
import type { ButtonHandler } from "@/framework/discord/interactions/components/button";
import type { ModalHandler } from "@/framework/discord/interactions/components/modal";
import type { MenuHandler } from "@/framework/discord/interactions/components/selectMenu";
import type { ContextMenuHandler } from "@/framework/discord/interactions/contextMenu";
import { buildInteractionContext } from "@/lib/discord/interactionContext";
import { replyError } from "@/lib/discord/replyError";
import { logger } from "@/lib/infra/logger";
import { isShuttingDown, trackInflight } from "@/lib/infra/shutdown";

export type InteractionHandlers = {
    autocomplete: AutocompleteHandler;
    command: CommandHandler;
    contextMenu: ContextMenuHandler;
    button: ButtonHandler;
    modal: ModalHandler;
    menu: MenuHandler;
};

export function createDispatcher(handlers: InteractionHandlers): (interaction: Interaction) => void {
    return (interaction) => {
        if (isShuttingDown()) {
            if (interaction.isRepliable()) {
                void interaction
                    .reply({
                        content: "Bot is shutting down. Please try again shortly.",
                        flags: MessageFlags.Ephemeral,
                    })
                    .catch((replyErrorUnknown: unknown) => {
                        const error = replyErrorUnknown instanceof Error ? replyErrorUnknown : new Error(String(replyErrorUnknown));
                        logger.error("Bot", error, buildInteractionContext(interaction));
                    });
            }
            return;
        }

        void trackInflight(async () => {
            try {
                if (interaction.isButton()) {
                    await handlers.button.execute(interaction);
                    return;
                }
                if (interaction.isModalSubmit()) {
                    await handlers.modal.execute(interaction);
                    return;
                }
                if (interaction.isAnySelectMenu()) {
                    await handlers.menu.execute(interaction);
                    return;
                }
                if (interaction.isChatInputCommand()) {
                    await handlers.command.execute(interaction);
                    return;
                }
                if (interaction.isContextMenuCommand()) {
                    await handlers.contextMenu.execute(interaction);
                    return;
                }
                if (interaction.isAutocomplete()) {
                    await handlers.autocomplete.execute(interaction);
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
                        const replyFallbackError =
                            replyErrorUnknown instanceof Error ? replyErrorUnknown : new Error(String(replyErrorUnknown));
                        logger.error("Bot", replyFallbackError, context);
                    }
                }
            }
        });
    };
}
