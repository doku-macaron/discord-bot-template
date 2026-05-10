// Loading this module wires up all interaction handlers and their items.
// Each *Register module is imported for its side effects (handler.register(...) calls),
// then the corresponding handler singleton is re-exported.
import "@/events/interactionCreate/commands/autocomplete/autocompleteRegister";
import "@/events/interactionCreate/commands/chatInput/commandRegister";
import "@/events/interactionCreate/commands/contextMenu/contextMenuRegister";
import "@/events/interactionCreate/components/button/buttonRegister";
import "@/events/interactionCreate/components/modal/modalRegister";
import "@/events/interactionCreate/components/selectMenu/menuRegister";

export { autocompleteHandler } from "@/events/interactionCreate/commands/autocomplete/autocompleteHandlerInstance";
export { commandHandler } from "@/events/interactionCreate/commands/chatInput/_core/commandHandlerInstance";
export { contextMenuHandler } from "@/events/interactionCreate/commands/contextMenu/contextMenuHandlerInstance";
export { buttonHandler } from "@/events/interactionCreate/components/button/buttonHandlerInstance";
export { modalHandler } from "@/events/interactionCreate/components/modal/modalHandlerInstance";
export { menuHandler } from "@/events/interactionCreate/components/selectMenu/menuHandlerInstance";
