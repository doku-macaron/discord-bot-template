import { type ChatInputCommandInteraction, MessageFlags, type RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";
import type { Handler } from "@/events/handler";
import type { Command } from "@/framework/discord/interactions/chatInput/command";
import type { CommandWithSubCommand } from "@/framework/discord/interactions/chatInput/commandWithSubCommand";

export { Command } from "@/framework/discord/interactions/chatInput/command";
export type { CommandExecutor } from "@/framework/discord/interactions/chatInput/commandExecutor";
export { CommandWithSubCommand } from "@/framework/discord/interactions/chatInput/commandWithSubCommand";
export { SubCommand } from "@/framework/discord/interactions/chatInput/subCommand";
export { SubCommandGroup } from "@/framework/discord/interactions/chatInput/subCommandGroup";

export class CommandHandler implements Handler<Command | CommandWithSubCommand, ChatInputCommandInteraction> {
    private commands = new Map<string, Command | CommandWithSubCommand>();

    get restrictedCommands(): Array<RESTPostAPIChatInputApplicationCommandsJSONBody> {
        return Array.from(this.commands.values()).map((command) => command.data.toJSON());
    }

    get handlers() {
        return Array.from(this.commands.values());
    }

    register(command: Command | CommandWithSubCommand) {
        this.commands.set(command.data.name, command);
        return this;
    }

    clear() {
        this.commands.clear();
    }

    get(commandName: string): Command | CommandWithSubCommand | undefined {
        return this.commands.get(commandName);
    }

    async execute(interaction: ChatInputCommandInteraction) {
        const command = this.get(interaction.commandName);

        if (!command) {
            await interaction.reply({
                content: "未登録のコマンドです。",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await command.execute(interaction);
    }
}
