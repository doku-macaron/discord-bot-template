import { contextMenuHandler } from "@/events/interactionCreate/commands/contextMenu/_core/contextMenuHandlerInstance";
import { getUserProfileContextMenu } from "@/events/interactionCreate/commands/contextMenu/items/getUserProfileContextMenu";
import { reportMessageContextMenu } from "@/events/interactionCreate/commands/contextMenu/items/reportMessageContextMenu";

contextMenuHandler.clear();
contextMenuHandler.register(getUserProfileContextMenu);
contextMenuHandler.register(reportMessageContextMenu);
