import type { AutocompleteInteraction } from "discord.js";
import type { BaseItem, Handler } from "@/events/handler";
import { logger } from "@/lib/logger";

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
            await interaction.respond([]);
            return;
        }
        await item.execute(interaction);
    }
}
