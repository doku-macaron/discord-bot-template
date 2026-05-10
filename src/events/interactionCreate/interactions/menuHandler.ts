import type { AnySelectMenuInteraction } from "discord.js";
import { type CustomId, CustomIdHandler, type CustomIdItem } from "@/events/interactionCreate/interactions/customIdHandler";

export class Menu implements CustomIdItem<AnySelectMenuInteraction> {
    data: CustomId;

    constructor(
        build: () => CustomId,
        public execute: (interaction: AnySelectMenuInteraction) => Promise<void>
    ) {
        this.data = build();
    }
}

export class MenuHandler extends CustomIdHandler<Menu, AnySelectMenuInteraction> {
    constructor() {
        super("menu", "このメニューは現在受け付けていません。再度お試しください。");
    }
}
