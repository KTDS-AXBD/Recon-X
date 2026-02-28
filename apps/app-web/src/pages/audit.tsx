import { useState, useEffect } from "react";
import { fetchAuditLogs, type AuditRow } from "../api/security.ts";

const LIMIT = 20;

export default function AuditPage() {
  const [items, setItems] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [resourceFilter, setResourceFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params: { limit: number; offset: number; resource?: string } = {
      limit: LIMIT,
      offset: page * LIMIT,
    };
    if (resourceFilter !== "") params.resource = resourceFilter;

    void fetchAuditLogs(params)
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setItems(res.data.items);
          setTotal(res.data.pagination.total);
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
            : "데이터를 불러오는 데 실패했습니다.",
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, resourceFilter]);

  const totalPages = Math.ceil(total / LIMIT);

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
          감사 로그
        </h1>
        <p
          style={{
            color: "#6b7280",
            marginTop: "6px",
            marginBottom: 0,
            fontSize: "14px",
          }}
        >
          시스템 감사 이벤트를 조회합니다.
        </p>
      </div>

      {/* Stats bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "24px",
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          padding: "16px 20px",
          marginBottom: "16px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        <div>
          <span style={{ fontSize: "13px", color: "#6b7280" }}>전체</span>
          <span
            style={{
              marginLeft: "8px",
              fontSize: "22px",
              fontWeight: 700,
              color: "#111827",
            }}
          >
            {loading ? "—" : total}
          </span>
          <span
            style={{
              fontSize: "13px",
              color: "#6b7280",
              marginLeft: "4px",
            }}
          >
            건
          </span>
        </div>
        <div
          style={{
            width: "1px",
            height: "24px",
            backgroundColor: "#e5e7eb",
          }}
        />
        <div style={{ fontSize: "13px", color: "#9ca3af" }}>
          페이지 {page + 1} / {Math.max(1, totalPages)}
        </div>
      </div>

      {/* Filter */}
      <div style={{ marginBottom: "16px" }}>
        <input
          value={resourceFilter}
          onChange={(e) => {
            setResourceFilter(e.target.value);
            setPage(0);
          }}
          placeholder="리소스 필터 (예: document, policy, skill)..."
          style={{
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            fontSize: "13px",
            color: "#111827",
            width: "300px",
          }}
        />
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

      {/* Table */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}
      >
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
        ) : items.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "64px",
              color: "#9ca3af",
              fontSize: "14px",
            }}
          >
            감사 로그가 없습니다.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  backgroundColor: "#f9fafb",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                {["사용자", "액션", "리소스", "리소스 ID", "IP", "시각"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 16px",
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
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.audit_id}
                  style={{ borderBottom: "1px solid #e5e7eb" }}
                >
                  <td
                    style={{
                      padding: "14px 16px",
                      fontSize: "13px",
                      color: "#111827",
                      fontWeight: 500,
                    }}
                  >
                    {item.user_id}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span
                      style={{
                        fontSize: "12px",
                        backgroundColor: "#e0e7ff",
                        color: "#3730a3",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontWeight: 500,
                      }}
                    >
                      {item.action}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontSize: "13px",
                      color: "#374151",
                    }}
                  >
                    {item.resource}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {item.resource_id !== null ? (
                      <code
                        style={{
                          fontSize: "11px",
                          backgroundColor: "#f3f4f6",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontFamily: "monospace",
                          color: "#374151",
                        }}
                      >
                        {item.resource_id.slice(0, 8)}
                      </code>
                    ) : (
                      <span style={{ color: "#d1d5db" }}>—</span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontSize: "12px",
                      color: "#9ca3af",
                    }}
                  >
                    {item.ip_address ?? "—"}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontSize: "13px",
                      color: "#9ca3af",
                    }}
                  >
                    {new Date(item.occurred_at).toLocaleString("ko-KR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "12px",
            marginTop: "20px",
          }}
        >
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{
              padding: "8px 20px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              backgroundColor: "#ffffff",
              cursor: page === 0 ? "not-allowed" : "pointer",
              color: page === 0 ? "#9ca3af" : "#374151",
              fontSize: "14px",
            }}
          >
            이전
          </button>
          <span style={{ fontSize: "14px", color: "#6b7280" }}>
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={{
              padding: "8px 20px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              backgroundColor: "#ffffff",
              cursor: page >= totalPages - 1 ? "not-allowed" : "pointer",
              color: page >= totalPages - 1 ? "#9ca3af" : "#374151",
              fontSize: "14px",
            }}
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
