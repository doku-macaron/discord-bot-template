import { z } from "zod";

const optionalString = z.string().optional();
const optionalUrl = z.union([z.url(), z.literal("")]).optional();

// Env values are strings; treat only "true"/"1" as enabled so an empty or "false"
// value leaves an opt-in feature off. (z.coerce.boolean treats any non-empty string
// as true, including "false", so it can't be used here.)
const boolString = z
    .string()
    .default("false")
    .transform((value) => value === "true" || value === "1");

export const envVariables = {
    setup: z.object({
        TOKEN: z.string().default(""),
        CLIENT_ID: z.string().default(""),
        GUILD_ID: optionalString,
        DATABASE_URL: optionalString,
        WEBHOOK_URL: optionalUrl,
    }),
    bot: z.object({
        TOKEN: z.string().min(1, "TOKEN is required to start the bot."),
        WEBHOOK_URL: optionalUrl,
    }),
    register: z.object({
        TOKEN: z.string().min(1, "TOKEN is required to register commands."),
        CLIENT_ID: z.string().min(1, "CLIENT_ID is required to register commands."),
        GUILD_ID: optionalString,
        WEBHOOK_URL: optionalUrl,
    }),
    webhook: z.object({
        WEBHOOK_URL: optionalUrl,
    }),
    // Optional internal HTTP API (server/). Off by default; BOT_API_TOKEN is required
    // only when BOT_API_ENABLED=true (checked at startup in index.ts).
    botApi: z.object({
        BOT_API_ENABLED: boolString,
        BOT_API_HOST: z.string().default("0.0.0.0"),
        BOT_API_PORT: z.coerce.number().int().positive().default(8080),
        BOT_API_TOKEN: z.string().default(""),
    }),
} as const;

export type EnvName = keyof typeof envVariables;
export type EnvOf<T extends EnvName> = z.output<(typeof envVariables)[T]>;

export function getEnv<T extends EnvName>(name: T): EnvOf<T> {
    return envVariables[name].parse(process.env) as EnvOf<T>;
}

export const setupEnv = getEnv("setup");
Object.assign(process.env, setupEnv);

declare global {
    namespace NodeJS {
        interface ProcessEnv extends z.input<(typeof envVariables)["setup"]> {}
    }
}
