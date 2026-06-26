import { type InteractionReplyOptions, MessageFlags, type RepliableInteraction } from "discord.js";

const MAX_CONTENT_LENGTH = 2000;
const TRUNCATED_MARKER = "…";

/**
 * Reply with a short, user-facing message for an expected error kind (validation /
 * not_found / permission_denied / rate_limited). Unlike `replyError`, this does NOT
 * emit the admin-share stack codeblock — it is for messages a user should act on.
 */
export async function replyAppError(interaction: RepliableInteraction, message: string): Promise<void> {
    const content = truncate(message, MAX_CONTENT_LENGTH);
    const payload: InteractionReplyOptions = { content, flags: MessageFlags.Ephemeral };

    if (interaction.deferred) {
        await interaction.editReply({ content });
        return;
    }
    if (interaction.replied) {
        await interaction.followUp(payload);
        return;
    }
    await interaction.reply(payload);
}

function truncate(text: string, max: number): string {
    if (text.length <= max) {
        return text;
    }
    return `${text.slice(0, max - TRUNCATED_MARKER.length)}${TRUNCATED_MARKER}`;
}
