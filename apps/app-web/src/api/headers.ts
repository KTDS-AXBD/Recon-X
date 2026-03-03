import { getAuthUser } from "./auth-store";

const API_SECRET =
  (import.meta.env["VITE_INTERNAL_SECRET"] as string | undefined) ?? "dev-secret";

export function buildHeaders(opts: {
  organizationId: string;
  contentType?: string;
}): Record<string, string> {
  const user = getAuthUser();
  const headers: Record<string, string> = {
    "X-Internal-Secret": API_SECRET,
    "X-User-Id": user?.userId ?? "anonymous",
    "X-User-Role": user?.userRole ?? "Client",
    "X-Organization-Id": opts.organizationId,
  };
  if (opts.contentType !== undefined) {
    headers["Content-Type"] = opts.contentType;
  }
  return headers;
}
