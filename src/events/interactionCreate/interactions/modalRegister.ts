import { ModalHandler } from "@/events/interactionCreate/interactions/modalHandler";
import { profileEditModal } from "@/events/interactionCreate/interactions/modals/profileEditModal";

export const modalHandler = new ModalHandler();

modalHandler.register(profileEditModal);
