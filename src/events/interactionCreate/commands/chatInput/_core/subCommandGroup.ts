import { type ChatInputCommandInteraction, MessageFlags, SlashCommandSubcommandGroupBuilder } from "discord.js";
import type { BaseItem, Handler } from "@/events/handler";
import type { SubCommand } from "@/events/interactionCreate/commands/chatInput/_core/subCommand";
import { logger } from "@/lib/logger";

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
