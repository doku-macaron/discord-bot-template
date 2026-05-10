import type { ClientEvents, Events } from "discord.js";
import { startJobs } from "@/jobs/jobRunner";
import { jobs } from "@/jobs/jobsRegister";

export const clientReadyEvent: (...args: ClientEvents[Events.ClientReady]) => void = async (client) => {
    console.log(`Logged in as ${client.user.tag}`);
    startJobs(jobs);
};
