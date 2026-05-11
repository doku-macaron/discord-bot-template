import { LabelBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { CUSTOM_ID } from "@/constants/customIds";
import { Modal } from "@/framework/discord/interactions/components/modal";
import { handleResult } from "@/lib/discord/resultHandler";

export function createProfileEditModal(displayName = ""): ModalBuilder {
    const displayNameInput = new TextInputBuilder()
        .setCustomId(CUSTOM_ID.INPUT.PROFILE_DISPLAY_NAME)
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(80)
        .setValue(displayName);

    return new ModalBuilder()
        .setCustomId(CUSTOM_ID.MODAL.PROFILE_EDIT)
        .setTitle("プロフィール編集")
        .addLabelComponents(new LabelBuilder().setLabel("表示名").setTextInputComponent(displayNameInput));
}

export const profileEditModal = new Modal(
    () => CUSTOM_ID.MODAL.PROFILE_EDIT,
    async (interaction) => {
        if (!interaction.inCachedGuild()) {
            await interaction.reply("このフォームはサーバー内で送信してください。");
            return;
        }

        const displayName = interaction.fields.getTextInputValue(CUSTOM_ID.INPUT.PROFILE_DISPLAY_NAME).trim();

        const { saveMemberProfile } = await import("@/db/query/member/saveMemberProfile");

        const member = await handleResult(
            await saveMemberProfile({
                guildId: interaction.guildId,
                guildName: interaction.guild.name,
                userId: interaction.user.id,
                displayName,
            }),
            interaction,
            {
                category: "Database",
                errorMessage: "プロフィールの保存に失敗しました。",
            }
        );

        if (!member) {
            return;
        }

        await interaction.reply({
            content: `表示名を ${member.displayName} に更新しました。`,
            ephemeral: true,
        });
    }
);
