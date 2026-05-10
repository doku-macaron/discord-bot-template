import { type Interaction, MessageFlags, type RepliableInteraction } from "discord.js";
import type { BaseItem, Handler } from "@/events/handler";
import { buildInteractionContext } from "@/lib/interactionContext";
import { logger } from "@/lib/logger";

export type CustomId = string | RegExp;
type CustomIdInteraction = Interaction & RepliableInteraction & { customId: string };

export interface CustomIdItem<I extends CustomIdInteraction> extends BaseItem<CustomId, I> {}

export class CustomIdHandler<T extends CustomIdItem<I>, I extends CustomIdInteraction> implements Handler<T, I> {
    private exactHandlers = new Map<string, T>();
    private regexHandlers: Array<T> = [];

    constructor(
        private interactionName: string,
        private unavailableMessage: string
    ) {}

    get handlers() {
        return [...Array.from(this.exactHandlers.values()), ...this.regexHandlers];
    }

    register(item: T) {
        if (item.data instanceof RegExp) {
            this.regexHandlers.push(item);
            return;
        }

        this.exactHandlers.set(item.data, item);
    }

    get(customId: string): T | undefined {
        const exactMatch = this.exactHandlers.get(customId);
        if (exactMatch) {
            return exactMatch;
        }

        return this.regexHandlers.find((item) => (item.data as RegExp).test(customId));
    }

    async execute(interaction: I) {
        const item = this.get(interaction.customId);
        if (item) {
            await item.execute(interaction);
            return;
        }

        logger.warn("Bot", `Unregistered ${this.interactionName} customId: ${interaction.customId}`);
        if (interaction.replied || interaction.deferred) {
            return;
        }

        try {
            await interaction.reply({
                content: this.unavailableMessage,
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
            logger.error("Bot", error instanceof Error ? error : new Error(String(error)), buildInteractionContext(interaction));
        }
    }
}
