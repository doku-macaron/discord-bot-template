import { clientReadyEvent } from "@/events/clientReady";
import { guildCreateEvent } from "@/events/guildCreate";
import { guildDeleteEvent } from "@/events/guildDelete";
import { interactionCreateEvent } from "@/events/interactionCreate";
import { defineClientEventRegister } from "@/framework/discord/clientEvents";

// Single source of truth for which client events are wired. The initializer
// re-imports this module on hot reload and hands the entries to the reloader,
// which detaches the previous listeners before attaching these.
export const clientEventEntries = defineClientEventRegister((register) =>
    register.once(clientReadyEvent).on(interactionCreateEvent).on(guildCreateEvent).on(guildDeleteEvent)
);
