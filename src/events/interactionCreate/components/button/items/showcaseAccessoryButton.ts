import { MessageFlags } from "discord.js";
import { CUSTOM_ID } from "@/constants/customIds";
import { Button } from "@/events/interactionCreate/components/button/buttonHandler";

export const showcaseAccessoryButton = new Button(
    () => CUSTOM_ID.BUTTON.SHOWCASE_ACCESSORY,
    async (interaction) => {
        await interaction.reply({
            content: "Hello from the section accessory button!",
            flags: MessageFlags.Ephemeral,
        });
    }
);
