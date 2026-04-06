export interface Env {
  // Service Bindings
  SVC_INGESTION: Fetcher;
  SVC_EXTRACTION: Fetcher;
  SVC_POLICY: Fetcher;
  SVC_ONTOLOGY: Fetcher;
  SVC_SKILL: Fetcher;
  SVC_LLM_ROUTER: Fetcher;
  SVC_SECURITY: Fetcher;
  SVC_GOVERNANCE: Fetcher;
  SVC_NOTIFICATION: Fetcher;
  SVC_ANALYTICS: Fetcher;
  SVC_MCP_SERVER: Fetcher;

  // Secrets
  INTERNAL_API_SECRET: string;
  GATEWAY_JWT_SECRET: string;

  // Vars
  SERVICE_NAME: string;
  ENVIRONMENT: string;
}

/** Route prefix → service binding key mapping */
export const SERVICE_MAP = {
  ingestion: "SVC_INGESTION",
  extraction: "SVC_EXTRACTION",
  policy: "SVC_POLICY",
  ontology: "SVC_ONTOLOGY",
  skills: "SVC_SKILL",
  llm: "SVC_LLM_ROUTER",
  security: "SVC_SECURITY",
  governance: "SVC_GOVERNANCE",
  notification: "SVC_NOTIFICATION",
  analytics: "SVC_ANALYTICS",
  mcp: "SVC_MCP_SERVER",
} as const satisfies Record<string, keyof Env>;

export type ServiceName = keyof typeof SERVICE_MAP;

/** Hono context variables (c.set / c.get) */
export interface Variables {
  userId: string;
  userRole: string;
  organizationId: string;
}

/** App-wide Hono type binding */
export type AppEnv = { Bindings: Env; Variables: Variables };
