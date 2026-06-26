import { describe, expect, test } from "bun:test";
import { buildInteractionContext, formatInteractionContext } from "@/lib/discord/interactionContext";
import { createKindInteractionMock } from "@/lib/testing/interactions";

describe("buildInteractionContext", () => {
    test("detects button and surfaces customId", () => {
        const interaction = createKindInteractionMock("button", { customId: "profile:edit-button" });
        const ctx = buildInteractionContext(interaction);

        expect(ctx.type).toBe("button");
        expect(ctx.customId).toBe("profile:edit-button");
    });

    test("detects modal", () => {
        const interaction = createKindInteractionMock("modal", { customId: "profile:edit-modal" });
        expect(buildInteractionContext(interaction).type).toBe("modal");
    });

    test("detects each select menu variant", () => {
        const cases = [
            ["string-select", "string-select"] as const,
            ["user-select", "user-select"] as const,
            ["role-select", "role-select"] as const,
            ["channel-select", "channel-select"] as const,
            ["mentionable-select", "mentionable-select"] as const,
        ];

        for (const [kind, expected] of cases) {
            const interaction = createKindInteractionMock(kind, { customId: `feature:${kind}` });
            expect(buildInteractionContext(interaction).type).toBe(expected);
        }
    });

    test("detects autocomplete and surfaces commandName", () => {
        const interaction = createKindInteractionMock("autocomplete", { commandName: "echo" });
        const ctx = buildInteractionContext(interaction);

        expect(ctx.type).toBe("autocomplete");
        expect(ctx.commandName).toBe("echo");
    });

    test("detects chat input and joins commandName / group / subcommand", () => {
        const interaction = createKindInteractionMock("chat-input", {
            commandName: "admin",
            options: {
                getSubcommandGroup: (_required = false) => "users",
                getSubcommand: (_required = false) => "report-user-select",
            },
        });
        const ctx = buildInteractionContext(interaction);

        expect(ctx.type).toBe("command");
        expect(ctx.commandName).toBe("admin users report-user-select");
    });

    test("detects context menu", () => {
        const interaction = createKindInteractionMock("context-menu", { commandName: "Report message" });
        const ctx = buildInteractionContext(interaction);

        expect(ctx.type).toBe("context-menu");
        expect(ctx.commandName).toBe("Report message");
    });

    test("returns 'unknown' for unrecognized interaction kinds", () => {
        const interaction = {
            isButton: () => false,
            isModalSubmit: () => false,
            isStringSelectMenu: () => false,
            isUserSelectMenu: () => false,
            isRoleSelectMenu: () => false,
            isChannelSelectMenu: () => false,
            isMentionableSelectMenu: () => false,
            isAutocomplete: () => false,
            isChatInputCommand: () => false,
            isContextMenuCommand: () => false,
            user: { id: "u", username: "u" },
            guildId: null,
            channelId: null,
            id: "i",
            createdTimestamp: Date.now(),
        };
        expect(buildInteractionContext(interaction as never).type).toBe("unknown");
    });
});

describe("formatInteractionContext", () => {
    test("renders dashes for empty fields", () => {
        const interaction = createKindInteractionMock("button", { customId: "profile:edit-button" });
        const text = formatInteractionContext(buildInteractionContext(interaction));

        expect(text).toContain("type: button");
        expect(text).toContain("command: -");
        expect(text).toContain("guild: -");
        expect(text).toContain("channel: -");
    });
});
