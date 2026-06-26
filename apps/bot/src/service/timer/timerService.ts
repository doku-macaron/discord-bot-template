import { type Client, userMention } from "discord.js";
import { logger } from "@/lib/infra/logger";

// Example stateful service. Two rules make a service hot-reload-safe and testable:
//
//   1. State (the set of active timers) is pinned to `globalThis` under a unique key,
//      so a dev hot reload re-evaluates this module but reuses the same registry
//      instead of orphaning in-flight timers.
//   2. The `Client` is passed in as a parameter — never imported — so the service can
//      be unit-tested with a fake client (see timerService.test.ts).
//
// This is in-memory only: timers are lost on process restart. For durable reminders,
// persist them and restore on clientReady, or use the scheduler (see scheduler-add-job).

type TimerState = {
    active: Map<string, ReturnType<typeof setTimeout>>;
    nextId: number;
};

const STATE_KEY = Symbol.for("@repo/bot/service/timer");

type GlobalWithTimerState = typeof globalThis & { [STATE_KEY]?: TimerState };

function getState(): TimerState {
    const globalWithState = globalThis as GlobalWithTimerState;
    globalWithState[STATE_KEY] ??= { active: new Map(), nextId: 0 };
    return globalWithState[STATE_KEY];
}

export type ScheduleTimerInput = {
    client: Client;
    channelId: string;
    userId: string;
    message: string;
    fireAt: Date;
    /** Runs after the reminder is delivered (e.g. to finalize the confirmation reply). */
    onFire?: () => Promise<void>;
};

export function scheduleTimer(input: ScheduleTimerInput): string {
    const state = getState();
    const id = `timer-${state.nextId++}`;
    const delayMs = Math.max(0, input.fireAt.getTime() - Date.now());

    const handle = setTimeout(() => {
        state.active.delete(id);
        void fire(input);
    }, delayMs);

    state.active.set(id, handle);
    return id;
}

async function fire(input: ScheduleTimerInput): Promise<void> {
    try {
        const channel = await input.client.channels.fetch(input.channelId);
        if (channel?.isSendable()) {
            await channel.send(`${userMention(input.userId)} ⏰ ${input.message}`);
        }
        await input.onFire?.();
    } catch (unknownError) {
        logger.error("Bot", unknownError instanceof Error ? unknownError : new Error(String(unknownError)));
    }
}

export function cancelAllTimers(): void {
    const state = getState();
    for (const handle of state.active.values()) {
        clearTimeout(handle);
    }
    state.active.clear();
}

export function activeTimerCount(): number {
    return getState().active.size;
}

// Test-only: reset the pinned state so tests do not leak timers into one another.
export function _resetTimerServiceForTest(): void {
    cancelAllTimers();
    getState().nextId = 0;
}
