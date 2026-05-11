import { ApplicationIntegrationType, InteractionContextType, PermissionFlagsBits } from "discord.js";
import { createPollModal } from "@/events/interactionCreate/components/modal/items/pollModal";
import { Command } from "@/framework/discord/interactions/chatInput";

export const pollCommand = new Command(
    (builder) =>
        builder
            .setName("poll")
            .setDescription("モーダルから Discord ネイティブ Poll を作成するサンプル")
            .setContexts(InteractionContextType.Guild)
            .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
            .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
    async (interaction) => {
        await interaction.showModal(createPollModal());
    }
);
