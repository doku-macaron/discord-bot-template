import { autocompleteHandler } from "@/events/interactionCreate/commands/autocomplete/_core/autocompleteHandlerInstance";
import { echoAutocomplete } from "@/events/interactionCreate/commands/autocomplete/items/echoAutocomplete";

autocompleteHandler.register(echoAutocomplete);
