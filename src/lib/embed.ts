import { EmbedBuilder } from "discord.js";

export const EMBED_COLOR = {
    success: 0x57f287,
    error: 0xed4245,
    info: 0x5865f2,
    warn: 0xfee75c,
} as const;

function build(color: number, title: string, description?: string): EmbedBuilder {
    const embed = new EmbedBuilder().setTitle(title).setColor(color);
    if (description) {
        embed.setDescription(description);
    }
    return embed;
}

export function successEmbed(title: string, description?: string): EmbedBuilder {
    return build(EMBED_COLOR.success, title, description);
}

export function errorEmbed(title: string, description?: string): EmbedBuilder {
    return build(EMBED_COLOR.error, title, description);
}

export function infoEmbed(title: string, description?: string): EmbedBuilder {
    return build(EMBED_COLOR.info, title, description);
}

export function warnEmbed(title: string, description?: string): EmbedBuilder {
    return build(EMBED_COLOR.warn, title, description);
}
