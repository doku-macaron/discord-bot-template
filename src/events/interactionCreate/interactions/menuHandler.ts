import { type AnySelectMenuInteraction, MessageFlags } from "discord.js";
import type { BaseItem, Handler } from "@/events/handler";
import { buildInteractionContext } from "@/lib/interactionContext";
import { logger } from "@/lib/logger";

type CustomId = string | RegExp;

export class Menu implements BaseItem<CustomId, AnySelectMenuInteraction> {
    data: CustomId;

    constructor(
        build: () => CustomId,
        public execute: (interaction: AnySelectMenuInteraction) => Promise<void>
    ) {
        this.data = build();
    }
}

export class MenuHandler implements Handler<Menu, AnySelectMenuInteraction> {
    private menuHandlers = new Map<CustomId, Menu>();

    get handlers() {
        return Array.from(this.menuHandlers.values());
    }

    register(menu: Menu) {
        this.menuHandlers.set(menu.data, menu);
    }

    get(customId: string): Menu | undefined {
        for (const [registeredId, menu] of this.menuHandlers) {
            if (typeof registeredId === "string" && registeredId === customId) {
                return menu;
            }
            if (registeredId instanceof RegExp && registeredId.test(customId)) {
                return menu;
            }
        }

        return undefined;
    }

    async execute(interaction: AnySelectMenuInteraction) {
        const menu = this.get(interaction.customId);
        if (menu) {
            await menu.execute(interaction);
            return;
        }

        logger.warn("Bot", `Unregistered menu customId: ${interaction.customId}`);
        if (!(interaction.replied || interaction.deferred)) {
            try {
                await interaction.reply({
                    content: "このメニューは現在受け付けていません。再度お試しください。",
                    flags: MessageFlags.Ephemeral,
                });
            } catch (error) {
                logger.error("Bot", error instanceof Error ? error : new Error(String(error)), buildInteractionContext(interaction));
            }
        }
    }
}
