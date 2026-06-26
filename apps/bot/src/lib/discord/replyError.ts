import {
    codeBlock,
    type InteractionEditReplyOptions,
    type InteractionReplyOptions,
    MessageFlags,
    type RepliableInteraction,
} from "discord.js";
import { buildInteractionContext, formatInteractionContext, type InteractionContext } from "@/lib/discord/interactionContext";

const MAX_CONTENT_LENGTH = 2000;
const PROMPT = "エラーが発生しました。管理者へ以下の内容を共有してください。\n";
const TRUNCATED_MARKER = "\n...truncated";
const FENCE_OPEN = "```ml\n";
const FENCE_CLOSE = "\n```";

function buildContent(detail: string): string {
    const full = `${PROMPT}${codeBlock("ml", detail)}`;
    if (full.length <= MAX_CONTENT_LENGTH) {
        return full;
    }

    // Truncate inside the fence so the closing ``` is preserved.
    const wrapperLength = PROMPT.length + FENCE_OPEN.length + FENCE_CLOSE.length;
    const bodyBudget = MAX_CONTENT_LENGTH - wrapperLength - TRUNCATED_MARKER.length;
    const truncatedDetail = detail.slice(0, Math.max(0, bodyBudget));
    return `${PROMPT}${FENCE_OPEN}${truncatedDetail}${TRUNCATED_MARKER}${FENCE_CLOSE}`;
}

export async function replyError(interaction: RepliableInteraction, error: Error, context?: InteractionContext) {
    const ctx = context ?? buildInteractionContext(interaction);
    const detail = [formatInteractionContext(ctx), "", error.stack ?? `${error.name}: ${error.message}`].join("\n");
    const content = buildContent(detail);
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
