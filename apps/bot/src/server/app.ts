import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import type { AppDeps } from "@/server/deps";
import { apiRoutes } from "@/server/routes/api";
import { healthRoutes } from "@/server/routes/health";

// Assemble the internal API. `/health` `/ready` are unauthenticated (probes); `/api/*`
// is bearer-authenticated. The auth middleware is registered before the route mount so
// it reliably wraps everything under /api.
export function createApp(deps: AppDeps): Hono {
    const app = new Hono();

    app.route("/", healthRoutes(deps));

    app.use("/api/*", bearerAuth({ token: deps.adminToken }));
    app.route("/api", apiRoutes(deps));

    return app;
}
