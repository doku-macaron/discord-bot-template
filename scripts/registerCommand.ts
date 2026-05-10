import "@/env";
import "@/events/interactionCreate/command/commandRegister";
import "@/events/interactionCreate/command/contextMenuRegister";

import { REST, type RESTPutAPIApplicationCommandsResult, Routes } from "discord.js";
import { getEnv } from "@/env";
import { commandHandler } from "@/events/interactionCreate/command/commandHandlerInstance";
import { contextMenuHandler } from "@/events/interactionCreate/command/contextMenuHandlerInstance";

const env = getEnv("register");

const rest = new REST().setToken(env.TOKEN);

const commands = [...commandHandler.restrictedCommands, ...contextMenuHandler.restrictedCommands];
const route = env.GUILD_ID ? Routes.applicationGuildCommands(env.CLIENT_ID, env.GUILD_ID) : Routes.applicationCommands(env.CLIENT_ID);

console.log(`Started refreshing ${commands.length} application commands.`);
console.log(commands.map((command) => command.name).join(", "));

const data = (await rest.put(route, {
    body: commands,
})) as RESTPutAPIApplicationCommandsResult;

console.log(`Successfully reloaded ${data.length} application commands.`);
