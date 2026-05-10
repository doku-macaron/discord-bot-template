import { Autocomplete } from "@/events/interactionCreate/interactions/autocompleteHandler";

const SUGGESTIONS = ["Hello!", "Hi there!", "Hey!", "Good morning!", "Good evening!", "Good night!"];

export const echoAutocomplete = new Autocomplete("echo", async (interaction) => {
    const focused = interaction.options.getFocused().toLowerCase();
    const matches = SUGGESTIONS.filter((value) => value.toLowerCase().includes(focused)).slice(0, 25);
    await interaction.respond(matches.map((value) => ({ name: value, value })));
});
