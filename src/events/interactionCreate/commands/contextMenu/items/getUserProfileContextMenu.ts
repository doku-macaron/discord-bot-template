import { ApplicationCommandType, ApplicationIntegrationType, InteractionContextType, MessageFlags, userMention } from "discord.js";
import { ContextMenuCommand } from "@/events/interactionCreate/commands/contextMenu/_core/contextMenuHandler";
import { infoEmbed } from "@/lib/discord/embed";

export const getUserProfileContextMenu = new ContextMenuCommand(
    (builder) =>
        builder
            .setName("Get user profile")
            .setType(ApplicationCommandType.User)
            .setContexts(InteractionContextType.Guild)
            .setIntegrationTypes(ApplicationIntegrationType.GuildInstall),
    async (interaction) => {
        if (!interaction.isUserContextMenuCommand()) {
            return;
        }

        const target = interaction.targetUser;
        const embed = infoEmbed(`Profile of ${target.username}`).addFields([
            { name: "User", value: userMention(target.id), inline: true },
            { name: "ID", value: target.id, inline: true },
        ]);

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
);
