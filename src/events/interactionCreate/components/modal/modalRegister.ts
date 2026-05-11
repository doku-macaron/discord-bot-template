import { pollModal } from "@/events/interactionCreate/components/modal/items/pollModal";
import { profileEditModal } from "@/events/interactionCreate/components/modal/items/profileEditModal";
import { showcaseModalV2 } from "@/events/interactionCreate/components/modal/items/showcaseModalV2";
import { modalHandler } from "@/framework/discord/interactions/components/modal";

modalHandler.register(profileEditModal);
modalHandler.register(showcaseModalV2);
modalHandler.register(pollModal);
