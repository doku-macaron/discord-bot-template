import { ApplicationIntegrationType, InteractionContextType, PermissionFlagsBits } from "discord.js";
import { Command } from "@/events/interactionCreate/commands/chatInput/_core/commandHandler";

export const echoCommand = new Command(
    (builder) =>
        builder
            .setName("echo")
            .setDescription("入力した内容を返します (autocomplete サンプル)")
            .setContexts(InteractionContextType.Guild)
            .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
            .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
            .addStringOption((option) =>
                option.setName("message").setDescription("送信するメッセージ").setAutocomplete(true).setRequired(true)
            ),
    async (interaction) => {
        const message = interaction.options.getString("message", true);
        await interaction.reply({ content: message });
    }
);
