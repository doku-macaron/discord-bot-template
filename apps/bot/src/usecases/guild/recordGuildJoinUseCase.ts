import { recordGuildJoin } from "@/db/query/guild/recordGuildJoin";
import { logger } from "@/lib/infra/logger";

export type RecordGuildJoinInput = {
    guildId: string;
    // `name` is not persisted (we read Discord's current value on demand), but
    // we keep it here so the log line emitted on join is human-readable.
    name: string;
};

export async function recordGuildJoinUseCase(input: RecordGuildJoinInput): Promise<void> {
    try {
        await recordGuildJoin({ guildId: input.guildId });
        logger.info("Bot", `Joined guild: ${input.name} (${input.guildId})`);
    } catch (unknownError) {
        const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
        logger.error("Database", error);
    }
}
