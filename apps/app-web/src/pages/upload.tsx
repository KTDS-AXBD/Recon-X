import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { uploadDocument, type UploadResult } from "../api/ingestion.ts";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "image/png",
  "image/jpeg",
];

const FORMAT_LABELS = ["PDF", "DOCX", "PPTX", "XLSX", "PNG", "JPG"];

export default function UploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFile = (file: File) => {
    setError(null);
    setResult(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(`지원하지 않는 파일 형식입니다: ${file.type || file.name}`);
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (selectedFile === null) return;
    setUploading(true);
    setError(null);
    try {
      const res = await uploadDocument(selectedFile);
      if (res.success) {
        setResult(res.data);
        setSelectedFile(null);
      } else {
        setError(res.error.message);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "업로드 중 오류가 발생했습니다.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
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
          문서 업로드
        </h1>
        <p
          style={{
            color: "#6b7280",
            marginTop: "6px",
            marginBottom: 0,
            fontSize: "14px",
          }}
        >
          SI 프로젝트 산출물을 업로드하여 AI 파이프라인 처리를 시작합니다.
        </p>
      </div>

      {/* Supported formats */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: "13px", color: "#6b7280" }}>
          지원 형식:
        </span>
        {FORMAT_LABELS.map((fmt) => (
          <span
            key={fmt}
            style={{
              fontSize: "12px",
              backgroundColor: "#e0e7ff",
              color: "#3730a3",
              padding: "2px 10px",
              borderRadius: "12px",
              fontWeight: 500,
            }}
          >
            {fmt}
          </span>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "#3b82f6" : "#d1d5db"}`,
          borderRadius: "12px",
          padding: "48px 32px",
          textAlign: "center",
          backgroundColor: dragging ? "#eff6ff" : "#ffffff",
          cursor: "pointer",
          marginBottom: "20px",
          transition: "all 0.15s ease",
        }}
      >
        <div
          style={{ fontSize: "40px", marginBottom: "12px", color: "#9ca3af" }}
        >
          ↑
        </div>
        <div style={{ fontSize: "15px", color: "#374151", fontWeight: 500 }}>
          파일을 드래그하거나 클릭하여 선택
        </div>
        <div
          style={{ fontSize: "13px", color: "#9ca3af", marginTop: "6px" }}
        >
          최대 파일 크기: 100MB
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {/* Selected file info */}
      {selectedFile !== null && (
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            padding: "16px 20px",
            marginBottom: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>
              {selectedFile.name}
            </div>
            <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>
          <button
            onClick={() => void handleUpload()}
            disabled={uploading}
            style={{
              padding: "10px 28px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: uploading ? "#d1d5db" : "#3b82f6",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 600,
              cursor: uploading ? "not-allowed" : "pointer",
            }}
          >
            {uploading ? "업로드 중..." : "업로드"}
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

      {/* Success */}
      {result !== null && (
        <div
          style={{
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "#166534",
              marginBottom: "12px",
            }}
          >
            업로드 성공
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
            <span style={{ color: "#6b7280" }}>Document ID</span>
            <code
              style={{
                backgroundColor: "#f3f4f6",
                padding: "2px 6px",
                borderRadius: "4px",
                fontFamily: "monospace",
                fontSize: "12px",
              }}
            >
              {result.documentId}
            </code>
            <span style={{ color: "#6b7280" }}>상태</span>
            <span>{result.status}</span>
            <span style={{ color: "#6b7280" }}>업로드 시각</span>
            <span>{new Date(result.uploadedAt).toLocaleString("ko-KR")}</span>
          </div>
          <button
            onClick={() => navigate("/pipeline")}
            style={{
              marginTop: "16px",
              padding: "8px 20px",
              borderRadius: "6px",
              border: "1px solid #3b82f6",
              backgroundColor: "#ffffff",
              color: "#3b82f6",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            파이프라인 모니터로 이동 →
          </button>
        </div>
      )}
    </div>
  );
}
