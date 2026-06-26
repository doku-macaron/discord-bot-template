import { isProduction } from "@/isProduction";
import { formatInteractionContext, type InteractionContext } from "@/lib/discord/interactionContext";
import { captureException } from "@/lib/infra/errorReporter";
import { sendErrorToWebhook } from "@/lib/infra/errorWebhook";

export type LogCategory = "Core" | "Bot" | "Discord" | "Database" | "Misc";
type LogLevel = "info" | "warn" | "error";

function normalizeError(message: string | Error): Error {
    if (message instanceof Error) {
        return message;
    }
    return new Error(message);
}

function appendContext(message: string, context?: InteractionContext): string {
    if (!context) {
        return message;
    }
    return `${message}\n[interaction context]\n${formatInteractionContext(context)}`;
}

type LogPayload = {
    level: LogLevel;
    category: LogCategory;
    message: string;
    context?: InteractionContext;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
};

function writeLog(payload: LogPayload) {
    if (isProduction) {
        console[payload.level](
            JSON.stringify({
                ts: new Date().toISOString(),
                level: payload.level,
                category: payload.category,
                msg: payload.message,
                context: payload.context,
                error: payload.error,
            })
        );
        return;
    }

    const message = payload.error?.stack ?? payload.error?.message ?? payload.message;
    console[payload.level](`[${payload.category}] ${appendContext(message, payload.context)}`);
}

export const logger = {
    info(category: LogCategory, message: string, context?: InteractionContext) {
        writeLog({ level: "info", category, message, context });
    },
    warn(category: LogCategory, message: string, context?: InteractionContext) {
        writeLog({ level: "warn", category, message, context });
    },
    error(category: LogCategory, message: string | Error, context?: InteractionContext) {
        const error = normalizeError(message);
        writeLog({
            level: "error",
            category,
            message: error.message,
            context,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
            },
        });
        captureException(error, { category, interaction: context });
        sendErrorToWebhook(category, error, context).catch((webhookError: unknown) => {
            const normalizedWebhookError = normalizeError(webhookError instanceof Error ? webhookError : String(webhookError));
            writeLog({
                level: "warn",
                category,
                message: `Failed to send error webhook: ${normalizedWebhookError.message}`,
            });
        });
    },
};
