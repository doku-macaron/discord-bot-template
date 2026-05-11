import "@/env";

import { REST, type RESTGetAPICurrentUserGuildsResult, type RESTPutAPIApplicationCommandsResult, Routes } from "discord.js";
import { getEnv } from "@/env";
import { commandHandler, contextMenuHandler } from "@/events/interactionCreate/setup";

const env = getEnv("register");

console.log("Starting command registration script.");

const rest = new REST().setToken(env.TOKEN);

const commands = [...commandHandler.restrictedCommands, ...contextMenuHandler.restrictedCommands];

console.log(`Preparing ${commands.length} application commands.`);
console.log(commands.map((command) => command.name).join(", "));

async function registerForGuild(guildId: string, label: string) {
    const data = (await rest.put(Routes.applicationGuildCommands(env.CLIENT_ID, guildId), {
        body: commands,
    })) as RESTPutAPIApplicationCommandsResult;
    console.log(`Reloaded ${data.length} commands for ${label} (${guildId}).`);
}

if (env.GUILD_ID) {
    console.log(`Registering for single guild: ${env.GUILD_ID}.`);
    await registerForGuild(env.GUILD_ID, "dev guild");
    console.log("Command registration complete.");
} else {
    const guilds = (await rest.get(Routes.userGuilds())) as RESTGetAPICurrentUserGuildsResult;
    console.log(`Broadcasting to ${guilds.length} guild(s).`);

    for (const guild of guilds) {
        try {
            await registerForGuild(guild.id, guild.name);
        } catch (error) {
            console.error(`Failed to register for ${guild.name} (${guild.id}):`, error);
        }
    }
}

// @discordjs/rest keeps an undici keep-alive agent open after the PUT
// completes, so the event loop does not drain on its own. Exit explicitly
// so `bun register` (and any CI step that runs it) returns promptly.
process.exit(0);
