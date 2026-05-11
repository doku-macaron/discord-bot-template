import { getUserProfileContextMenu } from "@/events/interactionCreate/commands/contextMenu/items/getUserProfileContextMenu";
import { reportMessageContextMenu } from "@/events/interactionCreate/commands/contextMenu/items/reportMessageContextMenu";
import { contextMenuHandler } from "@/framework/discord/interactions/contextMenu/contextMenuHandlerInstance";

contextMenuHandler.clear();
contextMenuHandler.register(getUserProfileContextMenu);
contextMenuHandler.register(reportMessageContextMenu);
