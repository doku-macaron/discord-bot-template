import { type ButtonInteraction, MessageFlags } from "discord.js";
import type { BaseItem, Handler } from "@/events/handler";
import { buildInteractionContext } from "@/lib/interactionContext";
import { logger } from "@/lib/logger";

type CustomId = string | RegExp;

export class Button implements BaseItem<CustomId, ButtonInteraction> {
    data: CustomId;

    constructor(
        build: () => CustomId,
        public execute: (interaction: ButtonInteraction) => Promise<void>
    ) {
        this.data = build();
    }
}

export class ButtonHandler implements Handler<Button, ButtonInteraction> {
    private buttonHandlers = new Map<CustomId, Button>();

    get handlers() {
        return Array.from(this.buttonHandlers.values());
    }

    register(button: Button) {
        this.buttonHandlers.set(button.data, button);
    }

    get(customId: string): Button | undefined {
        for (const [registeredId, button] of this.buttonHandlers) {
            if (typeof registeredId === "string" && registeredId === customId) {
                return button;
            }
            if (registeredId instanceof RegExp && registeredId.test(customId)) {
                return button;
            }
        }

        return undefined;
    }

    async execute(interaction: ButtonInteraction) {
        const button = this.get(interaction.customId);
        if (button) {
            await button.execute(interaction);
            return;
        }

        logger.warn("Bot", `Unregistered button customId: ${interaction.customId}`);
        if (!(interaction.replied || interaction.deferred)) {
            try {
                await interaction.reply({
                    content: "このボタンは現在受け付けていません。再度お試しください。",
                    flags: MessageFlags.Ephemeral,
                });
            } catch (error) {
                logger.error("Bot", error instanceof Error ? error : new Error(String(error)), buildInteractionContext(interaction));
            }
        }
    }
}
