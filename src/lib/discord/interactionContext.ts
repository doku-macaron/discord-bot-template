import type { Interaction } from "discord.js";

export type InteractionContextType =
    | "button"
    | "modal"
    | "string-select"
    | "user-select"
    | "role-select"
    | "channel-select"
    | "mentionable-select"
    | "command"
    | "context-menu"
    | "autocomplete"
    | "unknown";

export type InteractionContext = {
    type: InteractionContextType;
    customId?: string;
    commandName?: string;
    userId: string;
    userName: string;
    guildId: string | null;
    channelId: string | null;
    interactionId: string;
    ageMs: number;
};

function detectType(interaction: Interaction): { type: InteractionContextType; customId?: string; commandName?: string } {
    if (interaction.isButton()) {
        return { type: "button", customId: interaction.customId };
    }
    if (interaction.isModalSubmit()) {
        return { type: "modal", customId: interaction.customId };
    }
    if (interaction.isStringSelectMenu()) {
        return { type: "string-select", customId: interaction.customId };
    }
    if (interaction.isUserSelectMenu()) {
        return { type: "user-select", customId: interaction.customId };
    }
    if (interaction.isRoleSelectMenu()) {
        return { type: "role-select", customId: interaction.customId };
    }
    if (interaction.isChannelSelectMenu()) {
        return { type: "channel-select", customId: interaction.customId };
    }
    if (interaction.isMentionableSelectMenu()) {
        return { type: "mentionable-select", customId: interaction.customId };
    }
    if (interaction.isAutocomplete()) {
        return { type: "autocomplete", commandName: interaction.commandName };
    }
    if (interaction.isChatInputCommand()) {
        const group = interaction.options.getSubcommandGroup(false);
        const subcommand = interaction.options.getSubcommand(false);
        const commandName = [interaction.commandName, group, subcommand].filter((value): value is string => Boolean(value)).join(" ");
        return { type: "command", commandName };
    }
    if (interaction.isContextMenuCommand()) {
        return { type: "context-menu", commandName: interaction.commandName };
    }
    return { type: "unknown" };
}

export function buildInteractionContext(interaction: Interaction): InteractionContext {
    const detected = detectType(interaction);
    const context: InteractionContext = {
        type: detected.type,
        userId: interaction.user.id,
        userName: interaction.user.username,
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        interactionId: interaction.id,
        ageMs: Date.now() - interaction.createdTimestamp,
    };

    if (detected.customId !== undefined) {
        context.customId = detected.customId;
    }
    if (detected.commandName !== undefined) {
        context.commandName = detected.commandName;
    }

    return context;
}

function orDash(value: string | null | undefined): string {
    if (value === undefined || value === null || value === "") {
        return "-";
    }
    return value;
}

export function formatInteractionContext(context: InteractionContext): string {
    return [
        `type: ${context.type}`,
        `customId: ${orDash(context.customId)}`,
        `command: ${orDash(context.commandName)}`,
        `user: @${context.userName} (${context.userId})`,
        `guild: ${orDash(context.guildId)}`,
        `channel: ${orDash(context.channelId)}`,
        `interactionId: ${context.interactionId}`,
        `ageMs: ${context.ageMs}`,
    ].join("\n");
}
