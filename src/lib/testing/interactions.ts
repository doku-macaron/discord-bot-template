import type {
    ApplicationCommandOptionChoiceData,
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    ContextMenuCommandInteraction,
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

export function createContextMenuInteractionMock(
    commandName: string,
    replies: Array<MockReplyPayload>,
    options: MockOptions = {}
): ContextMenuCommandInteraction {
    return {
        commandName,
        deferred: options.deferred ?? false,
        replied: options.replied ?? false,
        reply: async (payload: MockReplyPayload) => {
            replies.push(payload);
        },
    } as unknown as ContextMenuCommandInteraction;
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

export type MockReplyKind = "reply" | "editReply" | "followUp" | "deferReply";

export type MockReplyRecord = {
    kind: MockReplyKind;
    payload?: unknown;
};

export type SubCommandPath = {
    group?: string | null;
    subcommand?: string | null;
};

export function createRichCommandInteractionMock(
    commandName: string,
    records: Array<MockReplyRecord>,
    options: MockOptions & SubCommandPath & { editReplyResult?: unknown } = {}
): ChatInputCommandInteraction {
    const editReplyResult = options.editReplyResult ?? { id: "reply-message-id" };
    const mock = {
        commandName,
        deferred: options.deferred ?? false,
        replied: options.replied ?? false,
        user: { id: "user-id", username: "user" },
        guildId: null,
        channelId: null,
        id: "interaction-id",
        createdTimestamp: Date.now(),
        options: {
            getSubcommandGroup: (required = false) => {
                if (options.group !== undefined && options.group !== null) {
                    return options.group;
                }
                if (required) {
                    throw new Error("getSubcommandGroup(required) called but no group provided");
                }
                return null;
            },
            getSubcommand: (required = true) => {
                if (options.subcommand !== undefined && options.subcommand !== null) {
                    return options.subcommand;
                }
                if (required) {
                    throw new Error("getSubcommand(required) called but no subcommand provided");
                }
                return null;
            },
        },
        reply: async (payload: unknown) => {
            records.push({ kind: "reply", payload });
            mock.replied = true;
        },
        editReply: async (payload: unknown) => {
            records.push({ kind: "editReply", payload });
            return editReplyResult;
        },
        followUp: async (payload: unknown) => {
            records.push({ kind: "followUp", payload });
            return editReplyResult;
        },
        deferReply: async (payload?: unknown) => {
            records.push({ kind: "deferReply", payload });
            mock.deferred = true;
        },
        isButton: () => false,
        isModalSubmit: () => false,
        isStringSelectMenu: () => false,
        isUserSelectMenu: () => false,
        isRoleSelectMenu: () => false,
        isChannelSelectMenu: () => false,
        isMentionableSelectMenu: () => false,
        isAutocomplete: () => false,
        isChatInputCommand: () => true,
        isContextMenuCommand: () => false,
    };
    return mock as unknown as ChatInputCommandInteraction;
}

type InteractionGuardKind =
    | "button"
    | "modal"
    | "string-select"
    | "user-select"
    | "role-select"
    | "channel-select"
    | "mentionable-select"
    | "autocomplete"
    | "chat-input"
    | "context-menu";

const GUARD_METHODS: Record<InteractionGuardKind, string> = {
    button: "isButton",
    modal: "isModalSubmit",
    "string-select": "isStringSelectMenu",
    "user-select": "isUserSelectMenu",
    "role-select": "isRoleSelectMenu",
    "channel-select": "isChannelSelectMenu",
    "mentionable-select": "isMentionableSelectMenu",
    autocomplete: "isAutocomplete",
    "chat-input": "isChatInputCommand",
    "context-menu": "isContextMenuCommand",
};

export function createKindInteractionMock(kind: InteractionGuardKind, overrides: Record<string, unknown> = {}): Interaction {
    const base: Record<string, unknown> = {
        user: { id: "user-id", username: "user" },
        guildId: null,
        channelId: null,
        id: "interaction-id",
        createdTimestamp: Date.now(),
    };

    for (const [, methodName] of Object.entries(GUARD_METHODS)) {
        base[methodName] = () => false;
    }
    base[GUARD_METHODS[kind]] = () => true;

    return { ...base, ...overrides } as unknown as Interaction;
}
