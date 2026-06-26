import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { init, parse } from "es-module-lexer";
import { createPathAliasResolver } from "@/lib/import/pathAliasResolver";

// Initialize es-module-lexer
await init;

const { resolveSpecifier } = await createPathAliasResolver();

export async function collectImports(absPath: string, visited = new Set<string>(), results = new Set<string>()): Promise<Set<string>> {
    if (visited.has(absPath)) {
        return results;
    }
    visited.add(absPath);

    const code = await readFile(absPath, "utf-8");
    const [imports] = parse(code);
    const dir = dirname(absPath);

    const tasks: Array<Promise<Set<string>>> = [];

    for (const i of imports) {
        const spec = code.slice(i.s, i.e);

        const finalPath = resolveSpecifier(dir, spec);
        if (!finalPath) {
            continue;
        }

        if (!results.has(finalPath)) {
            results.add(finalPath);
            tasks.push(collectImports(finalPath, visited, results));
        }
    }

    await Promise.all(tasks);
    return results;
}
