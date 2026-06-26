/**
 * Built-in (global) job definitions. The single source shared by the seed and the
 * handler registry. `jobType` must match the handler registry key.
 *
 * The template ships one example. Add more here and register a matching handler in
 * jobs/handlers/botJobRegistry.ts + seed it in jobs/handlers/seedBuiltInJobs.ts (see
 * the scheduler-add-job skill).
 */
export const BUILTIN_UPTIME = {
    jobKey: "builtin:uptime",
    jobType: "uptime",
    name: "Uptime log",
    intervalMs: 30 * 60_000,
    timeoutMs: 5_000,
} as const;
