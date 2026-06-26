import { getUserProfileContextMenu } from "@/events/interactionCreate/commands/contextMenu/items/getUserProfileContextMenu";
import { reportMessageContextMenu } from "@/events/interactionCreate/commands/contextMenu/items/reportMessageContextMenu";
import { ContextMenuHandler } from "@/framework/discord/interactions/contextMenu";

export const contextMenuHandler = new ContextMenuHandler();
contextMenuHandler.register(getUserProfileContextMenu);
contextMenuHandler.register(reportMessageContextMenu);
