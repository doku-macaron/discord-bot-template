import { CUSTOM_ID } from "@/constants/customIds";
import { Button } from "@/events/interactionCreate/components/button/buttonHandler";
import { createProfileEditModal } from "@/events/interactionCreate/components/modal/items/profileEditModal";

export const profileEditButton = new Button(
    () => CUSTOM_ID.BUTTON.PROFILE_EDIT,
    async (interaction) => {
        if (!interaction.inCachedGuild()) {
            await interaction.reply("このボタンはサーバー内で使用してください。");
            return;
        }

        await interaction.showModal(createProfileEditModal(interaction.member.displayName));
    }
);
