import { type ContextMenuCommandInteraction, MessageFlags, type RESTPostAPIContextMenuApplicationCommandsJSONBody } from "discord.js";
import type { Handler } from "@/events/handler";
import type { ContextMenuCommand } from "@/events/interactionCreate/commands/contextMenu/_core/contextMenuCommand";

export { ContextMenuCommand } from "@/events/interactionCreate/commands/contextMenu/_core/contextMenuCommand";

export class ContextMenuHandler implements Handler<ContextMenuCommand, ContextMenuCommandInteraction> {
    private commands = new Map<string, ContextMenuCommand>();

    get restrictedCommands(): Array<RESTPostAPIContextMenuApplicationCommandsJSONBody> {
        return Array.from(this.commands.values()).map((command) => command.data.toJSON());
    }

    get handlers() {
        return Array.from(this.commands.values());
    }

    register(command: ContextMenuCommand) {
        this.commands.set(command.data.name, command);
        return this;
    }

    clear() {
        this.commands.clear();
    }

    get(commandName: string): ContextMenuCommand | undefined {
        return this.commands.get(commandName);
    }

    async execute(interaction: ContextMenuCommandInteraction) {
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
