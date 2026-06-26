import type { ScheduledJobHandler } from "@repo/scheduler";
import { z } from "zod";
import { BUILTIN_UPTIME } from "@/jobs/builtInJobs";
import { logger } from "@/lib/infra/logger";

const emptyPayloadSchema = z.object({});
type UptimePayload = z.infer<typeof emptyPayloadSchema>;

// Process start time. Even though the job is scheduler-managed, what we want to log is
// the bot process uptime, so anchor on module load time.
const processStart = Date.now();

export const uptimeHandler: ScheduledJobHandler<UptimePayload> = {
    type: BUILTIN_UPTIME.jobType,
    parsePayload: (payload) => emptyPayloadSchema.parse(payload),
    run: () => {
        const minutes = Math.floor((Date.now() - processStart) / 60_000);
        logger.info("Core", `uptime: ${minutes} minutes`);
    },
};
