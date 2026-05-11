import { bold, codeBlock, WebhookClient } from "discord.js";
import { getEnv } from "@/env";
import { formatInteractionContext, type InteractionContext } from "@/lib/discord/interactionContext";

let webhookClient: WebhookClient | undefined;

function getWebhookClient(): WebhookClient | undefined {
    const env = getEnv("webhook");
    if (!env.WEBHOOK_URL) {
        return undefined;
    }

    webhookClient ??= new WebhookClient({
        url: env.WEBHOOK_URL,
    });

    return webhookClient;
}

const MAX_CONTENT_LENGTH = 1900;
const TRUNCATED_MARKER = "\n...truncated";
const HEADER = `${bold("Discord Bot Error")}\n`;
// The code fence wraps the body; truncation must happen *inside* the fence
// so the closing ``` is preserved.
const FENCE_OPEN = "```ml\n";
const FENCE_CLOSE = "\n```";

function buildContent(body: string): string {
    const wrapperLength = HEADER.length + FENCE_OPEN.length + FENCE_CLOSE.length;
    if (HEADER.length + codeBlock("ml", body).length <= MAX_CONTENT_LENGTH) {
        return `${HEADER}${codeBlock("ml", body)}`;
    }

    const bodyBudget = MAX_CONTENT_LENGTH - wrapperLength - TRUNCATED_MARKER.length;
    const truncatedBody = body.slice(0, Math.max(0, bodyBudget));
    return `${HEADER}${FENCE_OPEN}${truncatedBody}${TRUNCATED_MARKER}${FENCE_CLOSE}`;
}

export async function sendErrorToWebhook(category: string, error: Error, context?: InteractionContext) {
    const client = getWebhookClient();
    if (!client) {
        return;
    }

    const body = [
        `category: ${category}`,
        context ? `\n${formatInteractionContext(context)}` : undefined,
        `\n${error.stack ?? `${error.name}: ${error.message}`}`,
    ]
        .filter((value): value is string => value !== undefined)
        .join("\n");

    await client.send({
        content: buildContent(body),
    });
}
