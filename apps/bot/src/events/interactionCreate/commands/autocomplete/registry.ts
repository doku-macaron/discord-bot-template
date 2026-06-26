import { echoAutocomplete } from "@/events/interactionCreate/commands/autocomplete/items/echoAutocomplete";
import { AutocompleteHandler } from "@/framework/discord/interactions/autocomplete";

export const autocompleteHandler = new AutocompleteHandler();
autocompleteHandler.register(echoAutocomplete);
