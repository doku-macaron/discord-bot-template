import { buttonHandler } from "@/events/interactionCreate/components/button/buttonHandlerInstance";
import { helpPaginationButton } from "@/events/interactionCreate/components/button/items/helpPaginationButton";
import { profileEditButton } from "@/events/interactionCreate/components/button/items/profileEditButton";

buttonHandler.register(profileEditButton);
buttonHandler.register(helpPaginationButton);
