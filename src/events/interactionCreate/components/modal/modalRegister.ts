import { profileEditModal } from "@/events/interactionCreate/components/modal/items/profileEditModal";
import { modalHandler } from "@/framework/discord/interactions/components/modal/modalHandlerInstance";

modalHandler.register(profileEditModal);
