import { formatInteractionContext, type InteractionContext } from "@/lib/interactionContext";

type Category = "Core" | "Bot" | "Discord" | "Database" | "Misc";

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

export const logger = {
    info(category: Category, message: string) {
        console.info(`[${category}] ${message}`);
    },
    warn(category: Category, message: string) {
        console.warn(`[${category}] ${message}`);
    },
    error(category: Category, message: string | Error, context?: InteractionContext) {
        const error = normalizeError(message);
        console.error(`[${category}] ${appendContext(error.stack ?? `${error.name}: ${error.message}`, context)}`);
    },
};
