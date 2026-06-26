import { Hono } from "hono";
import type { AppDeps } from "@/server/deps";

// Liveness / readiness, both unauthenticated (for orchestrator probes).
// `/health` only checks that the process responds; `/ready` checks that the Discord
// client has reached ClientReady.
export function healthRoutes(deps: AppDeps): Hono {
    const app = new Hono();

    app.get("/health", (c) => c.json({ status: "ok" }));

    app.get("/ready", (c) => {
        if (deps.isReady()) {
            return c.json({ status: "ready" });
        }
        return c.json({ status: "unavailable" }, 503);
    });

    return app;
}
