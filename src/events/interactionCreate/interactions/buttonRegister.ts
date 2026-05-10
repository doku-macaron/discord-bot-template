import { ButtonHandler } from "@/events/interactionCreate/interactions/buttonHandler";
import { profileEditButton } from "@/events/interactionCreate/interactions/buttons/profileEditButton";

export const buttonHandler = new ButtonHandler();

buttonHandler.register(profileEditButton);
