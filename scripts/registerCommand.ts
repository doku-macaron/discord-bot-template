import "@/env";
import "@/events/interactionCreate/command/commandRegister";

import { REST, type RESTPutAPIApplicationCommandsResult, Routes } from "discord.js";
import { commandHandler } from "@/events/interactionCreate/command/commandHandlerInstance";

if (!process.env.TOKEN || !process.env.CLIENT_ID) {
    throw new Error("TOKEN and CLIENT_ID are required to register commands.");
}

const rest = new REST().setToken(process.env.TOKEN);

const commands = commandHandler.restrictedCommands;
const route = process.env.GUILD_ID
    ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
    : Routes.applicationCommands(process.env.CLIENT_ID);

console.log(`Started refreshing ${commands.length} application commands.`);
console.log(commands.map((command) => command.name).join(", "));

const data = (await rest.put(route, {
    body: commands,
})) as RESTPutAPIApplicationCommandsResult;

console.log(`Successfully reloaded ${data.length} application commands.`);
