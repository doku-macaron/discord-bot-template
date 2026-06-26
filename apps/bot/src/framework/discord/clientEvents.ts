import type { Client, ClientEvents } from "discord.js";

// Hot-reload-safe client event registration. Events are declared as plain
// `ClientEventDefinition`s (via `defineClientEvent`) and composed into a registry
// (`defineClientEventRegister`). The reloader attaches the registry's listeners to
// the client and returns a disposer, so a reload detaches the previous listeners
// before attaching the new ones — no duplicate handlers across hot reloads.

export type ClientEventDefinition<K extends keyof ClientEvents = keyof ClientEvents> = {
    readonly name: K;
    readonly listener: (...args: ClientEvents[K]) => MaybePromise<void>;
};

export type RegisteredClientEvent = {
    readonly name: keyof ClientEvents;
    readonly listener: (...args: never[]) => MaybePromise<void>;
    readonly once: boolean;
};

export type ClientEventRegistry = {
    readonly events: readonly RegisteredClientEvent[];
    emit<K extends keyof ClientEvents>(name: K, ...args: ClientEvents[K]): Promise<void>;
};

export type ClientEventRegistryReloader = {
    reload(loadRegistry: () => MaybePromise<ClientEventRegistry>): Promise<ClientEventRegistry>;
    dispose(): void;
};

type RegisteredClientEventMeta<K extends keyof ClientEvents = keyof ClientEvents, Once extends boolean = boolean> = {
    readonly name: K;
    readonly once: Once;
};

export function defineClientEvent<const K extends keyof ClientEvents>(
    name: K,
    listener: (...args: ClientEvents[K]) => MaybePromise<void>
): ClientEventDefinition<K> {
    return {
        name,
        listener,
    };
}

export type ClientEventRegisterBuilder<Entries extends readonly RegisteredClientEventMeta[] = readonly []> = {
    on<const K extends keyof ClientEvents>(
        event: ClientEventDefinition<K>
    ): ClientEventRegisterBuilder<
        [
            ...Entries,
            {
                readonly name: K;
                readonly once: false;
            },
        ]
    >;

    once<const K extends keyof ClientEvents>(
        event: ClientEventDefinition<K>
    ): ClientEventRegisterBuilder<
        [
            ...Entries,
            {
                readonly name: K;
                readonly once: true;
            },
        ]
    >;

    list(): readonly RegisteredClientEvent[];
};

function createClientEventRegisterBuilder<Entries extends readonly RegisteredClientEventMeta[] = readonly []>(
    entries: RegisteredClientEvent[] = []
): ClientEventRegisterBuilder<Entries> {
    return {
        on(event) {
            entries.push({
                name: event.name,
                listener: event.listener as (...args: never[]) => MaybePromise<void>,
                once: false,
            });

            return createClientEventRegisterBuilder(entries) as ClientEventRegisterBuilder<
                [
                    ...Entries,
                    {
                        readonly name: typeof event.name;
                        readonly once: false;
                    },
                ]
            >;
        },

        once(event) {
            entries.push({
                name: event.name,
                listener: event.listener as (...args: never[]) => MaybePromise<void>,
                once: true,
            });

            return createClientEventRegisterBuilder(entries) as ClientEventRegisterBuilder<
                [
                    ...Entries,
                    {
                        readonly name: typeof event.name;
                        readonly once: true;
                    },
                ]
            >;
        },

        list() {
            return entries;
        },
    };
}

export function defineClientEventRegister(
    define: (register: ClientEventRegisterBuilder) => ClientEventRegisterBuilder
): ClientEventRegistry {
    const events = define(createClientEventRegisterBuilder()).list();

    return {
        events,
        async emit(name, ...args) {
            for (const event of events) {
                if (event.name === name) {
                    await event.listener(...(args as never[]));
                }
            }
        },
    };
}

export function applyClientEventEntries(client: Client, entries: readonly RegisteredClientEvent[]): () => void {
    const eventClient = client as {
        on(name: keyof ClientEvents, listener: (...args: Array<unknown>) => void): void;
        once(name: keyof ClientEvents, listener: (...args: Array<unknown>) => void): void;
        removeListener(name: keyof ClientEvents, listener: (...args: Array<unknown>) => void): void;
    };
    const attachedListeners: Array<{
        readonly name: keyof ClientEvents;
        readonly listener: (...args: Array<unknown>) => void;
    }> = [];

    for (const entry of entries) {
        const listener = (...args: Array<unknown>) => {
            void entry.listener(...(args as never[]));
        };

        attachedListeners.push({
            name: entry.name,
            listener,
        });

        if (entry.once) {
            eventClient.once(entry.name, listener);
        } else {
            eventClient.on(entry.name, listener);
        }
    }

    return () => {
        for (const { name, listener } of attachedListeners) {
            eventClient.removeListener(name, listener);
        }
    };
}

export function createClientEventRegistryReloader(client: Client): ClientEventRegistryReloader {
    let disposeCurrent = () => {};

    const dispose = () => {
        disposeCurrent();
        disposeCurrent = () => {};
    };

    return {
        async reload(loadRegistry) {
            dispose();
            const registry = await loadRegistry();
            disposeCurrent = applyClientEventEntries(client, registry.events);
            return registry;
        },

        dispose,
    };
}
