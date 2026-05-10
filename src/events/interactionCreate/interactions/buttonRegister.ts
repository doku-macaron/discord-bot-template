import { ButtonHandler } from "@/events/interactionCreate/interactions/buttonHandler";
import { helpPaginationButton } from "@/events/interactionCreate/interactions/buttons/helpPaginationButton";
import { profileEditButton } from "@/events/interactionCreate/interactions/buttons/profileEditButton";

export const buttonHandler = new ButtonHandler();

buttonHandler.register(profileEditButton);
buttonHandler.register(helpPaginationButton);
