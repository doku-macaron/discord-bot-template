import { z } from "zod";

export const envVariables = z.object({
    TOKEN: z.string().default(""),
    CLIENT_ID: z.string().default(""),
    GUILD_ID: z.string().optional(),
    DATABASE_URL: z.string().optional(),
    DATABASE_URL_DEV: z.string().default("./.pglite"),
});

if (process.env.NODE_ENV !== "setup") {
    const env = envVariables.parse(process.env);
    Object.assign(process.env, env);
}

declare global {
    namespace NodeJS {
        interface ProcessEnv extends z.infer<typeof envVariables> {}
    }
}
