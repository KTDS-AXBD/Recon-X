import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchPolicies, type PolicyRow } from "../api/policy.ts";
import { StatusBadge } from "../components/StatusBadge.tsx";

const LIMIT = 20;

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "candidate", label: "검토 대기" },
  { value: "approved", label: "승인" },
  { value: "rejected", label: "반려" },
  { value: "", label: "전체" },
];

export default function ReviewQueuePage() {
  const navigate = useNavigate();
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("candidate");
  const [page, setPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params: { status?: string; limit: number; offset: number } = {
      limit: LIMIT,
      offset: page * LIMIT,
    };
    if (statusFilter !== "") params.status = statusFilter;

    void fetchPolicies(params)
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setPolicies(res.data.policies);
          setTotal(res.data.total);
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
            : "데이터를 불러오는 데 실패했습니다."
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [statusFilter, page]);

  const totalPages = Math.ceil(total / LIMIT);
  const activeFilterLabel =
    FILTER_OPTIONS.find((f) => f.value === statusFilter)?.label ?? "전체";

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
      {/* Page header */}
      <div style={{ marginBottom: "24px" }}>
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 700,
            color: "#111827",
            margin: 0,
          }}
        >
          정책 리뷰 큐
        </h1>
        <p
          style={{
            color: "#6b7280",
            marginTop: "6px",
            marginBottom: 0,
            fontSize: "14px",
          }}
        >
          HITL 정책 후보를 검토하고 승인 또는 반려합니다.
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
          <span style={{ fontSize: "13px", color: "#6b7280" }}>
            {activeFilterLabel}
          </span>
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

      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        {FILTER_OPTIONS.map(({ value, label }) => {
          const isActive = statusFilter === value;
          return (
            <button
              key={value === "" ? "__all__" : value}
              onClick={() => {
                setStatusFilter(value);
                setPage(0);
              }}
              style={{
                padding: "6px 16px",
                borderRadius: "20px",
                border: `1px solid ${isActive ? "#3b82f6" : "#d1d5db"}`,
                backgroundColor: isActive ? "#3b82f6" : "#ffffff",
                color: isActive ? "#ffffff" : "#374151",
                fontSize: "13px",
                cursor: "pointer",
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {label}
            </button>
          );
        })}
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
        ) : policies.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "64px",
              color: "#9ca3af",
              fontSize: "14px",
            }}
          >
            정책 후보가 없습니다.
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
                {(
                  [
                    { key: "code", label: "정책 코드" },
                    { key: "title", label: "제목" },
                    { key: "status", label: "상태" },
                    { key: "created", label: "생성일" },
                  ] as { key: string; label: string }[]
                ).map(({ key, label }) => (
                  <th
                    key={key}
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
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {policies.map((policy) => (
                <PolicyTableRow
                  key={policy.id}
                  policy={policy}
                  onClick={() => navigate(`/review/${policy.id}`)}
                />
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

// ── Local sub-component ──────────────────────────────────────────────────────

interface PolicyTableRowProps {
  policy: PolicyRow;
  onClick: () => void;
}

function PolicyTableRow({ policy, onClick }: PolicyTableRowProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <tr
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderBottom: "1px solid #e5e7eb",
        cursor: "pointer",
        backgroundColor: hovered ? "#f9fafb" : "transparent",
      }}
    >
      <td style={{ padding: "14px 16px" }}>
        <code
          style={{
            fontSize: "12px",
            backgroundColor: "#f3f4f6",
            padding: "3px 8px",
            borderRadius: "4px",
            fontFamily: "monospace",
            color: "#374151",
          }}
        >
          {policy.policyCode}
        </code>
      </td>
      <td
        style={{
          padding: "14px 16px",
          color: "#111827",
          fontWeight: 500,
          fontSize: "14px",
          maxWidth: "340px",
        }}
      >
        {policy.title}
      </td>
      <td style={{ padding: "14px 16px" }}>
        <StatusBadge status={policy.status} />
      </td>
      <td style={{ padding: "14px 16px", color: "#9ca3af", fontSize: "13px" }}>
        {new Date(policy.createdAt).toLocaleDateString("ko-KR")}
      </td>
    </tr>
  );
}
