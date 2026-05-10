import { ApplicationIntegrationType, Colors, EmbedBuilder, InteractionContextType, PermissionFlagsBits, userMention } from "discord.js";
import { Command } from "@/events/interactionCreate/commands/chatInput/_core/commandHandler";

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
            .setColor(Colors.Blurple)
            .addFields([
                {
                    name: "Latency",
                    value: `${Date.now() - interaction.createdTimestamp}ms`,
                    inline: true,
                },
                {
                    name: "User",
                    value: userMention(interaction.user.id),
                    inline: true,
                },
            ]);

        await interaction.reply({ embeds: [embed] });
    }
);
