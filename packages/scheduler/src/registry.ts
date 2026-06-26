import { DuplicateHandlerError } from "./errors";
import type { ScheduledJobHandler } from "./types";

export type HandlerRegistry = {
    has: (type: string) => boolean;
    get: (type: string) => ScheduledJobHandler<unknown> | undefined;
    /** The registered job types. The worker uses these as claim's allowedJobTypes. */
    allowedJobTypes: () => string[];
};

/**
 * Build a handler registry. Duplicate `type`s are rejected with DuplicateHandlerError.
 * Deriving `allowedJobTypes()` from the registry enforces the invariant that a host
 * only claims the types it can actually run.
 */
// biome-ignore lint/suspicious/noExplicitAny: each handler's payload type differs; the registry flattens to unknown.
export function createHandlerRegistry(handlers: ReadonlyArray<ScheduledJobHandler<any>>): HandlerRegistry {
    const map = new Map<string, ScheduledJobHandler<unknown>>();
    for (const handler of handlers) {
        if (map.has(handler.type)) {
            throw new DuplicateHandlerError(handler.type);
        }
        map.set(handler.type, handler as ScheduledJobHandler<unknown>);
    }

    const types = [...map.keys()];

    return {
        has: (type) => map.has(type),
        get: (type) => map.get(type),
        allowedJobTypes: () => [...types],
    };
}
