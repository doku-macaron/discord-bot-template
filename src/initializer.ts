import { Events } from "discord.js";
import { client } from "@/client";
import { clientReadyEvent } from "@/events/clientReady";
import { interactionCreateEvent } from "@/events/interactionCreate";

export function setupProcessHandlers() {
    process.on("uncaughtException", (error) => {
        console.error(error);
    });

    process.on("unhandledRejection", (reason, promise) => {
        console.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
    });

    function shutdown(signal: NodeJS.Signals) {
        console.log(`Received ${signal}, shutting down`);
        client.destroy();
        process.exit(0);
    }

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}

export function initialize() {
    client.once(Events.ClientReady, clientReadyEvent);
    client.on(Events.InteractionCreate, interactionCreateEvent);
}
