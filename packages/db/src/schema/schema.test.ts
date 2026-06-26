import { describe, expect, test } from "bun:test";
import { guildSettings } from "./guildSettings.schema";
import { guilds } from "./guilds.schema";
import { schema } from "./index";
import { memberProfiles } from "./memberProfiles.schema";

describe("database schema", () => {
    test("glob barrel auto-collects the template tables", () => {
        expect(schema.guilds).toBeDefined();
        expect(schema.guildSettings).toBeDefined();
        expect(schema.memberProfiles).toBeDefined();
    });

    test("guilds tracks join/leave timestamps", () => {
        expect(guilds.joinedAt).toBeDefined();
        expect(guilds.leftAt).toBeDefined();
    });

    test("memberProfiles uses (guildId, userId) as identity and stores a bio", () => {
        expect(memberProfiles.guildId).toBeDefined();
        expect(memberProfiles.userId).toBeDefined();
        expect(memberProfiles.bio).toBeDefined();
    });

    test("guildSettings is keyed by guildId and holds per-guild preferences", () => {
        expect(guildSettings.guildId).toBeDefined();
        expect(guildSettings.modRoleId).toBeDefined();
        expect(guildSettings.archiveChannelId).toBeDefined();
    });
});
