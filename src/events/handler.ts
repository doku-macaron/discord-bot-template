import type { AnySelectMenuInteraction, ButtonInteraction, CommandInteraction, ModalSubmitInteraction } from "discord.js";

type InteractionTypes = CommandInteraction | ButtonInteraction | ModalSubmitInteraction | AnySelectMenuInteraction;

export interface Handler<T, I = InteractionTypes, G = string> {
    get handlers(): Array<T>;
    register(registerHandle: T): void;
    get(handleName: G): T | undefined;
    execute(interaction: I): Promise<void>;
}

export interface BaseItem<T, I> {
    data: T;
    execute: (interaction: I) => Promise<void>;
}
