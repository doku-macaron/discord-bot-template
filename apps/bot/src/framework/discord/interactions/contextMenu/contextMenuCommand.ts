import { ContextMenuCommandBuilder, type ContextMenuCommandInteraction } from "discord.js";
import type { BaseItem } from "@/events/handler";

export class ContextMenuCommand implements BaseItem<ContextMenuCommandBuilder, ContextMenuCommandInteraction> {
    data: ContextMenuCommandBuilder;

    constructor(
        build: (builder: ContextMenuCommandBuilder) => void,
        public execute: (interaction: ContextMenuCommandInteraction) => Promise<void>
    ) {
        const builder = new ContextMenuCommandBuilder();
        build(builder);
        this.data = builder;
    }
}
