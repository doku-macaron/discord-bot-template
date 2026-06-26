import { beforeEach, describe, expect, mock, test } from "bun:test";
import * as actualShutdown from "@/lib/infra/shutdown";

let mockShuttingDown = false;

mock.module("@/lib/infra/shutdown", () => ({
    ...actualShutdown,
    isShuttingDown: () => mockShuttingDown,
    trackInflight: (work: () => Promise<void>) => work(),
}));

const loggedErrors: Array<{ category: string; error: Error }> = [];

mock.module("@/lib/infra/logger", () => ({
    logger: {
        error: (category: string, error: Error) => {
            loggedErrors.push({ category, error });
        },
        info: () => {},
        warn: () => {},
        debug: () => {},
    },
}));

const replyErrorCalls: Array<{ error: Error }> = [];
let replyErrorShouldThrow: Error | undefined;

mock.module("@/lib/discord/replyError", () => ({
    replyError: async (_interaction: unknown, error: Error) => {
        if (replyErrorShouldThrow) {
            throw replyErrorShouldThrow;
        }
        replyErrorCalls.push({ error });
    },
}));

const { createDispatcher } = await import("@/framework/discord/interactions/dispatcher");
type Dispatcher = ReturnType<typeof createDispatcher>;
type Handlers = Parameters<typeof createDispatcher>[0];
const { createKindInteractionMock } = await import("@/lib/testing/interactions");

type ExecuteRecorder = Record<keyof Handlers, Array<unknown>>;

function createSpyHandlers(throwing?: Partial<Record<keyof Handlers, Error>>): {
    handlers: Handlers;
    recorder: ExecuteRecorder;
} {
    const recorder: ExecuteRecorder = {
        autocomplete: [],
        button: [],
        command: [],
        contextMenu: [],
        menu: [],
        modal: [],
    };
    const makeSpy = (key: keyof Handlers) => ({
        execute: async (interaction: unknown) => {
            if (throwing?.[key]) {
                throw throwing[key];
            }
            recorder[key].push(interaction);
        },
    });
    const handlers = {
        autocomplete: makeSpy("autocomplete"),
        button: makeSpy("button"),
        command: makeSpy("command"),
        contextMenu: makeSpy("contextMenu"),
        menu: makeSpy("menu"),
        modal: makeSpy("modal"),
    } as unknown as Handlers;
    return { handlers, recorder };
}

// `trackInflight` is mocked to run work() synchronously and return its Promise.
// One microtask flush is enough to let the async body complete.
function flushMicrotasks(): Promise<void> {
    return Promise.resolve().then(() => Promise.resolve());
}

beforeEach(() => {
    mockShuttingDown = false;
    loggedErrors.length = 0;
    replyErrorCalls.length = 0;
    replyErrorShouldThrow = undefined;
});

describe("createDispatcher", () => {
    test("routes button interaction to button handler", async () => {
        const { handlers, recorder } = createSpyHandlers();
        const dispatch: Dispatcher = createDispatcher(handlers);

        dispatch(createKindInteractionMock("button"));
        await flushMicrotasks();

        expect(recorder.button.length).toBe(1);
    });

    test("routes modal submit interaction to modal handler", async () => {
        const { handlers, recorder } = createSpyHandlers();
        const dispatch = createDispatcher(handlers);

        dispatch(createKindInteractionMock("modal"));
        await flushMicrotasks();

        expect(recorder.modal.length).toBe(1);
    });

    test("routes any select menu interaction to menu handler", async () => {
        const { handlers, recorder } = createSpyHandlers();
        const dispatch = createDispatcher(handlers);

        dispatch(createKindInteractionMock("string-select"));
        await flushMicrotasks();

        expect(recorder.menu.length).toBe(1);
    });

    test("routes chat input command to command handler", async () => {
        const { handlers, recorder } = createSpyHandlers();
        const dispatch = createDispatcher(handlers);

        dispatch(createKindInteractionMock("chat-input"));
        await flushMicrotasks();

        expect(recorder.command.length).toBe(1);
    });

    test("routes context menu to context menu handler", async () => {
        const { handlers, recorder } = createSpyHandlers();
        const dispatch = createDispatcher(handlers);

        dispatch(createKindInteractionMock("context-menu"));
        await flushMicrotasks();

        expect(recorder.contextMenu.length).toBe(1);
    });

    test("routes autocomplete to autocomplete handler", async () => {
        const { handlers, recorder } = createSpyHandlers();
        const dispatch = createDispatcher(handlers);

        dispatch(createKindInteractionMock("autocomplete"));
        await flushMicrotasks();

        expect(recorder.autocomplete.length).toBe(1);
    });

    test("calls replyError and logs when handler throws on repliable interaction", async () => {
        const boom = new Error("boom");
        const { handlers } = createSpyHandlers({ button: boom });
        const dispatch = createDispatcher(handlers);

        dispatch(createKindInteractionMock("button", { isRepliable: () => true }));
        await flushMicrotasks();

        expect(loggedErrors[0]?.error).toBe(boom);
        expect(replyErrorCalls[0]?.error).toBe(boom);
    });

    test("logs handler error without replyError when interaction is not repliable", async () => {
        const boom = new Error("autocomplete boom");
        const { handlers } = createSpyHandlers({ autocomplete: boom });
        const dispatch = createDispatcher(handlers);

        dispatch(createKindInteractionMock("autocomplete", { isRepliable: () => false }));
        await flushMicrotasks();

        expect(loggedErrors.some(({ error }) => error === boom)).toBe(true);
        expect(replyErrorCalls.length).toBe(0);
    });

    test("logs both errors when replyError itself throws", async () => {
        const boom = new Error("boom");
        const replyBoom = new Error("reply failure");
        replyErrorShouldThrow = replyBoom;
        const { handlers } = createSpyHandlers({ button: boom });
        const dispatch = createDispatcher(handlers);

        dispatch(createKindInteractionMock("button", { isRepliable: () => true }));
        await flushMicrotasks();

        expect(loggedErrors.some(({ error }) => error === boom)).toBe(true);
        expect(loggedErrors.some(({ error }) => error === replyBoom)).toBe(true);
    });

    test("when shutting down, replies with shutdown notice and skips handler for repliable interaction", async () => {
        mockShuttingDown = true;
        const replies: Array<{ content?: string; flags?: unknown }> = [];
        const { handlers, recorder } = createSpyHandlers();
        const dispatch = createDispatcher(handlers);

        dispatch(
            createKindInteractionMock("button", {
                isRepliable: () => true,
                reply: async (payload: { content?: string; flags?: unknown }) => {
                    replies.push(payload);
                },
            })
        );
        await flushMicrotasks();

        expect(recorder.button.length).toBe(0);
        expect(replies[0]?.content).toBe("Bot is shutting down. Please try again shortly.");
    });

    test("when shutting down, skips handler silently for non-repliable interaction", async () => {
        mockShuttingDown = true;
        const { handlers, recorder } = createSpyHandlers();
        const dispatch = createDispatcher(handlers);

        dispatch(createKindInteractionMock("autocomplete", { isRepliable: () => false }));
        await flushMicrotasks();

        expect(recorder.autocomplete.length).toBe(0);
    });

    test("logs Unhandled interaction type error when no guard matches", async () => {
        const { handlers } = createSpyHandlers();
        const dispatch = createDispatcher(handlers);

        // Force every routing guard to return false to fall through to the throw.
        const unhandled = createKindInteractionMock("button", {
            isButton: () => false,
            isRepliable: () => false,
            type: 999,
        });

        dispatch(unhandled);
        await flushMicrotasks();

        expect(loggedErrors.some(({ error }) => error.message === "Unhandled interaction type: 999")).toBe(true);
    });
});
