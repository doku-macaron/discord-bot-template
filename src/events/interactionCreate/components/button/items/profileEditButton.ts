import { CUSTOM_ID } from "@/constants/customIds";
import { createProfileEditModal } from "@/events/interactionCreate/components/modal/items/profileEditModal";
import { Button } from "@/framework/discord/interactions/components/button/buttonHandler";

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
