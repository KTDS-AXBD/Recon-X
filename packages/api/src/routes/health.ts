import { Hono } from "hono";
import { SERVICE_MAP, type AppEnv } from "../env.js";

const health = new Hono<AppEnv>();

health.get("/health", async (c) => {
  const results: Record<string, { status: string; latencyMs: number }> = {};

  const checks = Object.entries(SERVICE_MAP).map(async ([name, bindingKey]) => {
    const fetcher = c.env[bindingKey] as Fetcher;
    const start = Date.now();
    try {
      const res = await fetcher.fetch(new Request("https://internal/health"));
      results[name] = {
        status: res.ok ? "healthy" : "unhealthy",
        latencyMs: Date.now() - start,
      };
    } catch {
      results[name] = { status: "unreachable", latencyMs: Date.now() - start };
    }
  });

  await Promise.allSettled(checks);

  const allHealthy = Object.values(results).every((r) => r.status === "healthy");
  return c.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      services: results,
      timestamp: new Date().toISOString(),
    },
    allHealthy ? 200 : 503,
  );
});

export { health };
