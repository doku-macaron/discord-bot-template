import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

type TsConfig = {
    compilerOptions?: {
        paths?: Record<string, Array<string>>;
    };
};

type PathAliasResolver = {
    resolveSpecifier(fromDir: string, spec: string): string | null;
};

function matchPathPattern(pattern: string, spec: string): string | null {
    const starindex = pattern.indexOf("*");

    if (starindex === -1) {
        return pattern === spec ? "" : null;
    }

    if (pattern.indexOf("*", starindex + 1) !== -1) {
        throw new Error(`Invalid path pattern: ${pattern} (multiple '*' not allowed)`);
    }

    const prefix = pattern.slice(0, starindex);
    const suffix = pattern.slice(starindex + 1);

    if (!(spec.startsWith(prefix) && spec.endsWith(suffix))) {
        return null;
    }

    return spec.slice(prefix.length, spec.length - suffix.length);
}

function applyPathTarget(target: string, wildcard: string): string {
    return target.includes("*") ? target.replace("*", wildcard) : target;
}

export async function createPathAliasResolver(tsconfigPath = resolve("tsconfig.json")): Promise<PathAliasResolver> {
    const raw = await readFile(tsconfigPath, "utf-8");
    const tsconfig = JSON.parse(raw) as TsConfig;

    const configDir = dirname(tsconfigPath);

    const paths = tsconfig.compilerOptions?.paths ?? {};

    return {
        resolveSpecifier(fromDir: string, spec: string): string | null {
            // relative / absolute
            if (spec.startsWith(".") || spec.startsWith("/")) {
                try {
                    return require.resolve(spec, { paths: [fromDir] });
                } catch {
                    return null;
                }
            }

            // tsconfig paths
            for (const [pattern, targets] of Object.entries(paths)) {
                const m = matchPathPattern(pattern, spec);
                if (m === null) {
                    continue;
                }

                for (const target of targets) {
                    const mapped = applyPathTarget(target, m);
                    const abs = resolve(configDir, mapped);

                    try {
                        return require.resolve(abs, { paths: [configDir, fromDir] });
                    } catch {
                        // try next candidate
                    }
                }
            }

            // external package or unresolved
            return null;
        },
    };
}
