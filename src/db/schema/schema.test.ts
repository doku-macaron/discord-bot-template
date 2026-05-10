import { describe, expect, test } from "bun:test";
import { schema } from "@/db/schema";

describe("database schema", () => {
    test("exports template tables", () => {
        expect(schema.guilds).toBeDefined();
        expect(schema.members).toBeDefined();
    });

    test("guilds tracks join/leave timestamps", () => {
        expect(schema.guilds.joinedAt).toBeDefined();
        expect(schema.guilds.leftAt).toBeDefined();
    });
});
