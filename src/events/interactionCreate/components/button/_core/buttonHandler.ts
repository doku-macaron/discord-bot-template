import type { ButtonInteraction } from "discord.js";
import { type CustomId, CustomIdHandler, type CustomIdItem } from "@/events/interactionCreate/components/_core/customIdHandler";

export class Button implements CustomIdItem<ButtonInteraction> {
    data: CustomId;

    constructor(
        build: () => CustomId,
        public execute: (interaction: ButtonInteraction) => Promise<void>
    ) {
        this.data = build();
    }
}

export class ButtonHandler extends CustomIdHandler<Button, ButtonInteraction> {
    constructor() {
        super("button", "このボタンは現在受け付けていません。再度お試しください。");
    }
}
