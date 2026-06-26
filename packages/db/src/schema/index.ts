import { isTable, type Table } from "drizzle-orm";

// Auto-collect every `**/*.schema.ts` under this directory. A new table file is
// picked up just by following the `<name>.schema.ts` naming rule (subdirectories
// allowed) — no need to edit this barrel or the drizzle config by hand.
//
// Bun has no `import.meta.glob`, so discovery runs at module load via `Bun.Glob`
// plus dynamic import. The top-level await makes this a one-time initialization, so
// importers (`@repo/db/schema`) always see a fully populated `schema` object.
const glob = new Bun.Glob("**/*.schema.ts");
const tableEntries: Array<[string, Table]> = [];
for await (const fileName of glob.scan({ cwd: import.meta.dir })) {
    const mod = (await import(`./${fileName}`)) as Record<string, unknown>;
    for (const [exportName, value] of Object.entries(mod)) {
        if (isTable(value)) {
            tableEntries.push([exportName, value]);
        }
    }
}
// Sort for a deterministic order (stable relations evaluation and tests).
tableEntries.sort(([a], [b]) => a.localeCompare(b));

export const schema = Object.fromEntries(tableEntries) as Record<string, Table>;

export { relations } from "./relations";
