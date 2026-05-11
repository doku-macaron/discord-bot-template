import { MessageFlags } from "discord.js";
import { CUSTOM_ID } from "@/constants/customIds";
import { buildHelpPage, HELP_PAGES } from "@/events/interactionCreate/commands/chatInput/items/help";
import { Menu } from "@/framework/discord/interactions/components/selectMenu";

export const helpSectionSelectMenu = new Menu(
    () => CUSTOM_ID.SELECT_MENU.HELP_SECTION,
    async (interaction) => {
        if (!interaction.isStringSelectMenu()) {
            return;
        }

        const selected = interaction.values[0];
        if (!selected) {
            await interaction.reply({ content: "セクションが選択されていません。", flags: MessageFlags.Ephemeral });
            return;
        }

        const targetIndex = HELP_PAGES.findIndex((section) => section.title === selected);
        const { embed, row, selectRow } = buildHelpPage(targetIndex < 0 ? 0 : targetIndex);
        await interaction.update({ embeds: [embed], components: [row, selectRow] });
    }
);
