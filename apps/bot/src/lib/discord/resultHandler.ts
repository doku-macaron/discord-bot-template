import type { Result } from "@repo/shared";
import { type AppError, type AppErrorKind, fromUnknownError, isAppError, toError } from "@repo/shared/error/appError";
import type { RepliableInteraction } from "discord.js";
import { buildInteractionContext } from "@/lib/discord/interactionContext";
import { replyAppError } from "@/lib/discord/replyAppError";
import { replyError } from "@/lib/discord/replyError";
import { logger } from "@/lib/infra/logger";

type LogCategory = Parameters<typeof logger.error>[0];

type HandleResultOptions = {
    category?: LogCategory;
    errorMessage?: string;
};

// Expected errors get a short user-facing reply + a warn log. Everything else
// (external / unexpected / a raw Error) keeps the admin-share stack codeblock + error log.
const EXPECTED_KINDS: ReadonlySet<AppErrorKind> = new Set<AppErrorKind>(["validation", "not_found", "permission_denied", "rate_limited"]);

function defaultUserMessageFor(kind: AppErrorKind): string {
    switch (kind) {
        case "validation":
            return "入力内容を確認してください。";
        case "not_found":
            return "対象が見つかりませんでした。";
        case "permission_denied":
            return "権限が不足しています。";
        case "rate_limited":
            return "混み合っています。しばらく待ってから再度お試しください。";
        case "external":
        case "unexpected":
            return "エラーが発生しました。";
    }
}

function normalizeAppError(error: AppError | Error): AppError {
    return isAppError(error) ? error : fromUnknownError(error.message, error);
}

/**
 * Handle the err side of a Result: log it and reply to the interaction. Returns the
 * data on success and `null` after handling an error, so callers bail out with a
 * single `if (!data) return;`. Accepts both `AppError` and plain `Error` results.
 */
export async function handleResult<T, E extends Error | AppError>(
    result: Result<T, E>,
    interaction: RepliableInteraction,
    options?: HandleResultOptions
): Promise<T | null> {
    if (result.success) {
        return result.data;
    }

    const appError = normalizeAppError(result.error);
    const category = options?.category ?? "Bot";
    const context = buildInteractionContext(interaction);

    if (EXPECTED_KINDS.has(appError.kind)) {
        logger.warn(category, `[${appError.kind}] ${appError.message}`, context);
        await replyAppError(interaction, options?.errorMessage ?? appError.userMessage ?? defaultUserMessageFor(appError.kind));
        return null;
    }

    logger.error(category, toError(appError), context);
    await replyError(interaction, toError(appError, options?.errorMessage), context);
    return null;
}

export function logResult<T, E extends Error | AppError>(result: Result<T, E>, category: LogCategory = "Bot"): T | null {
    if (result.success) {
        return result.data;
    }

    logger.error(category, toError(result.error));
    return null;
}

export function logVoidResult<E extends Error | AppError>(result: Result<void, E>, category: LogCategory = "Bot"): boolean {
    if (result.success) {
        return true;
    }

    logger.error(category, toError(result.error));
    return false;
}
