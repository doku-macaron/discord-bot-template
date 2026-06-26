import {
    type AppError,
    externalError,
    fromUnknownError,
    notFoundError,
    permissionDeniedError,
    rateLimitedError,
} from "@repo/shared/error/appError";
import { DiscordAPIError, RESTJSONErrorCodes } from "discord.js";

// Map a thrown Discord REST error to a kind-discriminated AppError, so a service or
// usecase can surface a meaningful Result instead of leaking the raw throw.
export function classifyDiscordError(error: unknown): AppError {
    if (!(error instanceof DiscordAPIError)) {
        return fromUnknownError("discord call failed", error);
    }

    switch (error.code) {
        case RESTJSONErrorCodes.UnknownMessage:
        case RESTJSONErrorCodes.UnknownChannel:
            return notFoundError(`discord: ${error.message}`);
        case RESTJSONErrorCodes.MissingAccess:
        case RESTJSONErrorCodes.MissingPermissions:
            return permissionDeniedError(`discord: ${error.message}`, "Bot に必要な権限がありません。");
    }

    // Catch 404/403/429 by HTTP status for codes not covered above, so the kind is
    // preserved (e.g. UnknownMember/UnknownRole 404 should not collapse to external).
    // 401 is an auth failure (invalid/misconfigured token), not a permission issue, so
    // it falls through to externalError rather than permission_denied.
    if (error.status === 404) {
        return notFoundError(`discord: ${error.message}`);
    }
    if (error.status === 403) {
        return permissionDeniedError(`discord: ${error.message}`, "Bot に必要な権限がありません。");
    }
    if (error.status === 429) {
        return rateLimitedError("discord rate limited", error);
    }

    return externalError(`discord: ${error.message}`, error);
}

/**
 * Whether the interaction's response target (original message / channel / token) is
 * already gone, so editReply etc. would be pointless. Happens when the target channel
 * is deleted concurrently with the handler.
 */
export function isStaleInteractionResponseError(error: unknown): boolean {
    return (
        error instanceof DiscordAPIError &&
        (error.code === RESTJSONErrorCodes.UnknownMessage ||
            error.code === RESTJSONErrorCodes.UnknownChannel ||
            error.code === RESTJSONErrorCodes.UnknownInteraction)
    );
}
