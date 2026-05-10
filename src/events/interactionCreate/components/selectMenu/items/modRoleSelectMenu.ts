import { MessageFlags, roleMention } from "discord.js";
import { CUSTOM_ID } from "@/constants/customIds";
import { Menu } from "@/events/interactionCreate/components/selectMenu/_core/menuHandler";
import { successEmbed } from "@/lib/embed";

export const modRoleSelectMenu = new Menu(
    () => CUSTOM_ID.SELECT_MENU.MOD_ROLE,
    async (interaction) => {
        if (!interaction.isRoleSelectMenu()) {
            return;
        }

        const roleId = interaction.values[0];
        if (!roleId) {
            await interaction.reply({ content: "ロールが選択されていません。", flags: MessageFlags.Ephemeral });
            return;
        }

        const embed = successEmbed("Mod role updated", `Selected role: ${roleMention(roleId)}`);
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
);
