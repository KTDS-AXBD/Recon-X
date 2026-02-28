import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchPolicy,
  approvePolicy,
  modifyPolicy,
  rejectPolicy,
  type PolicyRow,
} from "../api/policy.ts";
import { StatusBadge } from "../components/StatusBadge.tsx";

type ActionMode = "idle" | "approve" | "modify" | "reject";

interface ModifyData {
  title: string;
  condition: string;
  criteria: string;
  outcome: string;
}

export default function ReviewDetailPage() {
  const { policyId } = useParams<{ policyId: string }>();
  const navigate = useNavigate();

  const [policy, setPolicy] = useState<PolicyRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMode, setActionMode] = useState<ActionMode>("idle");
  const [comment, setComment] = useState("");
  const [modifyData, setModifyData] = useState<ModifyData>({
    title: "",
    condition: "",
    criteria: "",
    outcome: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (policyId === undefined) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchPolicy(policyId)
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setPolicy(res.data);
          setModifyData({
            title: res.data.title,
            condition: res.data.condition,
            criteria: res.data.criteria,
            outcome: res.data.outcome,
          });
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
  }, [policyId]);

  const handleApprove = async () => {
    if (policy === null || policyId === undefined) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const body: { reviewerId: string; comment?: string } = {
        reviewerId: "reviewer-001",
      };
      if (comment.trim() !== "") body.comment = comment.trim();
      const res = await approvePolicy(policyId, body);
      if (res.success) {
        navigate("/review");
      } else {
        setActionError(res.error.message);
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "처리 중 오류가 발생했습니다."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleModify = async () => {
    if (policy === null || policyId === undefined) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const modifiedFields: Record<string, string> = {};
      if (modifyData.title !== policy.title)
        modifiedFields["title"] = modifyData.title;
      if (modifyData.condition !== policy.condition)
        modifiedFields["condition"] = modifyData.condition;
      if (modifyData.criteria !== policy.criteria)
        modifiedFields["criteria"] = modifyData.criteria;
      if (modifyData.outcome !== policy.outcome)
        modifiedFields["outcome"] = modifyData.outcome;

      const body: {
        reviewerId: string;
        comment?: string;
        modifiedFields: Record<string, string>;
      } = { reviewerId: "reviewer-001", modifiedFields };
      if (comment.trim() !== "") body.comment = comment.trim();

      const res = await modifyPolicy(policyId, body);
      if (res.success) {
        navigate("/review");
      } else {
        setActionError(res.error.message);
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "처리 중 오류가 발생했습니다."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (policy === null || policyId === undefined) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const body: { reviewerId: string; comment?: string } = {
        reviewerId: "reviewer-001",
      };
      if (comment.trim() !== "") body.comment = comment.trim();
      const res = await rejectPolicy(policyId, body);
      if (res.success) {
        navigate("/review");
      } else {
        setActionError(res.error.message);
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "처리 중 오류가 발생했습니다."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const updateModifyField = (field: keyof ModifyData, value: string) => {
    switch (field) {
      case "title":
        setModifyData((prev) => ({ ...prev, title: value }));
        break;
      case "condition":
        setModifyData((prev) => ({ ...prev, condition: value }));
        break;
      case "criteria":
        setModifyData((prev) => ({ ...prev, criteria: value }));
        break;
      case "outcome":
        setModifyData((prev) => ({ ...prev, outcome: value }));
        break;
    }
  };

  // ── Render states ──────────────────────────────────────────────────────────

  if (policyId === undefined) {
    return (
      <PageShell>
        <ErrorBox message="잘못된 접근입니다. 정책 ID가 없습니다." />
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

  if (error !== null || policy === null) {
    return (
      <PageShell>
        <ErrorBox message={error ?? "정책을 찾을 수 없습니다."} />
        <button
          onClick={() => navigate("/review")}
          style={backBtnStyle}
        >
          ← 목록으로
        </button>
      </PageShell>
    );
  }

  const isReadOnly = policy.status !== "candidate";

  return (
    <PageShell>
      {/* Back link */}
      <button
        onClick={() => navigate("/review")}
        style={backBtnStyle}
      >
        ← 정책 리뷰 큐로 돌아가기
      </button>

      {/* Policy header */}
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
            alignItems: "flex-start",
            justifyContent: "space-between",
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
              {policy.policyCode}
            </code>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "#111827",
                margin: 0,
              }}
            >
              {policy.title}
            </h2>
          </div>
          <StatusBadge status={policy.status} />
        </div>
      </div>

      {/* Policy content */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
          marginBottom: "16px",
        }}
      >
        <PolicyField
          label="조건 (Condition)"
          value={actionMode === "modify" ? modifyData.condition : policy.condition}
          editable={actionMode === "modify"}
          onEdit={(v) => updateModifyField("condition", v)}
        />
        <PolicyField
          label="기준 (Criteria)"
          value={actionMode === "modify" ? modifyData.criteria : policy.criteria}
          editable={actionMode === "modify"}
          onEdit={(v) => updateModifyField("criteria", v)}
        />
        <PolicyField
          label="결과 (Outcome)"
          value={actionMode === "modify" ? modifyData.outcome : policy.outcome}
          editable={actionMode === "modify"}
          onEdit={(v) => updateModifyField("outcome", v)}
        />
      </div>

      {/* Title field (modify mode only) */}
      {actionMode === "modify" && (
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 600,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "8px",
            }}
          >
            제목 (Title)
          </label>
          <input
            value={modifyData.title}
            onChange={(e) => updateModifyField("title", e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              fontSize: "14px",
              color: "#111827",
              boxSizing: "border-box",
            }}
          />
        </div>
      )}

      {/* Source reference */}
      {(policy.sourcePageRef !== undefined ||
        policy.sourceExcerpt !== undefined) && (
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "12px",
            }}
          >
            출처 정보
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "6px 16px",
              fontSize: "13px",
              color: "#374151",
            }}
          >
            <span style={{ color: "#9ca3af" }}>문서 ID</span>
            <span>{policy.sourceDocumentId}</span>
            {policy.sourcePageRef !== undefined && (
              <>
                <span style={{ color: "#9ca3af" }}>페이지 참조</span>
                <span>{policy.sourcePageRef}</span>
              </>
            )}
          </div>
          {policy.sourceExcerpt !== undefined && (
            <div
              style={{
                marginTop: "12px",
                padding: "12px",
                backgroundColor: "#f9fafb",
                borderRadius: "6px",
                fontSize: "13px",
                color: "#374151",
                lineHeight: "1.6",
                borderLeft: "3px solid #e5e7eb",
              }}
            >
              {policy.sourceExcerpt}
            </div>
          )}
        </div>
      )}

      {/* Tags */}
      {policy.tags.length > 0 && (
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
          {policy.tags.map((tag) => (
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

      {/* Action panel */}
      {isReadOnly ? (
        <div
          style={{
            backgroundColor: "#f9fafb",
            borderRadius: "8px",
            padding: "16px 20px",
            fontSize: "14px",
            color: "#6b7280",
            border: "1px solid #e5e7eb",
          }}
        >
          이 정책은 이미{" "}
          <StatusBadge status={policy.status} /> 상태입니다.
        </div>
      ) : (
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
            검토 액션
          </div>

          {/* Comment */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                color: "#374151",
                marginBottom: "6px",
              }}
            >
              코멘트 (선택)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="리뷰 의견을 입력하세요..."
              rows={3}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                fontSize: "14px",
                color: "#111827",
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Action error */}
          {actionError !== null && (
            <div
              style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "6px",
                padding: "10px 14px",
                color: "#dc2626",
                fontSize: "13px",
                marginBottom: "16px",
              }}
            >
              오류: {actionError}
            </div>
          )}

          {/* Buttons */}
          {actionMode !== "modify" ? (
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <ActionButton
                label="승인"
                color="#22c55e"
                disabled={submitting}
                onClick={() => {
                  setActionMode("approve");
                  void handleApprove();
                }}
              />
              <ActionButton
                label="수정 후 승인"
                color="#f97316"
                disabled={submitting}
                onClick={() => setActionMode("modify")}
              />
              <ActionButton
                label="반려"
                color="#ef4444"
                disabled={submitting}
                onClick={() => {
                  setActionMode("reject");
                  void handleReject();
                }}
              />
            </div>
          ) : (
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <ActionButton
                label={submitting ? "처리 중..." : "수정 후 승인"}
                color="#f97316"
                disabled={submitting}
                onClick={() => void handleModify()}
              />
              <button
                onClick={() => {
                  setActionMode("idle");
                  setActionError(null);
                  if (policy !== null) {
                    setModifyData({
                      title: policy.title,
                      condition: policy.condition,
                      criteria: policy.criteria,
                      outcome: policy.outcome,
                    });
                  }
                }}
                disabled={submitting}
                style={{
                  padding: "10px 24px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  backgroundColor: "#ffffff",
                  color: "#374151",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                취소
              </button>
            </div>
          )}
        </div>
      )}
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

interface PolicyFieldProps {
  label: string;
  value: string;
  editable: boolean;
  onEdit: (value: string) => void;
}

function PolicyField({ label, value, editable, onEdit }: PolicyFieldProps) {
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        padding: "20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: "#6b7280",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: "10px",
        }}
      >
        {label}
      </div>
      {editable ? (
        <textarea
          value={value}
          onChange={(e) => onEdit(e.target.value)}
          rows={5}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            fontSize: "14px",
            color: "#111827",
            resize: "vertical",
            boxSizing: "border-box",
            fontFamily: "inherit",
            lineHeight: "1.5",
          }}
        />
      ) : (
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            color: "#374151",
            lineHeight: "1.6",
          }}
        >
          {value}
        </p>
      )}
    </div>
  );
}

interface ActionButtonProps {
  label: string;
  color: string;
  disabled: boolean;
  onClick: () => void;
}

function ActionButton({ label, color, disabled, onClick }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 24px",
        borderRadius: "6px",
        border: "none",
        backgroundColor: disabled ? "#d1d5db" : color,
        color: "#ffffff",
        fontSize: "14px",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {label}
    </button>
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
