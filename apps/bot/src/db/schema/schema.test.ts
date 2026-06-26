import { describe, expect, test } from "bun:test";
import { schema } from "@/db/schema";

describe("database schema", () => {
    test("exports template tables", () => {
        expect(schema.guilds).toBeDefined();
        expect(schema.guildSettings).toBeDefined();
        expect(schema.memberProfiles).toBeDefined();
    });

    test("guilds tracks join/leave timestamps", () => {
        expect(schema.guilds.joinedAt).toBeDefined();
        expect(schema.guilds.leftAt).toBeDefined();
    });

    test("memberProfiles uses (guildId, userId) as identity and stores a bio", () => {
        expect(schema.memberProfiles.guildId).toBeDefined();
        expect(schema.memberProfiles.userId).toBeDefined();
        expect(schema.memberProfiles.bio).toBeDefined();
    });

    test("guildSettings is keyed by guildId and holds per-guild preferences", () => {
        expect(schema.guildSettings.guildId).toBeDefined();
        expect(schema.guildSettings.modRoleId).toBeDefined();
        expect(schema.guildSettings.archiveChannelId).toBeDefined();
    });
});
