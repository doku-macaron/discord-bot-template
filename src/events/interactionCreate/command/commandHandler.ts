import { type ChatInputCommandInteraction, MessageFlags, type RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";
import type { Handler } from "@/events/handler";
import type { Command } from "@/events/interactionCreate/command/command";
import type { CommandWithSubCommand } from "@/events/interactionCreate/command/commandWithSubCommand";

export { Command } from "@/events/interactionCreate/command/command";
export type { CommandExecutor } from "@/events/interactionCreate/command/commandExecutor";
export { CommandWithSubCommand } from "@/events/interactionCreate/command/commandWithSubCommand";
export { SubCommand } from "@/events/interactionCreate/command/subCommand";
export { SubCommandGroup } from "@/events/interactionCreate/command/subCommandGroup";

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
