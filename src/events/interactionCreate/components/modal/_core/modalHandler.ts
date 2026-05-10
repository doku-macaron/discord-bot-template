import type { ModalSubmitInteraction } from "discord.js";
import { type CustomId, CustomIdHandler, type CustomIdItem } from "@/events/interactionCreate/components/_core/customIdHandler";

export class Modal implements CustomIdItem<ModalSubmitInteraction> {
    data: CustomId;

    constructor(
        build: () => CustomId,
        public execute: (interaction: ModalSubmitInteraction) => Promise<void>
    ) {
        this.data = build();
    }
}

export class ModalHandler extends CustomIdHandler<Modal, ModalSubmitInteraction> {
    constructor() {
        super("modal", "このフォームは現在受け付けていません。再度お試しください。");
    }
}
