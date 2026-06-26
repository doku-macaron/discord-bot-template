import { Client, GatewayIntentBits } from "discord.js";

// Default to suppressing all parsed mentions (@everyone / @here / role / user).
// Per-send `allowedMentions` overrides this when a specific ping is intentional —
// e.g. `allowedMentions: { parse: [], users: [user.id] }` to ping exactly one user.
// Without this default, user-supplied content (e.g. /echo, /timer message) could
// trigger broadcast pings if the bot has the corresponding permission.
export const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
    allowedMentions: { parse: [] },
});
