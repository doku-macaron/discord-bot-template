import { describe, expect, test } from "bun:test";
import { schema } from "@/db/schema";

describe("database schema", () => {
    test("exports template tables", () => {
        expect(schema.guilds).toBeDefined();
        expect(schema.members).toBeDefined();
    });
});
