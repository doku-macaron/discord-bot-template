import type {
    ApplicationCommandOptionChoiceData,
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    Interaction,
    RepliableInteraction,
} from "discord.js";

export type MockReplyPayload = {
    content?: string;
    flags?: unknown;
};

export type CustomIdInteractionMock = Interaction & RepliableInteraction & { customId: string };

type MockOptions = {
    deferred?: boolean;
    replied?: boolean;
};

export type AutocompleteResponseRecorder = {
    responses: Array<ReadonlyArray<ApplicationCommandOptionChoiceData>>;
    respondError?: Error;
};

export function createAutocompleteInteractionMock(
    commandName: string,
    recorder: AutocompleteResponseRecorder,
    options: { responded?: boolean } = {}
): AutocompleteInteraction {
    const mock = {
        commandName,
        responded: options.responded ?? false,
        respond: async (choices: ReadonlyArray<ApplicationCommandOptionChoiceData>) => {
            if (recorder.respondError) {
                throw recorder.respondError;
            }
            recorder.responses.push(choices);
            mock.responded = true;
        },
        user: { id: "user-id", username: "user" },
        guildId: null,
        channelId: null,
        id: "interaction-id",
        createdTimestamp: Date.now(),
        isButton: () => false,
        isModalSubmit: () => false,
        isStringSelectMenu: () => false,
        isUserSelectMenu: () => false,
        isRoleSelectMenu: () => false,
        isChannelSelectMenu: () => false,
        isMentionableSelectMenu: () => false,
        isAutocomplete: () => true,
        isChatInputCommand: () => false,
        isContextMenuCommand: () => false,
    };
    return mock as unknown as AutocompleteInteraction;
}

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
