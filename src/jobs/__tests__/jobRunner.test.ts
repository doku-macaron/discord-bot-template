import { afterEach, describe, expect, test } from "bun:test";
import type { Job } from "@/jobs/_core/job";
import { getScheduledJobNamesForTesting, resetJobsForTesting, runJobForTesting, startJobs } from "@/jobs/_core/jobRunner";
import { resetShutdownForTesting } from "@/lib/shutdown";

afterEach(() => {
    resetJobsForTesting();
    resetShutdownForTesting();
});

describe("startJobs intervalMs validation", () => {
    test("skips jobs with intervalMs <= 0", () => {
        startJobs([
            { name: "zero", intervalMs: 0, run: () => {} },
            { name: "negative", intervalMs: -1, run: () => {} },
            { name: "ok", intervalMs: 60_000, run: () => {} },
        ]);

        expect(getScheduledJobNamesForTesting()).toEqual(["ok"]);
    });

    test("skips jobs with non-finite intervalMs", () => {
        startJobs([
            { name: "infinity", intervalMs: Number.POSITIVE_INFINITY, run: () => {} },
            { name: "nan", intervalMs: Number.NaN, run: () => {} },
            { name: "ok", intervalMs: 60_000, run: () => {} },
        ]);

        expect(getScheduledJobNamesForTesting()).toEqual(["ok"]);
    });

    test("registers valid jobs only once per name", () => {
        startJobs([
            { name: "dup", intervalMs: 60_000, run: () => {} },
            { name: "dup", intervalMs: 30_000, run: () => {} },
        ]);

        expect(getScheduledJobNamesForTesting()).toEqual(["dup"]);
    });
});

describe("startJobs lifecycle", () => {
    test("runOnStart triggers an immediate run before the first interval tick", async () => {
        let runs = 0;
        const job: Job = {
            name: "immediate",
            intervalMs: 60_000,
            runOnStart: true,
            run: () => {
                runs += 1;
            },
        };

        startJobs([job]);
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(runs).toBe(1);
        expect(getScheduledJobNamesForTesting()).toEqual(["immediate"]);
    });

    test("ignores a second startJobs call while already started", () => {
        startJobs([{ name: "first", intervalMs: 60_000, run: () => {} }]);
        startJobs([{ name: "second", intervalMs: 60_000, run: () => {} }]);

        expect(getScheduledJobNamesForTesting()).toEqual(["first"]);
    });

    test("stopJobs allows startJobs to be called again afterwards", () => {
        startJobs([{ name: "a", intervalMs: 60_000, run: () => {} }]);
        resetJobsForTesting();

        startJobs([{ name: "b", intervalMs: 60_000, run: () => {} }]);

        expect(getScheduledJobNamesForTesting()).toEqual(["b"]);
    });
});

describe("runJob overlap guard", () => {
    test("skips concurrent runs of the same job", async () => {
        let resolveFirst: (() => void) | undefined;
        const firstStarted = new Promise<void>((resolve) => {
            resolveFirst = resolve;
        });
        let release: (() => void) | undefined;
        const block = new Promise<void>((resolve) => {
            release = resolve;
        });

        let runCount = 0;
        const job: Job = {
            name: "long",
            intervalMs: 60_000,
            run: async () => {
                runCount += 1;
                resolveFirst?.();
                await block;
            },
        };

        const firstRun = runJobForTesting(job);
        await firstStarted;

        await runJobForTesting(job);
        expect(runCount).toBe(1);

        release?.();
        await firstRun;

        await runJobForTesting(job);
        expect(runCount).toBe(2);
    });

    test("releases the lock even if the job throws", async () => {
        let runCount = 0;
        const job: Job = {
            name: "throws",
            intervalMs: 60_000,
            run: async () => {
                runCount += 1;
                throw new Error("boom");
            },
        };

        await runJobForTesting(job);
        await runJobForTesting(job);

        expect(runCount).toBe(2);
    });
});
