import { Events } from "discord.js";
import { defineClientEvent } from "@/framework/discord/clientEvents";
import { startJobs } from "@/framework/jobs/jobRunner";
import { jobs } from "@/jobs/jobsRegister";

export const clientReadyEvent = defineClientEvent(Events.ClientReady, async (client) => {
    console.log(`Logged in as ${client.user.tag}`);
    startJobs(jobs);
});
