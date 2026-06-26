// Loading this module wires up all interaction handlers and their items,
// then composes the framework dispatcher around the registered handler singletons.
import "@/events/interactionCreate/commands/autocomplete/autocompleteRegister";
import "@/events/interactionCreate/commands/chatInput/commandRegister";
import "@/events/interactionCreate/commands/contextMenu/contextMenuRegister";
import "@/events/interactionCreate/components/button/buttonRegister";
import "@/events/interactionCreate/components/modal/modalRegister";
import "@/events/interactionCreate/components/selectMenu/menuRegister";

import { autocompleteHandler } from "@/framework/discord/interactions/autocomplete";
import { commandHandler } from "@/framework/discord/interactions/chatInput";
import { buttonHandler } from "@/framework/discord/interactions/components/button";
import { modalHandler } from "@/framework/discord/interactions/components/modal";
import { menuHandler } from "@/framework/discord/interactions/components/selectMenu";
import { contextMenuHandler } from "@/framework/discord/interactions/contextMenu";
import { createDispatcher } from "@/framework/discord/interactions/dispatcher";

export const dispatchInteraction = createDispatcher({
    autocomplete: autocompleteHandler,
    command: commandHandler,
    contextMenu: contextMenuHandler,
    button: buttonHandler,
    modal: modalHandler,
    menu: menuHandler,
});

// Re-exported for scripts/registerCommand.ts, which reads `restrictedCommands`
// after this module's side-effectful imports have populated each handler.
export { commandHandler, contextMenuHandler };
