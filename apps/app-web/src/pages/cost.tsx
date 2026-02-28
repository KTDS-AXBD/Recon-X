import { useState, useEffect } from "react";
import { fetchCostSummary, type CostSummary } from "../api/governance.ts";

const TIER_COLORS: Record<string, string> = {
  opus: "#8b5cf6",
  sonnet: "#3b82f6",
  haiku: "#10b981",
};

export default function CostPage() {
  const [data, setData] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchCostSummary()
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setData(res.data);
        } else {
          setError(res.error.message);
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "비용 데이터를 불러오는 데 실패했습니다.",
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
          비용 관리
        </h1>
        <p
          style={{
            color: "#6b7280",
            marginTop: "6px",
            marginBottom: 0,
            fontSize: "14px",
          }}
        >
          LLM 사용량 및 비용을 모니터링합니다.
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
      ) : data !== null ? (
        <>
          {/* Summary cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <SummaryCard
              label="총 요청 수"
              value={data.totalRequests.toLocaleString()}
              color="#3b82f6"
            />
            <SummaryCard
              label="총 토큰"
              value={data.totalTokens.toLocaleString()}
              color="#8b5cf6"
            />
            <SummaryCard
              label="추정 비용"
              value={`$${data.estimatedCost.toFixed(2)}`}
              color="#ef4444"
            />
            <SummaryCard label="기간" value={data.period} color="#f59e0b" />
          </div>

          {/* Tier breakdown */}
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
              Tier별 사용량
            </div>
            {Object.keys(data.byTier).length === 0 ? (
              <div style={{ fontSize: "14px", color: "#9ca3af" }}>
                Tier 데이터 없음 (비용 집계가 아직 구현되지 않았습니다)
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    {["Tier", "요청 수", "토큰", "비용"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 16px",
                          textAlign: "left",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#6b7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.byTier).map(([tier, stats]) => {
                    const color = TIER_COLORS[tier] ?? "#6b7280";
                    return (
                      <tr
                        key={tier}
                        style={{ borderBottom: "1px solid #f3f4f6" }}
                      >
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 10px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: 600,
                              backgroundColor: `${color}1a`,
                              color,
                              textTransform: "capitalize",
                            }}
                          >
                            {tier}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: "14px",
                            color: "#111827",
                          }}
                        >
                          {stats.requests.toLocaleString()}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: "14px",
                            color: "#111827",
                          }}
                        >
                          {stats.tokens.toLocaleString()}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: "14px",
                            color: "#111827",
                            fontWeight: 600,
                          }}
                        >
                          ${stats.cost.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Service breakdown */}
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
              서비스별 사용량
            </div>
            {Object.keys(data.byService).length === 0 ? (
              <div style={{ fontSize: "14px", color: "#9ca3af" }}>
                서비스 데이터 없음 (비용 집계가 아직 구현되지 않았습니다)
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                    {["서비스", "요청 수", "토큰", "비용"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 16px",
                          textAlign: "left",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#6b7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.byService).map(([svc, stats]) => (
                    <tr
                      key={svc}
                      style={{ borderBottom: "1px solid #f3f4f6" }}
                    >
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "13px",
                          color: "#111827",
                          fontWeight: 500,
                        }}
                      >
                        {svc}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "14px",
                          color: "#111827",
                        }}
                      >
                        {stats.requests.toLocaleString()}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "14px",
                          color: "#111827",
                        }}
                      >
                        {stats.tokens.toLocaleString()}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "14px",
                          color: "#111827",
                          fontWeight: 600,
                        }}
                      >
                        ${stats.cost.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

// ── Local sub-component ──────────────────────────────────────────────────────

function SummaryCard({
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
