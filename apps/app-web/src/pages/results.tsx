import { useState, useEffect } from "react";
import { fetchSkills, type SkillRow } from "../api/skill.ts";

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

export default function ResultsPage() {
  const [skills, setSkills] = useState<SkillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchSkills({ limit: 50, status: "published" })
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setSkills(res.data.skills);
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
          산출물 조회
        </h1>
        <p
          style={{
            color: "#6b7280",
            marginTop: "6px",
            marginBottom: 0,
            fontSize: "14px",
          }}
        >
          조직별 AI Skill 패키지 산출물을 조회합니다. (읽기 전용)
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
        ) : skills.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "64px",
              color: "#9ca3af",
              fontSize: "14px",
            }}
          >
            산출물이 없습니다.
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
                {["Skill ID", "도메인", "정책 수", "Trust", "버전", "생성일"].map(
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
              {skills.map((skill) => {
                const trustColor =
                  TRUST_COLORS[skill.trust.level] ?? "#9ca3af";
                const trustLabel =
                  TRUST_LABELS[skill.trust.level] ?? skill.trust.level;
                return (
                  <tr
                    key={skill.skillId}
                    style={{ borderBottom: "1px solid #e5e7eb" }}
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
                        {skill.skillId.slice(0, 8)}
                      </code>
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        color: "#111827",
                        fontWeight: 500,
                        fontSize: "14px",
                      }}
                    >
                      {skill.metadata.domain}
                      {skill.metadata.subdomain
                        ? ` / ${skill.metadata.subdomain}`
                        : ""}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        color: "#374151",
                        fontSize: "14px",
                      }}
                    >
                      {skill.policyCount}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: 600,
                          backgroundColor: `${trustColor}1a`,
                          color: trustColor,
                        }}
                      >
                        {trustLabel}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        color: "#6b7280",
                        fontSize: "13px",
                      }}
                    >
                      v{skill.metadata.version}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        color: "#9ca3af",
                        fontSize: "13px",
                      }}
                    >
                      {new Date(skill.metadata.createdAt).toLocaleDateString(
                        "ko-KR",
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
