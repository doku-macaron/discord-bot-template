import { AutocompleteHandler } from "@/events/interactionCreate/interactions/autocompleteHandler";
import { echoAutocomplete } from "@/events/interactionCreate/interactions/autocompletes/echoAutocomplete";

export const autocompleteHandler = new AutocompleteHandler();

autocompleteHandler.register(echoAutocomplete);
