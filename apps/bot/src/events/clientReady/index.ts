import { Events } from "discord.js";
import { getEnv } from "@/env";
import { defineClientEvent } from "@/framework/discord/clientEvents";
import { seedBuiltInJobs } from "@/jobs/handlers/seedBuiltInJobs";
import { startSchedulerWorker } from "@/jobs/schedulerHost";
import { markClientReady } from "@/lib/infra/readyState";

export const clientReadyEvent = defineClientEvent(Events.ClientReady, async (client) => {
    console.log(`Logged in as ${client.user.tag}`);
    markClientReady();

    // Optional durable scheduler. Off by default; enable with SCHEDULER_ENABLED=true.
    if (getEnv("scheduler").SCHEDULER_ENABLED) {
        await seedBuiltInJobs();
        startSchedulerWorker();
    }
});
