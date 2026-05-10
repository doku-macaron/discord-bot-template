import { type ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder, type SlashCommandSubcommandsOnlyBuilder } from "discord.js";
import type { BaseItem, Handler } from "@/events/handler";
import { SubCommand } from "@/events/interactionCreate/commands/chatInput/_core/subCommand";
import { SubCommandGroup } from "@/events/interactionCreate/commands/chatInput/_core/subCommandGroup";
import { logger } from "@/lib/logger";

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
