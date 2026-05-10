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

function truncateContent(content: string): string {
    const maxLength = 1900;
    if (content.length <= maxLength) {
        return content;
    }

    return `${content.slice(0, maxLength)}\n...truncated`;
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
        content: truncateContent(`${bold("Discord Bot Error")}\n${codeBlock("ml", body)}`),
    });
}
