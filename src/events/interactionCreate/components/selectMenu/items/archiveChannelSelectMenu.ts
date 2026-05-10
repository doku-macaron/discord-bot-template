import { channelMention, MessageFlags } from "discord.js";
import { CUSTOM_ID } from "@/constants/customIds";
import { Menu } from "@/events/interactionCreate/components/selectMenu/_core/menuHandler";
import { successEmbed } from "@/lib/discord/embed";

export const archiveChannelSelectMenu = new Menu(
    () => CUSTOM_ID.SELECT_MENU.ARCHIVE_CHANNEL,
    async (interaction) => {
        if (!interaction.isChannelSelectMenu()) {
            return;
        }

        const channelId = interaction.values[0];
        if (!channelId) {
            await interaction.reply({ content: "チャンネルが選択されていません。", flags: MessageFlags.Ephemeral });
            return;
        }

        const embed = successEmbed("Archive channel updated", `Selected channel: ${channelMention(channelId)}`);
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
);
