import { ApplicationIntegrationType, EmbedBuilder, InteractionContextType, PermissionFlagsBits } from "discord.js";
import { Command } from "@/events/interactionCreate/commands/chatInput/commandHandler";

export const pingCommand = new Command(
    (builder) =>
        builder
            .setName("ping")
            .setDescription("Bot の応答を確認します")
            .setContexts(InteractionContextType.Guild)
            .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
            .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
    async (interaction) => {
        const embed = new EmbedBuilder()
            .setTitle("Pong!")
            .setColor(0x5865f2)
            .addFields([
                {
                    name: "Latency",
                    value: `${Date.now() - interaction.createdTimestamp}ms`,
                    inline: true,
                },
                {
                    name: "User",
                    value: `<@${interaction.user.id}>`,
                    inline: true,
                },
            ]);

        await interaction.reply({ embeds: [embed] });
    }
);
