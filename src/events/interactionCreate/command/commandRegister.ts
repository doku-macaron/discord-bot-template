import { commandHandler } from "@/events/interactionCreate/command/commandHandlerInstance";
import { pingCommand } from "@/events/interactionCreate/command/commands/ping";
import { profileCommand } from "@/events/interactionCreate/command/commands/profile";

commandHandler.clear();
commandHandler.register(pingCommand);
commandHandler.register(profileCommand);
