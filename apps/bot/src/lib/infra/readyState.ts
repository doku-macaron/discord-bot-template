// Tracks whether the Discord client has reached ClientReady. Kept here (not under
// server/) so the optional API server can read it without clientReady depending on
// server/ — deleting the server module never breaks the bot. Pinned to globalThis so
// the flag survives dev hot reloads.
const READY_KEY = Symbol.for("@repo/bot/clientReady");

type GlobalWithReady = typeof globalThis & { [READY_KEY]?: boolean };

export function markClientReady(): void {
    (globalThis as GlobalWithReady)[READY_KEY] = true;
}

export function isClientReady(): boolean {
    return (globalThis as GlobalWithReady)[READY_KEY] === true;
}
