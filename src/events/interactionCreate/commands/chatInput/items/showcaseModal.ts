import { ApplicationIntegrationType, InteractionContextType } from "discord.js";
import { createShowcaseModalV2 } from "@/events/interactionCreate/components/modal/items/showcaseModalV2";
import { Command } from "@/framework/discord/interactions/chatInput";

export const showcaseModalCommand = new Command(
    (builder) =>
        builder
            .setName("showcase-modal")
            .setDescription("Modal v2 のリファレンス実装 (Checkbox / RadioGroup / CheckboxGroup / FileUpload)")
            .setContexts(InteractionContextType.Guild)
            .setIntegrationTypes(ApplicationIntegrationType.GuildInstall),
    async (interaction) => {
        await interaction.showModal(createShowcaseModalV2());
    }
);
