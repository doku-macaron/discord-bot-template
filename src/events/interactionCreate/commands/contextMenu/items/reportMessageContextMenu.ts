import { ApplicationCommandType, ApplicationIntegrationType, InteractionContextType, MessageFlags, userMention } from "discord.js";
import { ContextMenuCommand } from "@/events/interactionCreate/commands/contextMenu/contextMenuHandler";
import { infoEmbed } from "@/lib/embed";

export const reportMessageContextMenu = new ContextMenuCommand(
    (builder) =>
        builder
            .setName("Report message")
            .setType(ApplicationCommandType.Message)
            .setContexts(InteractionContextType.Guild)
            .setIntegrationTypes(ApplicationIntegrationType.GuildInstall),
    async (interaction) => {
        if (!interaction.isMessageContextMenuCommand()) {
            return;
        }

        const message = interaction.targetMessage;
        const embed = infoEmbed("Message reported").addFields([
            { name: "Author", value: userMention(message.author.id), inline: true },
            { name: "Message ID", value: message.id, inline: true },
            { name: "Link", value: message.url },
        ]);

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
);
