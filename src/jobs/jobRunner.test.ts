import { afterEach, describe, expect, test } from "bun:test";
import type { Job } from "@/jobs/job";
import { getScheduledJobNamesForTesting, resetJobsForTesting, runJobForTesting, startJobs } from "@/jobs/jobRunner";
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
