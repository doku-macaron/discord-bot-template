import { contextMenuHandler } from "@/events/interactionCreate/command/contextMenuHandlerInstance";
import { getUserProfileContextMenu } from "@/events/interactionCreate/command/contextMenus/getUserProfileContextMenu";

contextMenuHandler.clear();
contextMenuHandler.register(getUserProfileContextMenu);
