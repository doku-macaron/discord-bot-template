// Composition root for the interaction subsystem: collect each kind's handler from
// its registry.ts and compose the framework dispatcher around them.
import { autocompleteHandler } from "@/events/interactionCreate/commands/autocomplete/registry";
import { commandHandler } from "@/events/interactionCreate/commands/chatInput/registry";
import { contextMenuHandler } from "@/events/interactionCreate/commands/contextMenu/registry";
import { buttonHandler } from "@/events/interactionCreate/components/button/registry";
import { modalHandler } from "@/events/interactionCreate/components/modal/registry";
import { menuHandler } from "@/events/interactionCreate/components/selectMenu/registry";
import { createDispatcher, type InteractionHandlers } from "@/framework/discord/interactions/dispatcher";

export const interactionHandlers: InteractionHandlers = {
    autocomplete: autocompleteHandler,
    command: commandHandler,
    contextMenu: contextMenuHandler,
    button: buttonHandler,
    modal: modalHandler,
    menu: menuHandler,
};

export const dispatchInteraction = createDispatcher(interactionHandlers);

// Re-exported for scripts/registerCommand.ts, which reads `restrictedCommands`.
export { commandHandler, contextMenuHandler };
