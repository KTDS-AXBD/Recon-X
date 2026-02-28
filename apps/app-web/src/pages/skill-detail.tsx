import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchSkill,
  downloadSkill,
  type SkillDetail as SkillDetailType,
} from "../api/skill.ts";

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

export default function SkillDetailPage() {
  const { skillId } = useParams<{ skillId: string }>();
  const navigate = useNavigate();
  const [skill, setSkill] = useState<SkillDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (skillId === undefined) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchSkill(skillId)
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setSkill(res.data);
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
  }, [skillId]);

  const handleDownload = async () => {
    if (skillId === undefined) return;
    setDownloading(true);
    try {
      const blob = await downloadSkill(skillId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${skillId}.skill.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "다운로드 중 오류가 발생했습니다.",
      );
    } finally {
      setDownloading(false);
    }
  };

  if (skillId === undefined) {
    return (
      <PageShell>
        <ErrorBox message="잘못된 접근입니다. Skill ID가 없습니다." />
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell>
        <div
          style={{
            textAlign: "center",
            padding: "80px",
            color: "#9ca3af",
            fontSize: "14px",
          }}
        >
          불러오는 중...
        </div>
      </PageShell>
    );
  }

  if (error !== null || skill === null) {
    return (
      <PageShell>
        <ErrorBox message={error ?? "Skill을 찾을 수 없습니다."} />
        <button
          onClick={() => navigate("/skills")}
          style={backBtnStyle}
        >
          ← 카탈로그로
        </button>
      </PageShell>
    );
  }

  const trustColor = TRUST_COLORS[skill.trust.level] ?? "#9ca3af";
  const trustLabel = TRUST_LABELS[skill.trust.level] ?? skill.trust.level;

  return (
    <PageShell>
      {/* Back link */}
      <button
        onClick={() => navigate("/skills")}
        style={backBtnStyle}
      >
        ← Skill 카탈로그로 돌아가기
      </button>

      {/* Header */}
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
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <code
              style={{
                fontSize: "12px",
                backgroundColor: "#f3f4f6",
                padding: "3px 8px",
                borderRadius: "4px",
                fontFamily: "monospace",
                color: "#374151",
                display: "inline-block",
                marginBottom: "8px",
              }}
            >
              {skill.skillId}
            </code>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "#111827",
                margin: 0,
              }}
            >
              {skill.metadata.domain}
              {skill.metadata.subdomain
                ? ` / ${skill.metadata.subdomain}`
                : ""}
            </h2>
          </div>
          <span
            style={{
              display: "inline-block",
              padding: "4px 14px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: 600,
              backgroundColor: `${trustColor}1a`,
              color: trustColor,
            }}
          >
            {trustLabel} ({(skill.trust.score * 100).toFixed(0)}%)
          </span>
        </div>
      </div>

      {/* Metadata grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "16px",
        }}
      >
        {(
          [
            { label: "버전", value: `v${skill.metadata.version}` },
            { label: "작성자", value: skill.metadata.author },
            { label: "정책 수", value: `${skill.policyCount}건` },
            { label: "상태", value: skill.status },
            {
              label: "생성일",
              value: new Date(skill.metadata.createdAt).toLocaleDateString(
                "ko-KR",
              ),
            },
            {
              label: "수정일",
              value: new Date(skill.metadata.updatedAt).toLocaleDateString(
                "ko-KR",
              ),
            },
          ] as { label: string; value: string }[]
        ).map(({ label, value }) => (
          <div
            key={label}
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              padding: "16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "6px",
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontSize: "15px",
                fontWeight: 500,
                color: "#111827",
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Tags */}
      {skill.metadata.tags.length > 0 && (
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            padding: "16px 20px",
            marginBottom: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "#9ca3af",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            태그
          </span>
          {skill.metadata.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: "12px",
                backgroundColor: "#f3f4f6",
                color: "#374151",
                padding: "2px 10px",
                borderRadius: "12px",
                fontWeight: 500,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Download actions */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          padding: "20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => void handleDownload()}
          disabled={downloading}
          style={{
            padding: "10px 24px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: downloading ? "#d1d5db" : "#3b82f6",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: 600,
            cursor: downloading ? "not-allowed" : "pointer",
          }}
        >
          {downloading ? "다운로드 중..." : ".skill.json 다운로드"}
        </button>
      </div>
    </PageShell>
  );
}

// ── Local sub-components ─────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
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
      {children}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      style={{
        backgroundColor: "#fef2f2",
        border: "1px solid #fecaca",
        borderRadius: "8px",
        padding: "16px",
        color: "#dc2626",
        fontSize: "14px",
        marginBottom: "16px",
      }}
    >
      {message}
    </div>
  );
}

const backBtnStyle: React.CSSProperties = {
  display: "inline-block",
  marginBottom: "20px",
  fontSize: "14px",
  color: "#6b7280",
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
};
