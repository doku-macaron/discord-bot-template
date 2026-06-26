import { channelMention, MessageFlags } from "discord.js";
import { CUSTOM_ID } from "@/constants/customIds";
import { Menu } from "@/framework/discord/interactions/components/selectMenu";
import { successEmbed } from "@/lib/discord/embed";
import { handleResult } from "@/lib/discord/resultHandler";

export const archiveChannelSelectMenu = new Menu(
    () => CUSTOM_ID.SELECT_MENU.ARCHIVE_CHANNEL,
    async (interaction) => {
        if (!interaction.isChannelSelectMenu()) {
            return;
        }
        if (!interaction.inCachedGuild()) {
            await interaction.reply({ content: "サーバー内で操作してください。", flags: MessageFlags.Ephemeral });
            return;
        }

        const channelId = interaction.values[0];
        if (!channelId) {
            await interaction.reply({ content: "チャンネルが選択されていません。", flags: MessageFlags.Ephemeral });
            return;
        }

        const { updateGuildSettingsUseCase } = await import("@/usecases/guild/updateGuildSettingsUseCase");

        const settings = await handleResult(
            await updateGuildSettingsUseCase({
                guildId: interaction.guildId,
                settings: { archiveChannelId: channelId },
            }),
            interaction,
            {
                category: "Database",
                errorMessage: "Archive channel の保存に失敗しました。",
            }
        );

        if (!settings) {
            return;
        }

        const embed = successEmbed("Archive channel updated", `Selected channel: ${channelMention(channelId)}`);
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
);
