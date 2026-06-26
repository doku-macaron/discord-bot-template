import { createHandlerRegistry } from "@repo/scheduler";
import { uptimeHandler } from "@/jobs/handlers/uptimeHandler";

/**
 * The job handlers this bot process can run. `allowedJobTypes()` is derived from this
 * registry and used as the claim filter (a host never claims a type it can't run), so
 * adding a handler here is what lets the worker pick up that job type.
 */
export const botJobRegistry = createHandlerRegistry([uptimeHandler]);
