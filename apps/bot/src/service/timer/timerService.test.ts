import { describe, expect, test } from "bun:test";
import type { Client } from "discord.js";
import { _resetTimerServiceForTest, activeTimerCount, cancelAllTimers, scheduleTimer } from "@/service/timer/timerService";

function fakeClient(onSend: (content: string) => void): Client {
    return {
        channels: {
            fetch: async () => ({
                isSendable: () => true,
                send: async (content: string) => {
                    onSend(content);
                },
            }),
        },
    } as unknown as Client;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("timerService", () => {
    test("fires after the delay, sends to the channel, and clears itself", async () => {
        _resetTimerServiceForTest();
        const sent: Array<string> = [];
        let fired = false;

        scheduleTimer({
            client: fakeClient((content) => sent.push(content)),
            channelId: "c1",
            userId: "u1",
            message: "stand up",
            fireAt: new Date(Date.now() + 5),
            onFire: async () => {
                fired = true;
            },
        });

        expect(activeTimerCount()).toBe(1);
        await sleep(25);

        expect(sent).toEqual(["<@u1> ⏰ stand up"]);
        expect(fired).toBe(true);
        expect(activeTimerCount()).toBe(0);
    });

    test("cancelAllTimers clears pending timers without firing them", async () => {
        _resetTimerServiceForTest();
        const sent: Array<string> = [];

        scheduleTimer({
            client: fakeClient((content) => sent.push(content)),
            channelId: "c1",
            userId: "u1",
            message: "later",
            fireAt: new Date(Date.now() + 10_000),
        });

        expect(activeTimerCount()).toBe(1);
        cancelAllTimers();
        expect(activeTimerCount()).toBe(0);

        await sleep(15);
        expect(sent).toEqual([]);
    });

    test("state is pinned to globalThis so it survives module re-evaluation", () => {
        _resetTimerServiceForTest();
        scheduleTimer({
            client: fakeClient(() => {}),
            channelId: "c1",
            userId: "u1",
            message: "x",
            fireAt: new Date(Date.now() + 10_000),
        });

        const pinned = (globalThis as Record<symbol, unknown>)[Symbol.for("@repo/bot/service/timer")];
        expect(pinned).toBeDefined();
        cancelAllTimers();
    });
});
