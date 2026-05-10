import { codeBlock, type InteractionReplyOptions, MessageFlags, type RepliableInteraction } from "discord.js";
import { buildInteractionContext, formatInteractionContext, type InteractionContext } from "@/lib/interactionContext";

export async function replyError(interaction: RepliableInteraction, error: Error, context?: InteractionContext) {
    const ctx = context ?? buildInteractionContext(interaction);
    const detail = [formatInteractionContext(ctx), "", error.stack ?? `${error.name}: ${error.message}`].join("\n");
    const payload: InteractionReplyOptions = {
        content: ["エラーが発生しました。管理者へ以下の内容を共有してください。", codeBlock("ml", detail)].join("\n"),
        flags: MessageFlags.Ephemeral,
    };

    if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload);
        return;
    }

    await interaction.reply(payload);
}
