import "@/env";

import { REST, type RESTPutAPIApplicationCommandsResult, Routes } from "discord.js";
import { getEnv } from "@/env";
import { commandHandler, contextMenuHandler } from "@/events/interactionCreate/setup";

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
