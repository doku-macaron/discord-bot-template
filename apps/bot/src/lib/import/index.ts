import { watch } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { isProduction } from "@/isProduction";

const files = new Set<string>();

export const i_import = async <T>(path: string): Promise<T> => {
    if (isProduction) {
        return (await import(path)) as T;
    }

    const { collectImports } = await import("@/lib/import/collector");

    const resolvedPath = normalize(
        require.resolve(path, {
            paths: [dirname(Bun.main)],
        })
    );

    const imports = await collectImports(resolvedPath);

    for (const element of imports) {
        files.add(element);
    }

    const module = (await import(resolvedPath)) as T;
    files.add(resolvedPath);

    return module;
};

export const i_clean = () => {
    let clearedCount = 0;

    for (const file of files) {
        delete require.cache[file];
        clearedCount++;
    }

    files.clear();
    console.debug(`cache cleared: ${clearedCount} module(s) removed`);
};

export const i_watch = (path: string, callback: (filename: string) => void | Promise<void>, debounceTime = 100) => {
    let debounceTimeout: NodeJS.Timeout | null = null;
    const watchDir = join(dirname(Bun.main), path);

    console.debug(`watchdog start: ${watchDir}`);

    const watcher = watch(watchDir, { recursive: true }, (_, filename) => {
        if (!filename) {
            console.warn("watch event received without filename");
            return;
        }

        if (debounceTimeout) {
            clearTimeout(debounceTimeout);
        }

        debounceTimeout = setTimeout(() => {
            Promise.resolve(callback(join(watchDir, filename)))
                .catch((err) => {
                    console.error("watch callback failed:", err);
                })
                .finally(() => {
                    debounceTimeout = null;
                });
        }, debounceTime);
    });

    return () => watcher.close();
};
