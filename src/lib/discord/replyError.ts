import {
    codeBlock,
    type InteractionEditReplyOptions,
    type InteractionReplyOptions,
    MessageFlags,
    type RepliableInteraction,
} from "discord.js";
import { buildInteractionContext, formatInteractionContext, type InteractionContext } from "@/lib/discord/interactionContext";

export async function replyError(interaction: RepliableInteraction, error: Error, context?: InteractionContext) {
    const ctx = context ?? buildInteractionContext(interaction);
    const detail = [formatInteractionContext(ctx), "", error.stack ?? `${error.name}: ${error.message}`].join("\n");
    const content = ["エラーが発生しました。管理者へ以下の内容を共有してください。", codeBlock("ml", detail)].join("\n");
    const editPayload: InteractionEditReplyOptions = {
        content,
    };
    const payload: InteractionReplyOptions = {
        content,
        flags: MessageFlags.Ephemeral,
    };

    if (interaction.deferred) {
        await interaction.editReply(editPayload);
        return;
    }

    if (interaction.replied) {
        await interaction.followUp(payload);
        return;
    }

    await interaction.reply(payload);
}
