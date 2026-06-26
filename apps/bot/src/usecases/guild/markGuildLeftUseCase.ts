import { markGuildLeft } from "@/db/query/guild/markGuildLeft";
import { logger } from "@/lib/infra/logger";

export type MarkGuildLeftInput = {
    guildId: string;
    name: string;
};

export async function markGuildLeftUseCase(input: MarkGuildLeftInput): Promise<void> {
    try {
        const updated = await markGuildLeft(input.guildId);
        if (updated) {
            logger.info("Bot", `Left guild: ${input.name} (${input.guildId})`);
        } else {
            logger.warn("Bot", `GuildDelete for unknown guild (no DB row): ${input.guildId}`);
        }
    } catch (unknownError) {
        const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
        logger.error("Database", error);
    }
}
