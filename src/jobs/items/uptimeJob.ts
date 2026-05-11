import type { Job } from "@/framework/jobs/job";
import { logger } from "@/lib/infra/logger";

const start = Date.now();

export const uptimeJob: Job = {
    name: "uptime",
    intervalMs: 30 * 60_000,
    run: () => {
        const minutes = Math.floor((Date.now() - start) / 60_000);
        logger.info("Core", `uptime: ${minutes} minutes`);
    },
};
