import { describe, expect, test } from "bun:test";
import { Autocomplete, AutocompleteHandler } from "@/events/interactionCreate/interactions/autocompleteHandler";
import { type AutocompleteResponseRecorder, createAutocompleteInteractionMock } from "@/lib/testing/interactions";

function createRecorder(): AutocompleteResponseRecorder {
    return { responses: [] };
}

describe("AutocompleteHandler", () => {
    test("executes registered autocomplete", async () => {
        const handler = new AutocompleteHandler();
        const recorder = createRecorder();

        handler.register(
            new Autocomplete("echo", async (interaction) => {
                await interaction.respond([{ name: "Hello", value: "Hello" }]);
            })
        );

        await handler.execute(createAutocompleteInteractionMock("echo", recorder));

        expect(recorder.responses).toEqual([[{ name: "Hello", value: "Hello" }]]);
    });

    test("responds with empty choices for unregistered command", async () => {
        const handler = new AutocompleteHandler();
        const recorder = createRecorder();

        await handler.execute(createAutocompleteInteractionMock("unknown", recorder));

        expect(recorder.responses).toEqual([[]]);
    });

    test("responds with empty choices when handler throws", async () => {
        const handler = new AutocompleteHandler();
        const recorder = createRecorder();

        handler.register(
            new Autocomplete("broken", async () => {
                throw new Error("boom");
            })
        );

        await handler.execute(createAutocompleteInteractionMock("broken", recorder));

        expect(recorder.responses).toEqual([[]]);
    });

    test("does not respond again when handler already responded before throwing", async () => {
        const handler = new AutocompleteHandler();
        const recorder = createRecorder();

        handler.register(
            new Autocomplete("partial", async (interaction) => {
                await interaction.respond([{ name: "early", value: "early" }]);
                throw new Error("late failure");
            })
        );

        await handler.execute(createAutocompleteInteractionMock("partial", recorder));

        expect(recorder.responses).toEqual([[{ name: "early", value: "early" }]]);
    });
});
