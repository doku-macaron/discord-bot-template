import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TableEntity {
    entityType: "tables";
    name: string;
    schema: string;
}

interface ColumnEntity {
    entityType: "columns";
    name: string;
    table: string;
    schema: string;
    type: string;
    notNull: boolean;
}

interface ForeignKeyEntity {
    entityType: "fks";
    table: string;
    schema: string;
    columns: Array<string>;
    tableTo: string;
    schemaTo: string;
}

interface PrimaryKeyEntity {
    entityType: "pks";
    table: string;
    schema: string;
    columns: Array<string>;
}

type DdlEntity = TableEntity | ColumnEntity | ForeignKeyEntity | PrimaryKeyEntity | { entityType: string };

interface Snapshot {
    ddl: Array<DdlEntity>;
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
    const drizzleDir = path.join(__dirname, "..", "drizzle");

    if (!fs.existsSync(drizzleDir)) {
        throw new Error(`Drizzle directory not found: ${drizzleDir}`);
    }

    const migrationDirs = fs
        .readdirSync(drizzleDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && /^\d/.test(entry.name))
        .map((entry) => entry.name)
        .sort();

    const latest = migrationDirs.at(-1);

    if (!latest) {
        throw new Error(`No migration folders found in ${drizzleDir}`);
    }

    const snapshotPath = path.join(drizzleDir, latest, "snapshot.json");

    if (!fs.existsSync(snapshotPath)) {
        throw new Error(`Snapshot not found: ${snapshotPath}`);
    }

    return readJson<Snapshot>(snapshotPath);
}

function generateERDiagram(snapshot: Snapshot): string {
    const tables = new Map<
        string,
        { columns: Array<ColumnEntity>; primaryKeyColumns: Set<string>; foreignKeys: Array<ForeignKeyEntity> }
    >();

    for (const entity of snapshot.ddl) {
        if (entity.entityType === "tables") {
            const t = entity as TableEntity;
            const key = `${t.schema}.${t.name}`;
            tables.set(key, { columns: [], primaryKeyColumns: new Set(), foreignKeys: [] });
        }
    }

    for (const entity of snapshot.ddl) {
        if (entity.entityType === "columns") {
            const c = entity as ColumnEntity;
            tables.get(`${c.schema}.${c.table}`)?.columns.push(c);
        } else if (entity.entityType === "pks") {
            const pk = entity as PrimaryKeyEntity;
            const bucket = tables.get(`${pk.schema}.${pk.table}`);
            for (const col of pk.columns) {
                bucket?.primaryKeyColumns.add(col);
            }
        } else if (entity.entityType === "fks") {
            const fk = entity as ForeignKeyEntity;
            tables.get(`${fk.schema}.${fk.table}`)?.foreignKeys.push(fk);
        }
    }

    const lines: Array<string> = ["erDiagram"];

    for (const [rawTableName, table] of tables) {
        const tableName = cleanName(rawTableName);
        lines.push(`  ${tableName} {`);

        for (const column of table.columns) {
            const keyPart = table.primaryKeyColumns.has(column.name) ? " PK" : "";
            const commentPart = column.notNull ? ' "not null"' : "";
            lines.push(`    ${cleanType(column.type)} ${cleanName(column.name)}${keyPart}${commentPart}`);
        }

        lines.push("  }", "");
    }

    for (const [rawTableName, table] of tables) {
        const fromTable = cleanName(rawTableName);

        for (const fk of table.foreignKeys) {
            const toTable = cleanName(`${fk.schemaTo}.${fk.tableTo}`);
            lines.push(`  ${fromTable} }o--|| ${toTable} : "${fk.columns.join("_")}"`);
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
