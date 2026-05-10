import { autocompleteHandler } from "@/events/interactionCreate/commands/autocomplete/autocompleteHandlerInstance";
import { echoAutocomplete } from "@/events/interactionCreate/commands/autocomplete/items/echoAutocomplete";

autocompleteHandler.register(echoAutocomplete);
