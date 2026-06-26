import { describe, expect, test } from "bun:test";
import { EMBED_COLOR, errorEmbed, infoEmbed, successEmbed, warnEmbed } from "@/lib/discord/embed";

function snapshot(embed: ReturnType<typeof successEmbed>) {
    const json = embed.toJSON();
    return {
        title: json.title,
        description: json.description,
        color: json.color,
    };
}

describe("embed helpers", () => {
    test("successEmbed uses success color and sets title + description", () => {
        expect(snapshot(successEmbed("Done", "ok"))).toEqual({
            title: "Done",
            description: "ok",
            color: EMBED_COLOR.success,
        });
    });

    test("errorEmbed uses error color", () => {
        expect(snapshot(errorEmbed("Boom"))).toEqual({
            title: "Boom",
            description: undefined,
            color: EMBED_COLOR.error,
        });
    });

    test("infoEmbed uses info color", () => {
        expect(snapshot(infoEmbed("Hello", "world"))).toEqual({
            title: "Hello",
            description: "world",
            color: EMBED_COLOR.info,
        });
    });

    test("warnEmbed uses warn color", () => {
        expect(snapshot(warnEmbed("Heads up"))).toEqual({
            title: "Heads up",
            description: undefined,
            color: EMBED_COLOR.warn,
        });
    });
});
