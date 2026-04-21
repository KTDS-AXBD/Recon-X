// F376: Foundry-X 핸드오프 실사례 타임라인 — 6개 서비스 round-trip 시각화
// 데이터 소스: REQ-035 M-2 산출물 (현재는 seed 데이터 + 실 1건 혼합 — RP-8 방침)
// TODO: 실 API 연결 시 GET /api/handoff/jobs?status=completed 교체
import { useRef } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { HandoffCard, type HandoffService } from "./HandoffCard";

// Seed 데이터 — LPON 온누리상품권 파일럿 6 서비스 round-trip (실 1건 + 예시 5건)
const HANDOFF_SERVICES: HandoffService[] = [
  {
    id: "lpon-budget",
    name: "lpon-budget",
    nameKo: "예산 관리",
    status: "completed",
    completedAt: "2026-04-20",
    aiReadyScore: 0.91,
    driftSelfReport: 99.7,
    driftIndependent: 97.2,
    reviewer: "Sinclair Seo",
    policyCount: 5,
    compliance: [
      { label: "PII 마스킹", passed: true },
      { label: "감사 로그", passed: true },
    ],
    roundTripSummary: "Decode-X → Foundry-X → Gate Pass. 예산 배정/집행/잔액 정책 5건 확정.",
  },
  {
    id: "lpon-charge",
    name: "lpon-charge",
    nameKo: "충전",
    status: "completed",
    completedAt: "2026-04-21",
    aiReadyScore: 0.82,
    driftSelfReport: 99.0,
    driftIndependent: 95.6,
    reviewer: "Sinclair Seo",
    policyCount: 8,
    skillId: "66f5e9cc-77f9-406a-b694-338949db0901",
    compliance: [
      { label: "PII 마스킹", passed: true },
      { label: "감사 로그", passed: true },
    ],
    roundTripSummary: "실 사례 — Decode-X → Foundry-X → Gate Pass. 충전 시나리오 8건 정책 확정. 독립 검증 409→Pass.",
  },
  {
    id: "lpon-purchase",
    name: "lpon-purchase",
    nameKo: "구매",
    status: "completed",
    completedAt: "2026-04-21",
    aiReadyScore: 0.78,
    driftSelfReport: 98.5,
    driftIndependent: 94.1,
    reviewer: "Sinclair Seo",
    policyCount: 12,
    compliance: [
      { label: "PII 마스킹", passed: true },
      { label: "감사 로그", passed: false },
    ],
    roundTripSummary: "Decode-X → Foundry-X → Gate Pass. 구매 한도/유효기간/가맹점 정책 12건. 감사 로그 미비 TD 등록 예정.",
  },
  {
    id: "lpon-payment",
    name: "lpon-payment",
    nameKo: "결제",
    status: "pending",
    aiReadyScore: 0.65,
    compliance: [
      { label: "PII 마스킹", passed: true },
      { label: "감사 로그", passed: false },
    ],
    roundTripSummary: "Foundry-X Gate 검토 중 — 결제 취소/오류 정책 불완전. HITL 재검토 필요.",
  },
  {
    id: "lpon-refund",
    name: "lpon-refund",
    nameKo: "환불",
    status: "failed",
    aiReadyScore: 0.43,
    compliance: [
      { label: "PII 마스킹", passed: false },
      { label: "감사 로그", passed: false },
    ],
    roundTripSummary: "Foundry-X Gate Fail — 환불 정책 Spec 부족. 추가 역공학 필요.",
  },
  {
    id: "lpon-gift",
    name: "lpon-gift",
    nameKo: "선물",
    status: "pending",
    aiReadyScore: 0.71,
    compliance: [
      { label: "PII 마스킹", passed: true },
      { label: "감사 로그", passed: false },
    ],
    roundTripSummary: "초기 Spec 추출 완료. Foundry-X 핸드오프 준비 중.",
  },
];

export function FoundryXTimeline() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -240 : 240, behavior: "smooth" });
  };

  const completed = HANDOFF_SERVICES.filter((s) => s.status === "completed").length;
  const total = HANDOFF_SERVICES.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Foundry-X Production 핸드오프 실사례</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            LPON 온누리상품권 파일럿 · {completed}/{total} 서비스 완료
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <RefreshCw className="w-3 h-3" />
          REQ-035 M-2 데이터 · 2026-04-21
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-muted rounded-full h-2">
          <div
            className="h-2 rounded-full bg-green-500 transition-all"
            style={{ width: `${(completed / total) * 100}%` }}
          />
        </div>
        <span className="text-xs font-mono text-muted-foreground">
          {Math.round((completed / total) * 100)}%
        </span>
      </div>

      {/* Timeline scroll area */}
      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background border rounded-full p-1 shadow-sm hover:bg-muted transition-colors -ml-3"
          aria-label="왼쪽 스크롤"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide px-4 py-2"
          style={{ scrollbarWidth: "none" }}
        >
          {HANDOFF_SERVICES.map((service, index) => (
            <HandoffCard key={service.id} service={service} index={index} />
          ))}
        </div>

        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background border rounded-full p-1 shadow-sm hover:bg-muted transition-colors -mr-3"
          aria-label="오른쪽 스크롤"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        ← 스크롤하여 전체 round-trip 확인 · 카드 클릭으로 상세 보기
      </p>
    </div>
  );
}
