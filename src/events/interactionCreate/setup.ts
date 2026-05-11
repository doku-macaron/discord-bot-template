// Loading this module wires up all interaction handlers and their items.
// Each *Register module is imported for its side effects (handler.register(...) calls),
// then the corresponding handler singleton is re-exported.
import "@/events/interactionCreate/commands/autocomplete/autocompleteRegister";
import "@/events/interactionCreate/commands/chatInput/commandRegister";
import "@/events/interactionCreate/commands/contextMenu/contextMenuRegister";
import "@/events/interactionCreate/components/button/buttonRegister";
import "@/events/interactionCreate/components/modal/modalRegister";
import "@/events/interactionCreate/components/selectMenu/menuRegister";

export { autocompleteHandler } from "@/framework/discord/interactions/autocomplete";
export { commandHandler } from "@/framework/discord/interactions/chatInput";
export { buttonHandler } from "@/framework/discord/interactions/components/button";
export { modalHandler } from "@/framework/discord/interactions/components/modal";
export { menuHandler } from "@/framework/discord/interactions/components/selectMenu";
export { contextMenuHandler } from "@/framework/discord/interactions/contextMenu";
