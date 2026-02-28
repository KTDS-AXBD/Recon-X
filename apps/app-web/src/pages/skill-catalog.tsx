import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchSkills, type SkillRow } from "../api/skill.ts";

const LIMIT = 20;

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

export default function SkillCatalogPage() {
  const navigate = useNavigate();
  const [skills, setSkills] = useState<SkillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [domainFilter, setDomainFilter] = useState("");
  const [trustFilter, setTrustFilter] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params: {
      limit: number;
      offset: number;
      domain?: string;
      trustLevel?: string;
    } = {
      limit: LIMIT,
      offset: page * LIMIT,
    };
    if (domainFilter !== "") params.domain = domainFilter;
    if (trustFilter !== "") params.trustLevel = trustFilter;

    void fetchSkills(params)
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
  }, [domainFilter, trustFilter, page]);

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
          Skill 카탈로그
        </h1>
        <p
          style={{
            color: "#6b7280",
            marginTop: "6px",
            marginBottom: 0,
            fontSize: "14px",
          }}
        >
          AI Skill 패키지를 탐색하고 다운로드합니다.
        </p>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <input
          value={domainFilter}
          onChange={(e) => {
            setDomainFilter(e.target.value);
            setPage(0);
          }}
          placeholder="도메인 필터..."
          style={{
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            fontSize: "13px",
            color: "#111827",
            width: "200px",
          }}
        />
        <select
          value={trustFilter}
          onChange={(e) => {
            setTrustFilter(e.target.value);
            setPage(0);
          }}
          style={{
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            fontSize: "13px",
            color: "#111827",
            backgroundColor: "#ffffff",
          }}
        >
          <option value="">전체 Trust Level</option>
          <option value="unreviewed">미검토</option>
          <option value="reviewed">검토됨</option>
          <option value="validated">검증됨</option>
        </select>
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

      {/* Grid */}
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
            backgroundColor: "#ffffff",
            borderRadius: "8px",
          }}
        >
          Skill 패키지가 없습니다.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "16px",
          }}
        >
          {skills.map((skill) => (
            <SkillCard
              key={skill.skillId}
              skill={skill}
              onClick={() => navigate(`/skills/${skill.skillId}`)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && skills.length === LIMIT && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "12px",
            marginTop: "24px",
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
          <span
            style={{
              padding: "8px",
              fontSize: "14px",
              color: "#6b7280",
            }}
          >
            페이지 {page + 1}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            style={{
              padding: "8px 20px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              backgroundColor: "#ffffff",
              cursor: "pointer",
              color: "#374151",
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

function SkillCard({
  skill,
  onClick,
}: {
  skill: SkillRow;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const trustColor = TRUST_COLORS[skill.trust.level] ?? "#9ca3af";
  const trustLabel = TRUST_LABELS[skill.trust.level] ?? skill.trust.level;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        padding: "20px",
        boxShadow: hovered
          ? "0 4px 12px rgba(0,0,0,0.12)"
          : "0 1px 3px rgba(0,0,0,0.08)",
        cursor: "pointer",
        transition: "box-shadow 0.15s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "12px",
        }}
      >
        <div>
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
            {skill.skillId.slice(0, 8)}
          </code>
        </div>
        <span
          style={{
            display: "inline-block",
            padding: "2px 10px",
            borderRadius: "12px",
            fontSize: "11px",
            fontWeight: 600,
            backgroundColor: `${trustColor}1a`,
            color: trustColor,
          }}
        >
          {trustLabel}
        </span>
      </div>

      <div
        style={{
          fontSize: "15px",
          fontWeight: 600,
          color: "#111827",
          marginBottom: "8px",
        }}
      >
        {skill.metadata.domain}
        {skill.metadata.subdomain ? ` / ${skill.metadata.subdomain}` : ""}
      </div>

      <div
        style={{
          display: "flex",
          gap: "16px",
          fontSize: "12px",
          color: "#6b7280",
          marginBottom: "12px",
        }}
      >
        <span>정책 {skill.policyCount}건</span>
        <span>v{skill.metadata.version}</span>
        <span>Score {(skill.trust.score * 100).toFixed(0)}%</span>
      </div>

      {skill.metadata.tags.length > 0 && (
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {skill.metadata.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: "11px",
                backgroundColor: "#f3f4f6",
                color: "#374151",
                padding: "1px 8px",
                borderRadius: "10px",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div
        style={{
          fontSize: "11px",
          color: "#9ca3af",
          marginTop: "12px",
        }}
      >
        {skill.metadata.author} ·{" "}
        {new Date(skill.metadata.createdAt).toLocaleDateString("ko-KR")}
      </div>
    </div>
  );
}
