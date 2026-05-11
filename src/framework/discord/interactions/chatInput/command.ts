import { type ChatInputCommandInteraction, SlashCommandBuilder, type SlashCommandOptionsOnlyBuilder } from "discord.js";
import type { BaseItem } from "@/events/handler";
import { type CommandExecutor, executeCommand } from "@/framework/discord/interactions/chatInput/commandExecutor";

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
