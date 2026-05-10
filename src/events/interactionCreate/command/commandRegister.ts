import { commandHandler } from "@/events/interactionCreate/command/commandHandlerInstance";
import { echoCommand } from "@/events/interactionCreate/command/commands/echo";
import { helpCommand } from "@/events/interactionCreate/command/commands/help";
import { pingCommand } from "@/events/interactionCreate/command/commands/ping";
import { profileCommand } from "@/events/interactionCreate/command/commands/profile";

commandHandler.clear();
commandHandler.register(pingCommand);
commandHandler.register(profileCommand);
commandHandler.register(echoCommand);
commandHandler.register(helpCommand);
