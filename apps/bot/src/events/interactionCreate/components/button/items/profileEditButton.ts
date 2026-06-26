import { CUSTOM_ID } from "@/constants/customIds";
import { findMemberProfile } from "@/db/query/member/findMemberProfile";
import { createProfileEditModal } from "@/events/interactionCreate/components/modal/items/profileEditModal";
import { Button } from "@/framework/discord/interactions/components/button";

export const profileEditButton = new Button(
    () => CUSTOM_ID.BUTTON.PROFILE_EDIT,
    async (interaction) => {
        if (!interaction.inCachedGuild()) {
            await interaction.reply("このボタンはサーバー内で使用してください。");
            return;
        }

        const profile = await findMemberProfile({
            guildId: interaction.guildId,
            userId: interaction.user.id,
        });
        await interaction.showModal(createProfileEditModal(profile?.bio ?? ""));
    }
);
