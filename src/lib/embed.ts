import { Colors, EmbedBuilder } from "discord.js";

export const EMBED_COLOR = {
    success: Colors.Green,
    error: Colors.Red,
    info: Colors.Blurple,
    warn: Colors.Yellow,
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
