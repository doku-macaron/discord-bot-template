import { LabelBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { CUSTOM_ID } from "@/constants/customIds";
import { Modal } from "@/framework/discord/interactions/components/modal";
import { handleResult } from "@/lib/discord/resultHandler";

const BIO_MAX_LENGTH = 200;

export function createProfileEditModal(bio = ""): ModalBuilder {
    const bioInput = new TextInputBuilder()
        .setCustomId(CUSTOM_ID.INPUT.PROFILE_BIO)
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(BIO_MAX_LENGTH)
        .setValue(bio);

    return new ModalBuilder()
        .setCustomId(CUSTOM_ID.MODAL.PROFILE_EDIT)
        .setTitle("プロフィール編集")
        .addLabelComponents(new LabelBuilder().setLabel("自己紹介").setTextInputComponent(bioInput));
}

export const profileEditModal = new Modal(
    () => CUSTOM_ID.MODAL.PROFILE_EDIT,
    async (interaction) => {
        if (!interaction.inCachedGuild()) {
            await interaction.reply("このフォームはサーバー内で送信してください。");
            return;
        }

        const bio = interaction.fields.getTextInputValue(CUSTOM_ID.INPUT.PROFILE_BIO).trim();

        const { saveMemberProfileUseCase } = await import("@/usecases/member/saveMemberProfileUseCase");

        const profile = await handleResult(
            await saveMemberProfileUseCase({
                guildId: interaction.guildId,
                userId: interaction.user.id,
                bio,
            }),
            interaction,
            {
                category: "Database",
                errorMessage: "プロフィールの保存に失敗しました。",
            }
        );

        if (!profile) {
            return;
        }

        await interaction.reply({
            content: profile.bio ? `自己紹介を更新しました。` : "自己紹介をクリアしました。",
            ephemeral: true,
        });
    }
);
