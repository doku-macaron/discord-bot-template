import type { Result } from "@repo/shared";
import type { AppError } from "@repo/shared/error/appError";

// Dependency seam for the API routes. Injecting these (instead of importing the
// client/services directly) keeps the routes testable without a live Discord client.
// The template ships a single example operation (`ping`); extend AppDeps as you add
// routes that need bot state.
export type AppDeps = {
    adminToken: string;
    isReady: () => boolean;
    ping: () => Result<{ pong: true }, AppError>;
};
