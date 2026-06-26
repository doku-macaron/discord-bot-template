import { MessageFlags, roleMention } from "discord.js";
import { CUSTOM_ID } from "@/constants/customIds";
import { Menu } from "@/framework/discord/interactions/components/selectMenu";
import { successEmbed } from "@/lib/discord/embed";
import { handleResult } from "@/lib/discord/resultHandler";

export const modRoleSelectMenu = new Menu(
    () => CUSTOM_ID.SELECT_MENU.MOD_ROLE,
    async (interaction) => {
        if (!interaction.isRoleSelectMenu()) {
            return;
        }
        if (!interaction.inCachedGuild()) {
            await interaction.reply({ content: "サーバー内で操作してください。", flags: MessageFlags.Ephemeral });
            return;
        }

        const roleId = interaction.values[0];
        if (!roleId) {
            await interaction.reply({ content: "ロールが選択されていません。", flags: MessageFlags.Ephemeral });
            return;
        }

        const { updateGuildSettingsUseCase } = await import("@/usecases/guild/updateGuildSettingsUseCase");

        const settings = await handleResult(
            await updateGuildSettingsUseCase({
                guildId: interaction.guildId,
                settings: { modRoleId: roleId },
            }),
            interaction,
            {
                category: "Database",
                errorMessage: "Mod role の保存に失敗しました。",
            }
        );

        if (!settings) {
            return;
        }

        const embed = successEmbed("Mod role updated", `Selected role: ${roleMention(roleId)}`);
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
);
