import type { InteractionContext } from "@/lib/interactionContext";

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

export function captureException(error: Error, context?: ErrorReporterContext): void {
    try {
        const result = reporter.captureException(error, context);
        if (result instanceof Promise) {
            result.catch(() => {
                // swallow reporter errors to avoid feedback loops with logger.error
            });
        }
    } catch {
        // swallow reporter errors to avoid feedback loops with logger.error
    }
}
