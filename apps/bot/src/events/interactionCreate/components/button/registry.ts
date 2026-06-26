import { helpPaginationButton } from "@/events/interactionCreate/components/button/items/helpPaginationButton";
import { profileEditButton } from "@/events/interactionCreate/components/button/items/profileEditButton";
import { showcaseAccessoryButton } from "@/events/interactionCreate/components/button/items/showcaseAccessoryButton";
import { ButtonHandler } from "@/framework/discord/interactions/components/button";

export const buttonHandler = new ButtonHandler();
buttonHandler.register(profileEditButton);
buttonHandler.register(helpPaginationButton);
buttonHandler.register(showcaseAccessoryButton);
