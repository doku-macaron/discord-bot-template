import type { InteractionContext } from "@/lib/discord/interactionContext";

export type ErrorReporterContext = {
    category?: string;
    interaction?: InteractionContext;
};

export type ErrorReporter = {
    captureException: (error: Error, context?: ErrorReporterContext) => void | Promise<void>;
};

const noopReporter: ErrorReporter = {
    captureException: () => {
        // intentionally empty
    },
};

let reporter: ErrorReporter = noopReporter;

export function setErrorReporter(next: ErrorReporter): void {
    reporter = next;
}

export function resetErrorReporter(): void {
    reporter = noopReporter;
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
    return (
        value !== null &&
        (typeof value === "object" || typeof value === "function") &&
        typeof (value as PromiseLike<unknown>).then === "function"
    );
}

export function captureException(error: Error, context?: ErrorReporterContext): void {
    try {
        const result = reporter.captureException(error, context);
        if (isThenable(result)) {
            Promise.resolve(result).catch(() => {
                // swallow reporter errors to avoid feedback loops with logger.error
            });
        }
    } catch {
        // swallow reporter errors to avoid feedback loops with logger.error
    }
}
