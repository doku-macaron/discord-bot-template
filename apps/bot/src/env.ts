import { z } from "zod";

const optionalString = z.string().optional();
const optionalUrl = z.union([z.url(), z.literal("")]).optional();

export const envVariables = {
    setup: z.object({
        TOKEN: z.string().default(""),
        CLIENT_ID: z.string().default(""),
        GUILD_ID: optionalString,
        DATABASE_URL: optionalString,
        DATABASE_URL_DEV: z.string().default("./.pglite"),
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
    postgres: z.object({
        DATABASE_URL: z.string().min(1, "DATABASE_URL is required for PostgreSQL."),
        WEBHOOK_URL: optionalUrl,
    }),
    pglite: z.object({
        DATABASE_URL_DEV: z.string().default("./.pglite"),
        WEBHOOK_URL: optionalUrl,
    }),
    webhook: z.object({
        WEBHOOK_URL: optionalUrl,
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
