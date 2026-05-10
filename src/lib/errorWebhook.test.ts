import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";

type CapturedSend = { content?: string };

const sentMessages: Array<CapturedSend> = [];
const constructedUrls: Array<string> = [];

class FakeWebhookClient {
    constructor(options: { url: string }) {
        constructedUrls.push(options.url);
    }
    async send(payload: CapturedSend) {
        sentMessages.push(payload);
    }
}

// `mock.module` and env setup must run before `@/lib/errorWebhook` is imported,
// so they're at module top-level rather than in `beforeAll`.
const previousWebhookUrl = process.env.WEBHOOK_URL;
process.env.WEBHOOK_URL = "https://discord.com/api/webhooks/123/test-token";

mock.module("discord.js", () => ({
    codeBlock: (lang: string, content: string) => `\`\`\`${lang}\n${content}\n\`\`\``,
    WebhookClient: FakeWebhookClient,
}));

const { sendErrorToWebhook } = await import("@/lib/errorWebhook");

afterAll(() => {
    if (previousWebhookUrl === undefined) {
        delete process.env.WEBHOOK_URL;
    } else {
        process.env.WEBHOOK_URL = previousWebhookUrl;
    }
});

beforeEach(() => {
    sentMessages.length = 0;
    constructedUrls.length = 0;
});

describe("sendErrorToWebhook", () => {
    test("sends a codeBlock-formatted body with category and stack", async () => {
        const error = new Error("kaboom");
        error.stack = "Error: kaboom\n    at test:1:1";

        await sendErrorToWebhook("Bot", error);

        expect(sentMessages.length).toBe(1);
        const content = sentMessages[0]?.content ?? "";
        expect(content).toContain("**Discord Bot Error**");
        expect(content).toContain("category: Bot");
        expect(content).toContain("Error: kaboom");
        expect(content).toContain("```ml");
    });

    test("truncates content longer than the cap", async () => {
        const longMessage = "x".repeat(2_500);
        const error = new Error(longMessage);
        error.stack = `Error: ${longMessage}`;

        await sendErrorToWebhook("Bot", error);

        const content = sentMessages[0]?.content ?? "";
        expect(content.length).toBeLessThanOrEqual(1_950);
        expect(content.endsWith("...truncated")).toBe(true);
    });

    test("reuses the WebhookClient singleton across calls", async () => {
        await sendErrorToWebhook("Bot", new Error("first"));
        await sendErrorToWebhook("Bot", new Error("second"));

        expect(sentMessages.length).toBe(2);
        // First call may have created the client in an earlier test. Either way,
        // subsequent calls in this test should not construct a new one.
        expect(constructedUrls.length).toBeLessThanOrEqual(1);
    });
});
