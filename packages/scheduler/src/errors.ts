export class DuplicateHandlerError extends Error {
    constructor(public readonly type: string) {
        super(`Duplicate scheduled job handler for type "${type}"`);
        this.name = "DuplicateHandlerError";
    }
}
