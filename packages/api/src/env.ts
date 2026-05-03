export interface Env {
  // Service Bindings — 6개 (svc-queue-router 내부 전용 제외, llm-router/security/governance/notification/analytics는 AI Foundry 포털로 이관)
  SVC_INGESTION: Fetcher;
  SVC_EXTRACTION: Fetcher;
  SVC_POLICY: Fetcher;
  SVC_ONTOLOGY: Fetcher;
  SVC_SKILL: Fetcher;
  SVC_MCP_SERVER: Fetcher;

  // Secrets
  INTERNAL_API_SECRET: string;
  GATEWAY_JWT_SECRET: string;

  // Vars
  SERVICE_NAME: string;
  ENVIRONMENT: string;
}

/**
 * Service binding key mapping — used by health check to enumerate all services.
 * NOT used for routing (Workers use resource-prefixed routes like /documents, /skills).
 */
export const SERVICE_MAP = {
  ingestion: "SVC_INGESTION",
  extraction: "SVC_EXTRACTION",
  policy: "SVC_POLICY",
  ontology: "SVC_ONTOLOGY",
  skill: "SVC_SKILL",
  mcp: "SVC_MCP_SERVER",
} as const satisfies Record<string, keyof Env>;

export type ServiceName = keyof typeof SERVICE_MAP;

/**
 * Resource-based routing: /api/{resource}/* → binding key.
 * Preserves the resource name in the downstream path.
 * e.g. /api/documents/123 → SVC_INGESTION, downstream = /documents/123
 *
 * This is the PRIMARY routing table. Workers register routes with resource prefixes
 * (e.g. svc-skill handles /skills/*, svc-ingestion handles /documents/*).
 */
export const RESOURCE_MAP: Record<string, keyof Env> = {
  // svc-ingestion
  documents: "SVC_INGESTION",
  // svc-extraction
  extractions: "SVC_EXTRACTION",
  extract: "SVC_EXTRACTION",
  analysis: "SVC_EXTRACTION",
  analyze: "SVC_EXTRACTION",
  factcheck: "SVC_EXTRACTION",
  specs: "SVC_EXTRACTION",
  export: "SVC_EXTRACTION",
  // svc-policy
  policies: "SVC_POLICY",
  sessions: "SVC_POLICY",
  // svc-skill
  skills: "SVC_SKILL",
  // svc-ontology
  terms: "SVC_ONTOLOGY",
  graph: "SVC_ONTOLOGY",
  normalize: "SVC_ONTOLOGY",
};

/**
 * Services that use prefix-stripping: /api/{name}/path → downstream /path.
 * These Workers register routes at root (e.g. /health, /:skillId) without
 * repeating the service name in the path.
 */
export const PREFIX_STRIP_MAP: Record<string, keyof Env> = {
  mcp: "SVC_MCP_SERVER",
};

/** Hono context variables (c.set / c.get) */
export interface Variables {
  userId: string;
  userRole: string;
  organizationId: string;
}

/** App-wide Hono type binding */
export type AppEnv = { Bindings: Env; Variables: Variables };
