import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

/**
 * Local dev proxy — mirrors Pages Functions routing (functions/api/[[path]].ts)
 * Maps /api/{segment} to the correct local Worker port with path rewrite.
 */
const LOCAL_ROUTE_TABLE: Record<string, number> = {
  documents: 8701, // svc-ingestion
  extractions: 8702, // svc-extraction
  extract: 8702, // svc-extraction
  policies: 8703, // svc-policy
  sessions: 8703, // svc-policy
  terms: 8704, // svc-ontology
  graph: 8704, // svc-ontology
  normalize: 8704, // svc-ontology
  skills: 8705, // svc-skill
  audit: 8707, // svc-security
  cost: 8708, // svc-governance
  trust: 8708, // svc-governance
  prompts: 8708, // svc-governance
  "golden-tests": 8708, // svc-governance
  notifications: 8709, // svc-notification
  kpi: 8710, // svc-analytics
  dashboards: 8710, // svc-analytics
};

function buildProxy() {
  const proxy: Record<string, object> = {};
  for (const [segment, port] of Object.entries(LOCAL_ROUTE_TABLE)) {
    proxy[`/api/${segment}`] = {
      target: `http://localhost:${String(port)}`,
      rewrite: (p: string) => p.replace(/^\/api/, ""),
      changeOrigin: true,
    };
  }
  return proxy;
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: buildProxy(),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
