import {
    type ChatInputCommandInteraction,
    type InteractionEditReplyOptions,
    type Message,
    MessageFlags,
    type MessagePayload,
    type RESTPostAPIChatInputApplicationCommandsJSONBody,
    SlashCommandBuilder,
    type SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandBuilder,
    SlashCommandSubcommandGroupBuilder,
    type SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import type { BaseItem, Handler } from "@/events/handler";
import { logger } from "@/lib/logger";

type ReplyPayload = string | MessagePayload | InteractionEditReplyOptions;
export type CommandExecutor = (
    interaction: ChatInputCommandInteraction
) => AsyncGenerator<ReplyPayload, void, Message<boolean>> | Promise<void>;

function isAsyncGenerator(value: ReturnType<CommandExecutor>): value is AsyncGenerator<ReplyPayload, void, Message<boolean>> {
    return typeof (value as AsyncGenerator<ReplyPayload, void, Message<boolean>>).next === "function";
}

async function runAsAsyncGenerator(
    command: AsyncGenerator<ReplyPayload, void, Message<boolean>>,
    interaction: ChatInputCommandInteraction
) {
    await interaction.deferReply();

    let lastResult: Message<boolean> | undefined;
    let next = await command.next();

    while (!next.done) {
        lastResult = await interaction.editReply(next.value);
        next = await command.next(lastResult);
    }
}

async function executeCommand(execute: CommandExecutor, interaction: ChatInputCommandInteraction) {
    const command = execute(interaction);

    if (isAsyncGenerator(command)) {
        await runAsAsyncGenerator(command, interaction);
        return;
    }

    await command;
}

export class Command implements BaseItem<SlashCommandOptionsOnlyBuilder, ChatInputCommandInteraction> {
    data: SlashCommandOptionsOnlyBuilder;

    constructor(
        build: (builder: SlashCommandOptionsOnlyBuilder) => void,
        private executor: CommandExecutor
    ) {
        const builder = new SlashCommandBuilder();
        build(builder);
        this.data = builder;
    }

    async execute(interaction: ChatInputCommandInteraction) {
        await executeCommand(this.executor, interaction);
    }
}

export class SubCommand implements BaseItem<SlashCommandSubcommandBuilder, ChatInputCommandInteraction> {
    data: SlashCommandSubcommandBuilder;

    constructor(
        build: (builder: SlashCommandSubcommandBuilder) => void,
        private executor: CommandExecutor
    ) {
        const builder = new SlashCommandSubcommandBuilder();
        build(builder);
        this.data = builder;
    }

    async execute(interaction: ChatInputCommandInteraction) {
        await executeCommand(this.executor, interaction);
    }
}

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

export class CommandWithSubCommand
    implements
        BaseItem<SlashCommandSubcommandsOnlyBuilder, ChatInputCommandInteraction>,
        Handler<SubCommand | SubCommandGroup, ChatInputCommandInteraction>
{
    private commands = new Map<string, SubCommand | SubCommandGroup>();
    data: SlashCommandSubcommandsOnlyBuilder;

    get handlers() {
        return Array.from(this.commands.values());
    }

    constructor(build: (builder: SlashCommandSubcommandsOnlyBuilder) => void) {
        const builder = new SlashCommandBuilder();
        build(builder);
        this.data = builder;
    }

    register(command: SubCommand | SubCommandGroup) {
        if (command instanceof SubCommand) {
            if (this.commands.has(command.data.name)) {
                logger.warn("Core", `Subcommand '${command.data.name}' is already registered. Skipping.`);
                return this;
            }

            this.commands.set(command.data.name, command);
            this.data.addSubcommand(command.data);
            return this;
        }

        if (this.commands.has(command.data.name)) {
            logger.warn("Core", `Subcommand group '${command.data.name}' is already registered. Skipping.`);
            return this;
        }

        this.commands.set(command.data.name, command);
        this.data.addSubcommandGroup(command.data);
        return this;
    }

    get(commandName: string): SubCommand | SubCommandGroup | undefined {
        return this.commands.get(commandName);
    }

    async execute(interaction: ChatInputCommandInteraction) {
        const groupName = interaction.options.getSubcommandGroup(false);
        const subCommandName = interaction.options.getSubcommand(false);

        if (groupName) {
            const group = this.commands.get(groupName);
            if (group instanceof SubCommandGroup) {
                await group.execute(interaction);
                return;
            }

            await interaction.reply({
                content: "未登録のコマンドグループです。",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (!subCommandName) {
            await interaction.reply({
                content: "サブコマンドが指定されていません。",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const subcommand = this.commands.get(subCommandName);
        if (subcommand instanceof SubCommand) {
            await subcommand.execute(interaction);
            return;
        }

        await interaction.reply({
            content: "未登録のサブコマンドです。",
            flags: MessageFlags.Ephemeral,
        });
    }
}

export class SubCommandGroup
    implements BaseItem<SlashCommandSubcommandGroupBuilder, ChatInputCommandInteraction>, Handler<SubCommand, ChatInputCommandInteraction>
{
    private commands = new Map<string, SubCommand>();
    data: SlashCommandSubcommandGroupBuilder;

    get handlers() {
        return Array.from(this.commands.values());
    }

    constructor(build: (builder: SlashCommandSubcommandGroupBuilder) => void) {
        const builder = new SlashCommandSubcommandGroupBuilder();
        build(builder);
        this.data = builder;
    }

    register(command: SubCommand) {
        if (this.commands.has(command.data.name)) {
            logger.warn("Core", `Subcommand '${command.data.name}' is already registered in the group. Skipping.`);
            return this;
        }

        this.commands.set(command.data.name, command);
        this.data.addSubcommand(command.data);
        return this;
    }

    get(commandName: string): SubCommand | undefined {
        return this.commands.get(commandName);
    }

    async execute(interaction: ChatInputCommandInteraction) {
        const commandName = interaction.options.getSubcommand();
        const command = this.commands.get(commandName);

        if (!command) {
            await interaction.reply({
                content: "未登録のサブコマンドです。",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await command.execute(interaction);
    }
}
