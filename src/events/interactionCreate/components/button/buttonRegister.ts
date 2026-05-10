import { buttonHandler } from "@/events/interactionCreate/components/button/buttonHandlerInstance";
import { helpPaginationButton } from "@/events/interactionCreate/components/button/items/helpPaginationButton";
import { profileEditButton } from "@/events/interactionCreate/components/button/items/profileEditButton";
import { showcaseAccessoryButton } from "@/events/interactionCreate/components/button/items/showcaseAccessoryButton";

buttonHandler.register(profileEditButton);
buttonHandler.register(helpPaginationButton);
buttonHandler.register(showcaseAccessoryButton);
