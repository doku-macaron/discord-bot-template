import { commandHandler } from "@/events/interactionCreate/commands/chatInput/commandHandlerInstance";
import { adminCommand } from "@/events/interactionCreate/commands/chatInput/items/admin";
import { echoCommand } from "@/events/interactionCreate/commands/chatInput/items/echo";
import { helpCommand } from "@/events/interactionCreate/commands/chatInput/items/help";
import { pingCommand } from "@/events/interactionCreate/commands/chatInput/items/ping";
import { profileCommand } from "@/events/interactionCreate/commands/chatInput/items/profile";
import { showcaseCommand } from "@/events/interactionCreate/commands/chatInput/items/showcase";

commandHandler.clear();
commandHandler.register(pingCommand);
commandHandler.register(profileCommand);
commandHandler.register(echoCommand);
commandHandler.register(helpCommand);
commandHandler.register(adminCommand);
commandHandler.register(showcaseCommand);
