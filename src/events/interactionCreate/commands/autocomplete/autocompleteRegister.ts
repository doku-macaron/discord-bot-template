import { echoAutocomplete } from "@/events/interactionCreate/commands/autocomplete/items/echoAutocomplete";
import { autocompleteHandler } from "@/framework/discord/interactions/autocomplete/autocompleteHandlerInstance";

autocompleteHandler.register(echoAutocomplete);
