import { recordGuildJoin } from "@/db/query/guild/recordGuildJoin";
import { logger } from "@/lib/infra/logger";

export type RecordGuildJoinInput = {
    guildId: string;
    name: string;
};

export async function recordGuildJoinUseCase(input: RecordGuildJoinInput): Promise<void> {
    try {
        await recordGuildJoin({ guildId: input.guildId, name: input.name });
        logger.info("Bot", `Joined guild: ${input.name} (${input.guildId})`);
    } catch (unknownError) {
        const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
        logger.error("Database", error);
    }
}
