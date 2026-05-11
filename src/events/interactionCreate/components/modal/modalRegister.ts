import { pollModal } from "@/events/interactionCreate/components/modal/items/pollModal";
import { profileEditModal } from "@/events/interactionCreate/components/modal/items/profileEditModal";
import { modalHandler } from "@/framework/discord/interactions/components/modal";

modalHandler.register(profileEditModal);
modalHandler.register(pollModal);
