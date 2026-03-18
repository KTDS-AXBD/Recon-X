import type { BrownfieldContext } from "@ai-foundry/types";

const POLICY_QUERY = `SELECT policy_code, title, domain FROM policies WHERE organization_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 200`;
const TERM_QUERY = `SELECT name, definition FROM terms WHERE organization_id = ? ORDER BY created_at DESC LIMIT 200`;

interface PolicyRow {
  policy_code: string | null;
  title: string | null;
  domain: string | null;
}

interface TermRow {
  name: string | null;
  definition: string | null;
}

// ── BrownfieldExplorer ──────────────────────────────────────────────

export class BrownfieldExplorer {
  /**
   * Scans existing policy & ontology data for an organization.
   * Provides downstream stages with context to avoid duplicate generation.
   *
   * Queries:
   *  - db-policy: approved policies (code, title, domain)
   *  - db-ontology: terms (name, definition)
   *  - Builds domain distribution (count by domain field)
   */
  async explore(
    orgId: string,
    policyDb: D1Database,
    ontologyDb: D1Database,
  ): Promise<BrownfieldContext> {
    const [policyResult, termResult] = await Promise.all([
      policyDb.prepare(POLICY_QUERY).bind(orgId).all<PolicyRow>(),
      ontologyDb.prepare(TERM_QUERY).bind(orgId).all<TermRow>(),
    ]);

    const policyRows = policyResult.results ?? [];
    const termRows = termResult.results ?? [];

    // Extract policy codes (filter nulls)
    const existingPolicyCodes: string[] = [];
    for (const row of policyRows) {
      if (row.policy_code) {
        existingPolicyCodes.push(row.policy_code);
      }
    }

    // Extract terms
    const existingTerms: BrownfieldContext["existingTerms"] = [];
    for (const row of termRows) {
      existingTerms.push({
        termId: row.name ?? "",
        label: row.name ?? "",
        termType: "term",
      });
    }

    // Build domain distribution
    const domainDistribution: Record<string, number> = {};
    for (const row of policyRows) {
      const domain = row.domain ?? "unknown";
      domainDistribution[domain] = (domainDistribution[domain] ?? 0) + 1;
    }

    return {
      existingPolicyCodes,
      existingTerms,
      domainDistribution,
      totalPolicies: policyRows.length,
      totalTerms: termRows.length,
      scannedAt: new Date().toISOString(),
    };
  }
}
