import { LabelBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { CUSTOM_ID } from "@/constants/customIds";
import { Modal } from "@/events/interactionCreate/interactions/modalHandler";

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

        const { getOrCreateGuild } = await import("@/db/query/guild/getOrCreateGuild");
        const { getOrCreateMember } = await import("@/db/query/member/getOrCreateMember");

        await getOrCreateGuild({
            guildId: interaction.guildId,
            name: interaction.guild.name,
        });
        const member = await getOrCreateMember({
            guildId: interaction.guildId,
            userId: interaction.user.id,
            displayName,
        });

        await interaction.reply({
            content: `表示名を ${member.displayName} に更新しました。`,
            ephemeral: true,
        });
    }
);
