import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  fetchExtractions,
  fetchExtraction,
  type ExtractionRow,
  type ExtractionDetail,
} from "../api/extraction.ts";
import { fetchDocumentChunks, type DocumentChunk } from "../api/ingestion.ts";

export default function ComparisonPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const docId = searchParams.get("documentId") ?? "";

  const [documentId, setDocumentId] = useState(docId);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [extractions, setExtractions] = useState<ExtractionRow[]>([]);
  const [detail, setDetail] = useState<ExtractionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = (id: string) => {
    if (id.trim() === "") return;
    setLoading(true);
    setError(null);
    setChunks([]);
    setExtractions([]);
    setDetail(null);

    Promise.all([fetchDocumentChunks(id), fetchExtractions(id)])
      .then(([chunkRes, extRes]) => {
        if (chunkRes.success) {
          setChunks(chunkRes.data.chunks);
        }
        if (extRes.success) {
          setExtractions(extRes.data.extractions);
          // Auto-load the first completed extraction's detail
          const completed = extRes.data.extractions.find(
            (e) => e.status === "completed",
          );
          if (completed) {
            void fetchExtraction(completed.extractionId).then((dRes) => {
              if (dRes.success) setDetail(dRes.data);
            });
          }
        }
        if (!chunkRes.success && !extRes.success) {
          setError("데이터를 불러올 수 없습니다.");
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : "데이터를 불러오는 데 실패했습니다.",
        );
        setLoading(false);
      });
  };

  useEffect(() => {
    if (docId !== "") {
      load(docId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

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
        <button
          onClick={() => navigate("/pipeline")}
          style={{
            display: "inline-block",
            marginBottom: "12px",
            fontSize: "14px",
            color: "#6b7280",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          ← 파이프라인으로
        </button>
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 700,
            color: "#111827",
            margin: 0,
          }}
        >
          추출 결과 비교
        </h1>
        <p
          style={{
            color: "#6b7280",
            marginTop: "6px",
            marginBottom: 0,
            fontSize: "14px",
          }}
        >
          원본 문서 청크와 추출된 구조를 비교합니다.
        </p>
      </div>

      {/* Search */}
      {docId === "" && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
          <input
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") load(documentId);
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
            onClick={() => load(documentId)}
            disabled={loading}
            style={{
              padding: "10px 24px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: loading ? "#d1d5db" : "#3b82f6",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            조회
          </button>
        </div>
      )}

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

      {loading && (
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
      )}

      {/* Split view */}
      {!loading && (chunks.length > 0 || detail !== null) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
          }}
        >
          {/* Left: Document chunks */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #e5e7eb",
                fontSize: "13px",
                fontWeight: 600,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              원본 청크 ({chunks.length}건)
            </div>
            <div style={{ maxHeight: "600px", overflow: "auto" }}>
              {chunks.length === 0 ? (
                <div
                  style={{
                    padding: "32px",
                    textAlign: "center",
                    color: "#9ca3af",
                    fontSize: "14px",
                  }}
                >
                  청크 데이터 없음
                </div>
              ) : (
                chunks.map((chunk) => (
                  <div
                    key={chunk.chunk_id}
                    style={{
                      padding: "12px 20px",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "6px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          backgroundColor: "#f3f4f6",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          color: "#374151",
                        }}
                      >
                        #{chunk.chunk_index} · {chunk.element_type}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#9ca3af",
                        }}
                      >
                        {chunk.classification} · {chunk.word_count}w
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#374151",
                        lineHeight: "1.5",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {chunk.masked_text.length > 200
                        ? `${chunk.masked_text.slice(0, 200)}…`
                        : chunk.masked_text}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Extracted structure */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #e5e7eb",
                fontSize: "13px",
                fontWeight: 600,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              추출 결과
            </div>
            <div style={{ maxHeight: "600px", overflow: "auto" }}>
              {detail === null || detail.result === null ? (
                <div
                  style={{
                    padding: "32px",
                    textAlign: "center",
                    color: "#9ca3af",
                    fontSize: "14px",
                  }}
                >
                  추출 결과 없음
                </div>
              ) : (
                <div style={{ padding: "16px 20px" }}>
                  {/* Processes */}
                  {detail.result.processes.length > 0 && (
                    <Section title="프로세스">
                      {detail.result.processes.map((p, i) => (
                        <div
                          key={i}
                          style={{
                            marginBottom: "12px",
                            padding: "10px",
                            backgroundColor: "#f9fafb",
                            borderRadius: "6px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "#111827",
                            }}
                          >
                            {p.name}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#6b7280",
                              marginTop: "4px",
                            }}
                          >
                            {p.description}
                          </div>
                        </div>
                      ))}
                    </Section>
                  )}

                  {/* Entities */}
                  {detail.result.entities.length > 0 && (
                    <Section title="엔티티">
                      <table
                        style={{ width: "100%", borderCollapse: "collapse" }}
                      >
                        <thead>
                          <tr>
                            {["이름", "유형", "속성"].map((h) => (
                              <th
                                key={h}
                                style={{
                                  textAlign: "left",
                                  padding: "6px 8px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  color: "#6b7280",
                                  borderBottom: "1px solid #e5e7eb",
                                }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {detail.result.entities.map((e, i) => (
                            <tr key={i}>
                              <td
                                style={{
                                  padding: "6px 8px",
                                  fontSize: "13px",
                                  color: "#111827",
                                  fontWeight: 500,
                                }}
                              >
                                {e.name}
                              </td>
                              <td
                                style={{
                                  padding: "6px 8px",
                                  fontSize: "12px",
                                  color: "#6b7280",
                                }}
                              >
                                {e.type}
                              </td>
                              <td
                                style={{
                                  padding: "6px 8px",
                                  fontSize: "12px",
                                  color: "#6b7280",
                                }}
                              >
                                {e.attributes.join(", ")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Section>
                  )}

                  {/* Rules */}
                  {detail.result.rules.length > 0 && (
                    <Section title="규칙">
                      <table
                        style={{ width: "100%", borderCollapse: "collapse" }}
                      >
                        <thead>
                          <tr>
                            {["조건", "결과", "도메인"].map((h) => (
                              <th
                                key={h}
                                style={{
                                  textAlign: "left",
                                  padding: "6px 8px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  color: "#6b7280",
                                  borderBottom: "1px solid #e5e7eb",
                                }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {detail.result.rules.map((r, i) => (
                            <tr key={i}>
                              <td
                                style={{
                                  padding: "6px 8px",
                                  fontSize: "13px",
                                  color: "#111827",
                                }}
                              >
                                {r.condition}
                              </td>
                              <td
                                style={{
                                  padding: "6px 8px",
                                  fontSize: "13px",
                                  color: "#111827",
                                }}
                              >
                                {r.outcome}
                              </td>
                              <td
                                style={{
                                  padding: "6px 8px",
                                  fontSize: "12px",
                                  color: "#6b7280",
                                }}
                              >
                                {r.domain}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Section>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Extraction list */}
      {!loading && extractions.length > 1 && (
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            padding: "16px 20px",
            marginTop: "16px",
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
              marginBottom: "12px",
            }}
          >
            추출 이력 ({extractions.length}건)
          </div>
          {extractions.map((ext) => (
            <div
              key={ext.extractionId}
              onClick={() => {
                void fetchExtraction(ext.extractionId).then((res) => {
                  if (res.success) setDetail(res.data);
                });
              }}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid #f3f4f6",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              <code
                style={{
                  backgroundColor: "#f3f4f6",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontFamily: "monospace",
                  fontSize: "11px",
                }}
              >
                {ext.extractionId.slice(0, 8)}
              </code>
              <span style={{ color: "#6b7280" }}>
                {ext.status} · P:{ext.processNodeCount} E:{ext.entityCount}
              </span>
              <span style={{ color: "#9ca3af" }}>
                {new Date(ext.createdAt).toLocaleDateString("ko-KR")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "20px" }}>
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
        {title}
      </div>
      {children}
    </div>
  );
}
