import { ApplicationIntegrationType, InteractionContextType, PermissionFlagsBits } from "discord.js";
import { createTimerModal } from "@/events/interactionCreate/components/modal/items/timerModal";
import { Command } from "@/framework/discord/interactions/chatInput";

export const timerCommand = new Command(
    (builder) =>
        builder
            .setName("timer")
            .setDescription("経過時間 or 指定時刻でリマインダーを設定するサンプル")
            .setContexts(InteractionContextType.Guild)
            .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
            .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
    async (interaction) => {
        await interaction.showModal(createTimerModal());
    }
);
