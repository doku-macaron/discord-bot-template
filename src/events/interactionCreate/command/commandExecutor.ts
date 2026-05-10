import type { ChatInputCommandInteraction, InteractionEditReplyOptions, Message, MessagePayload } from "discord.js";

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

export async function executeCommand(execute: CommandExecutor, interaction: ChatInputCommandInteraction) {
    const command = execute(interaction);

    if (isAsyncGenerator(command)) {
        await runAsAsyncGenerator(command, interaction);
        return;
    }

    await command;
}
