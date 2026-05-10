import { MessageFlags, type ModalSubmitInteraction } from "discord.js";
import type { BaseItem, Handler } from "@/events/handler";
import { buildInteractionContext } from "@/lib/interactionContext";
import { logger } from "@/lib/logger";

type CustomId = string | RegExp;

export class Modal implements BaseItem<CustomId, ModalSubmitInteraction> {
    data: CustomId;

    constructor(
        build: () => CustomId,
        public execute: (interaction: ModalSubmitInteraction) => Promise<void>
    ) {
        this.data = build();
    }
}

export class ModalHandler implements Handler<Modal, ModalSubmitInteraction> {
    private modalHandlers = new Map<string, Modal>();
    private regexHandlers: Array<Modal> = [];

    get handlers() {
        return [...Array.from(this.modalHandlers.values()), ...this.regexHandlers];
    }

    register(modal: Modal) {
        if (modal.data instanceof RegExp) {
            this.regexHandlers.push(modal);
            return;
        }

        this.modalHandlers.set(modal.data, modal);
    }

    get(customId: string): Modal | undefined {
        const exactMatch = this.modalHandlers.get(customId);
        if (exactMatch) {
            return exactMatch;
        }

        return this.regexHandlers.find((modal) => (modal.data as RegExp).test(customId));
    }

    async execute(interaction: ModalSubmitInteraction) {
        const modal = this.get(interaction.customId);
        if (modal) {
            await modal.execute(interaction);
            return;
        }

        logger.warn("Bot", `Unregistered modal customId: ${interaction.customId}`);
        if (!(interaction.replied || interaction.deferred)) {
            try {
                await interaction.reply({
                    content: "このフォームは現在受け付けていません。再度お試しください。",
                    flags: MessageFlags.Ephemeral,
                });
            } catch (error) {
                logger.error("Bot", error instanceof Error ? error : new Error(String(error)), buildInteractionContext(interaction));
            }
        }
    }
}
