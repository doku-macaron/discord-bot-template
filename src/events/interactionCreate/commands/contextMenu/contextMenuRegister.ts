import { contextMenuHandler } from "@/events/interactionCreate/commands/contextMenu/contextMenuHandlerInstance";
import { getUserProfileContextMenu } from "@/events/interactionCreate/commands/contextMenu/items/getUserProfileContextMenu";

contextMenuHandler.clear();
contextMenuHandler.register(getUserProfileContextMenu);
