import { useState, useEffect } from "react";
import { fetchSkills } from "../api/skill.ts";
import { fetchAuditLogs, type AuditRow } from "../api/security.ts";

interface KpiData {
  totalSkills: number;
  totalPolicies: number;
  trustDistribution: Record<string, number>;
  recentActivity: AuditRow[];
}

const TRUST_COLORS: Record<string, string> = {
  unreviewed: "#9ca3af",
  reviewed: "#f59e0b",
  validated: "#22c55e",
};

const TRUST_LABELS: Record<string, string> = {
  unreviewed: "미검토",
  reviewed: "검토됨",
  validated: "검증됨",
};

export default function DashboardPage() {
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchSkills({ limit: 100 }),
      fetchAuditLogs({ limit: 10 }),
    ])
      .then(([skillsRes, auditRes]) => {
        if (cancelled) return;

        const data: KpiData = {
          totalSkills: 0,
          totalPolicies: 0,
          trustDistribution: {},
          recentActivity: [],
        };

        if (skillsRes.success) {
          data.totalSkills = skillsRes.data.skills.length;
          for (const skill of skillsRes.data.skills) {
            data.totalPolicies += skill.policyCount;
            const level = skill.trust.level;
            data.trustDistribution[level] =
              (data.trustDistribution[level] ?? 0) + 1;
          }
        }

        if (auditRes.success) {
          data.recentActivity = auditRes.data.items;
        }

        setKpi(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "대시보드 데이터를 불러오는 데 실패했습니다.",
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8f9fa",
        padding: "24px 32px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 700,
            color: "#111827",
            margin: 0,
          }}
        >
          대시보드
        </h1>
        <p
          style={{
            color: "#6b7280",
            marginTop: "6px",
            marginBottom: 0,
            fontSize: "14px",
          }}
        >
          AI Foundry KPI 요약 및 현황을 확인합니다.
        </p>
      </div>

      {/* Error */}
      {error !== null && (
        <div
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            padding: "12px 16px",
            color: "#dc2626",
            marginBottom: "16px",
            fontSize: "14px",
          }}
        >
          오류: {error}
        </div>
      )}

      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "64px",
            color: "#9ca3af",
            fontSize: "14px",
          }}
        >
          불러오는 중...
        </div>
      ) : kpi !== null ? (
        <>
          {/* KPI cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <KpiCard label="총 Skill 수" value={String(kpi.totalSkills)} color="#3b82f6" />
            <KpiCard label="총 정책 수" value={String(kpi.totalPolicies)} color="#8b5cf6" />
            <KpiCard
              label="검증된 Skill"
              value={String(kpi.trustDistribution["validated"] ?? 0)}
              color="#22c55e"
            />
            <KpiCard
              label="최근 감사 이벤트"
              value={String(kpi.recentActivity.length)}
              color="#f59e0b"
            />
          </div>

          {/* Trust distribution */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              padding: "24px",
              marginBottom: "16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "16px",
              }}
            >
              Trust Level 분포
            </div>
            {kpi.totalSkills === 0 ? (
              <div style={{ fontSize: "14px", color: "#9ca3af" }}>
                Skill 데이터 없음
              </div>
            ) : (
              <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
                {(["unreviewed", "reviewed", "validated"] as const).map(
                  (level) => {
                    const count = kpi.trustDistribution[level] ?? 0;
                    const pct =
                      kpi.totalSkills > 0
                        ? Math.round((count / kpi.totalSkills) * 100)
                        : 0;
                    const color = TRUST_COLORS[level] ?? "#9ca3af";
                    const label = TRUST_LABELS[level] ?? level;
                    return (
                      <div key={level} style={{ flex: 1, minWidth: "120px" }}>
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#6b7280",
                            marginBottom: "6px",
                          }}
                        >
                          {label}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: "6px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "28px",
                              fontWeight: 700,
                              color,
                            }}
                          >
                            {count}
                          </span>
                          <span
                            style={{ fontSize: "13px", color: "#9ca3af" }}
                          >
                            ({pct}%)
                          </span>
                        </div>
                        <div
                          style={{
                            marginTop: "8px",
                            height: "6px",
                            backgroundColor: "#f3f4f6",
                            borderRadius: "3px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: "100%",
                              backgroundColor: color,
                              borderRadius: "3px",
                            }}
                          />
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "16px",
              }}
            >
              최근 활동
            </div>
            {kpi.recentActivity.length === 0 ? (
              <div style={{ fontSize: "14px", color: "#9ca3af" }}>
                최근 활동 없음
              </div>
            ) : (
              <div>
                {kpi.recentActivity.map((item) => (
                  <div
                    key={item.audit_id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 0",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        backgroundColor: "#e0e7ff",
                        color: "#3730a3",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontWeight: 500,
                        flexShrink: 0,
                      }}
                    >
                      {item.action}
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#374151",
                        flex: 1,
                      }}
                    >
                      {item.user_id} → {item.resource}
                      {item.resource_id !== null
                        ? ` (${item.resource_id.slice(0, 8)})`
                        : ""}
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#9ca3af",
                        flexShrink: 0,
                      }}
                    >
                      {new Date(item.occurred_at).toLocaleString("ko-KR")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

// ── Local sub-component ──────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        padding: "20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        borderLeft: `4px solid ${color}`,
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: "#6b7280",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: "8px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "28px",
          fontWeight: 700,
          color: "#111827",
        }}
      >
        {value}
      </div>
    </div>
  );
}
