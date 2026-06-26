import { Hono } from "hono";
import type { AppDeps } from "@/server/deps";

// Authenticated routes (mounted behind bearerAuth in app.ts). `GET /api/ping` is the
// one example: it returns a Result from deps, demonstrating how a route surfaces an
// AppError as an HTTP status.
export function apiRoutes(deps: AppDeps): Hono {
    const app = new Hono();

    app.get("/ping", (c) => {
        const result = deps.ping();
        if (result.success) {
            return c.json(result.data);
        }
        return c.json({ error: result.error.kind, message: result.error.message }, 500);
    });

    return app;
}
