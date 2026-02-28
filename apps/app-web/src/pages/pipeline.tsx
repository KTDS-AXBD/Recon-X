import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchDocument,
  type DocumentRow,
} from "../api/ingestion.ts";

const STAGES: { key: string; label: string; color: string }[] = [
  { key: "ingestion", label: "1. Ingestion", color: "#3b82f6" },
  { key: "extraction", label: "2. Extraction", color: "#8b5cf6" },
  { key: "policy", label: "3. Policy", color: "#f59e0b" },
  { key: "ontology", label: "4. Ontology", color: "#10b981" },
  { key: "skill", label: "5. Skill", color: "#ec4899" },
];

const STATUS_ICON: Record<string, string> = {
  pending: "○",
  processing: "◑",
  completed: "●",
  failed: "✕",
};

export default function PipelinePage() {
  const navigate = useNavigate();
  const [documentId, setDocumentId] = useState("");
  const [document, setDocument] = useState<DocumentRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = () => {
    if (documentId.trim() === "") return;
    setLoading(true);
    setError(null);
    setDocument(null);

    void fetchDocument(documentId.trim())
      .then((res) => {
        if (res.success) {
          setDocument(res.data);
        } else {
          setError(res.error.message);
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : "문서를 조회하는 데 실패했습니다.",
        );
        setLoading(false);
      });
  };

  // Determine which stage the document is in based on status
  const getStageIndex = (status: string): number => {
    switch (status) {
      case "pending":
        return 0;
      case "processing":
        return 1;
      case "completed":
        return 4;
      case "failed":
        return 0;
      default:
        return 0;
    }
  };

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
          파이프라인 모니터
        </h1>
        <p
          style={{
            color: "#6b7280",
            marginTop: "6px",
            marginBottom: 0,
            fontSize: "14px",
          }}
        >
          5단계 AI 파이프라인 처리 상태를 확인합니다.
        </p>
      </div>

      {/* Search bar */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "24px",
        }}
      >
        <input
          value={documentId}
          onChange={(e) => setDocumentId(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
          placeholder="Document ID를 입력하세요..."
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            fontSize: "14px",
            color: "#111827",
          }}
        />
        <button
          onClick={handleSearch}
          disabled={loading || documentId.trim() === ""}
          style={{
            padding: "10px 24px",
            borderRadius: "6px",
            border: "none",
            backgroundColor:
              loading || documentId.trim() === "" ? "#d1d5db" : "#3b82f6",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: 600,
            cursor:
              loading || documentId.trim() === ""
                ? "not-allowed"
                : "pointer",
          }}
        >
          {loading ? "조회 중..." : "조회"}
        </button>
        <button
          onClick={() => navigate("/upload")}
          style={{
            padding: "10px 20px",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            backgroundColor: "#ffffff",
            color: "#374151",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          업로드
        </button>
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

      {/* Pipeline visualization */}
      {document !== null && (
        <>
          {/* Document info */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              padding: "20px",
              marginBottom: "20px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "8px 20px",
                fontSize: "14px",
              }}
            >
              <span style={{ color: "#6b7280", fontWeight: 500 }}>
                Document ID
              </span>
              <code
                style={{
                  backgroundColor: "#f3f4f6",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontFamily: "monospace",
                  fontSize: "12px",
                }}
              >
                {document.document_id}
              </code>
              <span style={{ color: "#6b7280", fontWeight: 500 }}>파일명</span>
              <span style={{ color: "#111827" }}>{document.original_name}</span>
              <span style={{ color: "#6b7280", fontWeight: 500 }}>형식</span>
              <span style={{ color: "#111827" }}>{document.file_type}</span>
              <span style={{ color: "#6b7280", fontWeight: 500 }}>상태</span>
              <span
                style={{
                  color:
                    document.status === "completed"
                      ? "#16a34a"
                      : document.status === "failed"
                        ? "#dc2626"
                        : "#f59e0b",
                  fontWeight: 600,
                }}
              >
                {document.status}
              </span>
              <span style={{ color: "#6b7280", fontWeight: 500 }}>
                업로드 시각
              </span>
              <span style={{ color: "#111827" }}>
                {new Date(document.uploaded_at).toLocaleString("ko-KR")}
              </span>
            </div>
          </div>

          {/* Stage progress */}
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
                marginBottom: "20px",
              }}
            >
              파이프라인 단계
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0",
              }}
            >
              {STAGES.map((stage, i) => {
                const currentStage = getStageIndex(document.status);
                const isActive = i <= currentStage;
                const isCurrent = i === currentStage;
                return (
                  <div key={stage.key} style={{ flex: 1, textAlign: "center" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "8px",
                      }}
                    >
                      {i > 0 && (
                        <div
                          style={{
                            flex: 1,
                            height: "3px",
                            backgroundColor: isActive
                              ? stage.color
                              : "#e5e7eb",
                          }}
                        />
                      )}
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          backgroundColor: isActive
                            ? stage.color
                            : "#f3f4f6",
                          color: isActive ? "#ffffff" : "#9ca3af",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "16px",
                          fontWeight: 700,
                          flexShrink: 0,
                          border: isCurrent
                            ? `3px solid ${stage.color}`
                            : "3px solid transparent",
                          boxShadow: isCurrent
                            ? `0 0 0 3px ${stage.color}33`
                            : "none",
                        }}
                      >
                        {document.status === "failed" && isCurrent
                          ? STATUS_ICON["failed"]
                          : isActive
                            ? STATUS_ICON["completed"]
                            : STATUS_ICON["pending"]}
                      </div>
                      {i < STAGES.length - 1 && (
                        <div
                          style={{
                            flex: 1,
                            height: "3px",
                            backgroundColor:
                              i < currentStage ? STAGES[i + 1]?.color ?? "#e5e7eb" : "#e5e7eb",
                          }}
                        />
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? "#111827" : "#9ca3af",
                      }}
                    >
                      {stage.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Link to comparison */}
          {document.status === "completed" && (
            <button
              onClick={() =>
                navigate(`/comparison?documentId=${document.document_id}`)
              }
              style={{
                marginTop: "20px",
                padding: "10px 24px",
                borderRadius: "6px",
                border: "1px solid #3b82f6",
                backgroundColor: "#ffffff",
                color: "#3b82f6",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              추출 결과 보기 →
            </button>
          )}
        </>
      )}

      {/* Empty state */}
      {document === null && error === null && !loading && (
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            padding: "64px 32px",
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{ fontSize: "40px", marginBottom: "12px", color: "#d1d5db" }}
          >
            ◎
          </div>
          <div style={{ fontSize: "15px", color: "#6b7280" }}>
            Document ID를 입력하여 파이프라인 상태를 확인하세요.
          </div>
        </div>
      )}
    </div>
  );
}
