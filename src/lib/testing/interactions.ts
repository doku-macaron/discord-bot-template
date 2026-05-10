import type { ChatInputCommandInteraction, Interaction, RepliableInteraction } from "discord.js";

export type MockReplyPayload = {
    content?: string;
    flags?: unknown;
};

export type CustomIdInteractionMock = Interaction & RepliableInteraction & { customId: string };

type MockOptions = {
    deferred?: boolean;
    replied?: boolean;
};

export function createCommandInteractionMock(
    commandName: string,
    replies: Array<MockReplyPayload>,
    options: MockOptions = {}
): ChatInputCommandInteraction {
    return {
        commandName,
        deferred: options.deferred ?? false,
        replied: options.replied ?? false,
        reply: async (payload: MockReplyPayload) => {
            replies.push(payload);
        },
    } as unknown as ChatInputCommandInteraction;
}

export function createCustomIdInteractionMock(
    customId: string,
    replies: Array<MockReplyPayload>,
    options: MockOptions = {}
): CustomIdInteractionMock {
    return {
        customId,
        deferred: options.deferred ?? false,
        replied: options.replied ?? false,
        reply: async (payload: MockReplyPayload) => {
            replies.push(payload);
        },
    } as unknown as CustomIdInteractionMock;
}
