import { type ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import type { BaseItem } from "@/events/handler";
import { type CommandExecutor, executeCommand } from "@/framework/discord/interactions/chatInput/commandExecutor";

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
