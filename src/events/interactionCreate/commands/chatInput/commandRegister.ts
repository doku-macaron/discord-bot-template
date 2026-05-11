import { adminCommand } from "@/events/interactionCreate/commands/chatInput/items/admin";
import { echoCommand } from "@/events/interactionCreate/commands/chatInput/items/echo";
import { helpCommand } from "@/events/interactionCreate/commands/chatInput/items/help";
import { pingCommand } from "@/events/interactionCreate/commands/chatInput/items/ping";
import { pollCommand } from "@/events/interactionCreate/commands/chatInput/items/poll";
import { profileCommand } from "@/events/interactionCreate/commands/chatInput/items/profile";
import { showcaseCommand } from "@/events/interactionCreate/commands/chatInput/items/showcase";
import { commandHandler } from "@/framework/discord/interactions/chatInput";

commandHandler.clear();
commandHandler.register(pingCommand);
commandHandler.register(profileCommand);
commandHandler.register(echoCommand);
commandHandler.register(helpCommand);
commandHandler.register(adminCommand);
commandHandler.register(showcaseCommand);
commandHandler.register(pollCommand);
