import { afterEach, describe, expect, test } from "bun:test";
import { registerShutdownTask, resetShutdownForTesting, runShutdown, SHUTDOWN_PRIORITY } from "@/lib/shutdown";

afterEach(() => {
    resetShutdownForTesting();
});

describe("runShutdown task ordering", () => {
    test("runs tasks ordered by priority ascending", async () => {
        const order: Array<string> = [];

        registerShutdownTask({
            name: "database",
            priority: SHUTDOWN_PRIORITY.DATABASE,
            run: () => {
                order.push("database");
            },
        });
        registerShutdownTask({
            name: "discord-client",
            priority: SHUTDOWN_PRIORITY.DISCORD_CLIENT,
            run: () => {
                order.push("discord-client");
            },
        });
        registerShutdownTask({
            name: "scheduled-jobs",
            priority: SHUTDOWN_PRIORITY.JOBS,
            run: () => {
                order.push("scheduled-jobs");
            },
        });

        await runShutdown("SIGTEST");

        expect(order).toEqual(["scheduled-jobs", "discord-client", "database"]);
    });

    test("tasks without explicit priority default to 100 (between jobs and database)", async () => {
        const order: Array<string> = [];

        registerShutdownTask({
            name: "database",
            priority: SHUTDOWN_PRIORITY.DATABASE,
            run: () => {
                order.push("database");
            },
        });
        registerShutdownTask({
            name: "scheduled-jobs",
            priority: SHUTDOWN_PRIORITY.JOBS,
            run: () => {
                order.push("scheduled-jobs");
            },
        });
        registerShutdownTask({
            name: "unprioritized",
            run: () => {
                order.push("unprioritized");
            },
        });

        await runShutdown("SIGTEST");

        expect(order).toEqual(["scheduled-jobs", "unprioritized", "database"]);
    });

    test("runShutdown is idempotent within the same process", async () => {
        const runs: Array<string> = [];
        registerShutdownTask({
            name: "task",
            run: () => {
                runs.push("task");
            },
        });

        await runShutdown("SIGTEST");
        await runShutdown("SIGTEST");

        expect(runs).toEqual(["task"]);
    });

    test("aborts hung task after taskTimeoutMs and moves on", async () => {
        const completed: Array<string> = [];

        registerShutdownTask({
            name: "hang",
            run: () =>
                new Promise<void>(() => {
                    // never resolves — should be aborted by the timeout
                }),
        });
        registerShutdownTask({
            name: "after",
            run: () => {
                completed.push("after");
            },
        });

        await runShutdown("SIGTEST", { taskTimeoutMs: 20 });

        expect(completed).toEqual(["after"]);
    });

    test("isolates a task throw so later tasks still run", async () => {
        const completed: Array<string> = [];

        registerShutdownTask({
            name: "throws",
            run: () => {
                throw new Error("task boom");
            },
        });
        registerShutdownTask({
            name: "after",
            run: () => {
                completed.push("after");
            },
        });

        await runShutdown("SIGTEST");

        expect(completed).toEqual(["after"]);
    });
});
