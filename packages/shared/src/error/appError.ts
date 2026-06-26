export type AppErrorKind = "validation" | "not_found" | "permission_denied" | "external" | "rate_limited" | "unexpected";

export type AppError = {
    readonly kind: AppErrorKind;
    readonly message: string;
    readonly userMessage?: string;
    readonly cause?: unknown;
};

export function appError(input: AppError): AppError {
    return input;
}

export function validationError(message: string, userMessage?: string): AppError {
    return { kind: "validation", message, userMessage };
}

export function notFoundError(message: string, userMessage?: string): AppError {
    return { kind: "not_found", message, userMessage };
}

export function permissionDeniedError(message: string, userMessage?: string): AppError {
    return { kind: "permission_denied", message, userMessage };
}

export function externalError(message: string, cause?: unknown): AppError {
    return { kind: "external", message, cause };
}

export function rateLimitedError(message: string, cause?: unknown): AppError {
    return { kind: "rate_limited", message, cause };
}

export function unexpectedError(message: string, cause?: unknown): AppError {
    return { kind: "unexpected", message, cause };
}

export function fromUnknownError(message: string, cause: unknown): AppError {
    return { kind: "unexpected", message, cause };
}

const APP_ERROR_KINDS: ReadonlySet<string> = new Set<AppErrorKind>([
    "validation",
    "not_found",
    "permission_denied",
    "external",
    "rate_limited",
    "unexpected",
]);

export function isAppError(value: unknown): value is AppError {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const candidate = value as { kind?: unknown; message?: unknown };
    return typeof candidate.kind === "string" && APP_ERROR_KINDS.has(candidate.kind) && typeof candidate.message === "string";
}

/**
 * Convert an `AppError | Error` into an `Error` suitable for logger / replyError.
 * When the source carries a cause, its stack is appended to the returned Error's
 * stack as `Caused by: …` so the root frame survives in admin-facing codeblocks
 * (Node's default `Error.stack` does not include `Error.cause`).
 *
 * When `messageOverride` is given, a fresh `Error` is created with that message and
 * the original error chained as its cause, so the underlying stack is still emitted.
 */
export function toError(error: AppError | Error, messageOverride?: string): Error {
    if (error instanceof Error) {
        if (messageOverride === undefined || messageOverride === error.message) {
            return error;
        }
        const wrapped = new Error(messageOverride, { cause: error });
        return appendCauseStack(wrapped, error);
    }
    const message = messageOverride ?? error.message;
    const wrapped = new Error(message, { cause: error.cause });
    return appendCauseStack(wrapped, error.cause);
}

function appendCauseStack(target: Error, cause: unknown): Error {
    if (cause instanceof Error && cause.stack) {
        const base = target.stack ?? `${target.name}: ${target.message}`;
        target.stack = `${base}\nCaused by: ${cause.stack}`;
    }
    return target;
}
