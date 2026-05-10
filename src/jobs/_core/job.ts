export type Job = {
    name: string;
    intervalMs: number;
    runOnStart?: boolean;
    run: () => Promise<void> | void;
};
