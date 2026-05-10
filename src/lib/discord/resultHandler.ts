import type { RepliableInteraction } from "discord.js";
import { buildInteractionContext } from "@/lib/discord/interactionContext";
import { replyError } from "@/lib/discord/replyError";
import { logger } from "@/lib/infra/logger";
import type { Result } from "@/lib/util/result";

type LogCategory = Parameters<typeof logger.error>[0];

type HandleResultOptions = {
    category?: LogCategory;
    errorMessage?: string;
};

export async function handleResult<T>(
    result: Result<T, Error>,
    interaction: RepliableInteraction,
    options?: HandleResultOptions
): Promise<T | null> {
    if (result.success) {
        return result.data;
    }

    const category = options?.category ?? "Bot";
    const context = buildInteractionContext(interaction);
    logger.error(category, result.error, context);

    const userFacingError = options?.errorMessage ? new Error(options.errorMessage, { cause: result.error }) : result.error;
    await replyError(interaction, userFacingError, context);

    return null;
}

export function logResult<T>(result: Result<T, Error>, category: LogCategory = "Bot"): T | null {
    if (result.success) {
        return result.data;
    }

    logger.error(category, result.error);
    return null;
}

export function logVoidResult(result: Result<void, Error>, category: LogCategory = "Bot"): boolean {
    if (result.success) {
        return true;
    }

    logger.error(category, result.error);
    return false;
}
