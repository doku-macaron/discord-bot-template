import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export const PAGINATION_ACTIONS = ["first", "prev", "next", "last"] as const;
export type PaginationAction = (typeof PAGINATION_ACTIONS)[number];

export type ParsedPaginationCustomId = {
    feature: string;
    action: PaginationAction;
    page: number;
};

export function buildPaginationCustomId(feature: string, action: PaginationAction, currentPage: number): string {
    return `${feature}:pagination:${action}:${currentPage}`;
}

export function paginationCustomIdPattern(feature: string): RegExp {
    const escaped = feature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`^${escaped}:pagination:(first|prev|next|last):\\d+$`);
}

export function parsePaginationCustomId(customId: string): ParsedPaginationCustomId | null {
    const match = customId.match(/^(.+):pagination:(first|prev|next|last):(\d+)$/);
    if (!match) {
        return null;
    }
    const [, feature, action, page] = match;
    if (!feature || !action || page === undefined) {
        return null;
    }
    return {
        feature,
        action: action as PaginationAction,
        page: Number(page),
    };
}

export function clampPage(page: number, totalPages: number): number {
    if (totalPages <= 0) {
        return 0;
    }
    if (page < 0) {
        return 0;
    }
    if (page >= totalPages) {
        return totalPages - 1;
    }
    return page;
}

export function nextPage(action: PaginationAction, current: number, totalPages: number): number {
    if (totalPages <= 0) {
        return 0;
    }
    if (action === "first") {
        return 0;
    }
    if (action === "last") {
        return totalPages - 1;
    }
    if (action === "prev") {
        return clampPage(current - 1, totalPages);
    }
    return clampPage(current + 1, totalPages);
}

export function buildPaginationRow(feature: string, currentPage: number, totalPages: number): ActionRowBuilder<ButtonBuilder> {
    const totalSafe = Math.max(totalPages, 1);
    const page = clampPage(currentPage, totalSafe);
    const atFirst = page <= 0;
    const atLast = page >= totalSafe - 1;

    const buttons = [
        new ButtonBuilder()
            .setCustomId(buildPaginationCustomId(feature, "first", page))
            .setLabel("«")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(atFirst),
        new ButtonBuilder()
            .setCustomId(buildPaginationCustomId(feature, "prev", page))
            .setLabel("‹")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(atFirst),
        new ButtonBuilder()
            .setCustomId(`${feature}:pagination:indicator`)
            .setLabel(`${page + 1} / ${totalSafe}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(buildPaginationCustomId(feature, "next", page))
            .setLabel("›")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(atLast),
        new ButtonBuilder()
            .setCustomId(buildPaginationCustomId(feature, "last", page))
            .setLabel("»")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(atLast),
    ];

    return new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);
}
