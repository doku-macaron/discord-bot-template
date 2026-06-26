import type { AutocompleteInteraction } from "discord.js";
import type { BaseItem, Handler } from "@/events/handler";
import { buildInteractionContext } from "@/lib/discord/interactionContext";
import { logger } from "@/lib/infra/logger";

export class Autocomplete implements BaseItem<string, AutocompleteInteraction> {
    data: string;

    constructor(
        commandName: string,
        public execute: (interaction: AutocompleteInteraction) => Promise<void>
    ) {
        this.data = commandName;
    }
}

export class AutocompleteHandler implements Handler<Autocomplete, AutocompleteInteraction, string> {
    private items = new Map<string, Autocomplete>();

    get handlers() {
        return Array.from(this.items.values());
    }

    register(item: Autocomplete) {
        this.items.set(item.data, item);
    }

    get(commandName: string): Autocomplete | undefined {
        return this.items.get(commandName);
    }

    async execute(interaction: AutocompleteInteraction) {
        const item = this.get(interaction.commandName);
        if (!item) {
            logger.warn("Bot", `Unregistered autocomplete command: ${interaction.commandName}`);
            await this.respondEmpty(interaction);
            return;
        }

        try {
            await item.execute(interaction);
        } catch (unknownError) {
            const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
            logger.error("Bot", error, buildInteractionContext(interaction));
            await this.respondEmpty(interaction);
        }
    }

    private async respondEmpty(interaction: AutocompleteInteraction): Promise<void> {
        if (interaction.responded) {
            return;
        }
        try {
            await interaction.respond([]);
        } catch (unknownError) {
            const respondError = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
            logger.warn("Bot", `Failed to respond to autocomplete: ${respondError.message}`);
        }
    }
}
