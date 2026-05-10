import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Column {
    name: string;
    type: string;
    primaryKey?: boolean;
    notNull?: boolean;
}

interface ForeignKey {
    tableTo: string;
    columnsFrom: Array<string>;
}

interface Table {
    columns: Record<string, Column>;
    foreignKeys?: Record<string, ForeignKey>;
}

interface Snapshot {
    tables: Record<string, Table>;
}

interface Journal {
    entries: Array<{
        tag: string;
    }>;
}

function readJson<T>(filePath: string): T {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

function cleanName(name: string): string {
    return name.replace(/^public\./, "").replaceAll(".", "_");
}

function cleanType(type: string | undefined): string {
    if (!type) {
        return "text";
    }

    return (
        type
            .replace(/\(.+\)$/, "")
            .replace(/\[\]$/, "_array")
            .replaceAll(" ", "_")
            .replaceAll('"', "") || "text"
    );
}

function getLatestSnapshot(): Snapshot {
    const metaDir = path.join(__dirname, "..", "drizzle", "meta");
    const journalPath = path.join(metaDir, "_journal.json");

    if (!fs.existsSync(journalPath)) {
        throw new Error(`Journal not found: ${journalPath}`);
    }

    const journal = readJson<Journal>(journalPath);
    const latestEntry = journal.entries.at(-1);

    if (!latestEntry) {
        throw new Error("_journal.json has no entries.");
    }

    const snapshotNumber = latestEntry.tag.split("_")[0];
    const snapshotPath = path.join(metaDir, `${snapshotNumber}_snapshot.json`);

    if (!fs.existsSync(snapshotPath)) {
        throw new Error(`Snapshot not found: ${snapshotPath}`);
    }

    return readJson<Snapshot>(snapshotPath);
}

function generateERDiagram(snapshot: Snapshot): string {
    const lines: Array<string> = ["erDiagram"];

    for (const [rawTableName, table] of Object.entries(snapshot.tables)) {
        const tableName = cleanName(rawTableName);

        lines.push(`  ${tableName} {`);

        for (const [rawColumnName, column] of Object.entries(table.columns)) {
            const columnName = cleanName(rawColumnName);
            const keyPart = column.primaryKey ? " PK" : "";
            const commentPart = column.notNull ? ' "not null"' : "";

            lines.push(`    ${cleanType(column.type)} ${columnName}${keyPart}${commentPart}`);
        }

        lines.push("  }", "");
    }

    for (const [rawTableName, table] of Object.entries(snapshot.tables)) {
        const fromTable = cleanName(rawTableName);

        for (const foreignKey of Object.values(table.foreignKeys ?? {})) {
            lines.push(`  ${fromTable} }o--|| ${cleanName(foreignKey.tableTo)} : "${foreignKey.columnsFrom.join("_")}"`);
        }
    }

    return `${lines.join("\n")}\n`;
}

try {
    const outputDir = path.join(__dirname, "..", "docs");
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(
        path.join(outputDir, "schema_diagram.md"),
        `\`\`\`mermaid\n${generateERDiagram(getLatestSnapshot())}\`\`\`\n`,
        "utf-8"
    );
    console.log("ER diagram generated.");
} catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
}
