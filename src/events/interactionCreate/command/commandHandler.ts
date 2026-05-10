import {
    type ChatInputCommandInteraction,
    type RESTPostAPIChatInputApplicationCommandsJSONBody,
    SlashCommandBuilder,
    type SlashCommandOptionsOnlyBuilder,
} from "discord.js";

export type CommandExecutor = (interaction: ChatInputCommandInteraction) => Promise<void>;

export class Command {
    data: SlashCommandOptionsOnlyBuilder;

    constructor(
        build: (builder: SlashCommandOptionsOnlyBuilder) => void,
        private executeCommand: CommandExecutor
    ) {
        const builder = new SlashCommandBuilder();
        build(builder);
        this.data = builder;
    }

    async execute(interaction: ChatInputCommandInteraction) {
        await this.executeCommand(interaction);
    }
}

export class CommandHandler {
    private commands = new Map<string, Command>();

    get restrictedCommands(): Array<RESTPostAPIChatInputApplicationCommandsJSONBody> {
        return Array.from(this.commands.values()).map((command) => command.data.toJSON());
    }

    register(command: Command) {
        this.commands.set(command.data.name, command);
        return this;
    }

    clear() {
        this.commands.clear();
    }

    async execute(interaction: ChatInputCommandInteraction) {
        const command = this.commands.get(interaction.commandName);

        if (!command) {
            await interaction.reply("コマンドが見つかりませんでした。");
            return;
        }

        await command.execute(interaction);
    }
}
