import { MessageFlags } from "discord.js";
import { CUSTOM_ID } from "@/constants/customIds";
import { Menu } from "@/events/interactionCreate/components/selectMenu/menuHandler";
import { infoEmbed } from "@/lib/embed";

export const reportUserSelectMenu = new Menu(
    () => CUSTOM_ID.SELECT_MENU.REPORT_USER,
    async (interaction) => {
        if (!interaction.isUserSelectMenu()) {
            return;
        }

        const userId = interaction.values[0];
        if (!userId) {
            await interaction.reply({ content: "ユーザーが選択されていません。", flags: MessageFlags.Ephemeral });
            return;
        }

        const embed = infoEmbed("Report received").addFields([
            { name: "Target", value: `<@${userId}>`, inline: true },
            { name: "Reported by", value: `<@${interaction.user.id}>`, inline: true },
        ]);
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
);
