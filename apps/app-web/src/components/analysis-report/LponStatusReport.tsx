import {
  Search,
  Target,
  DollarSign,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Layers,
  CircleDot,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Code2,
  FileSearch,
} from "lucide-react";
import {
  SectionHeader,
  DataTable,
  TaskCard,
  FindingCard,
  PolicyExampleCard,
} from "./StatusReportWidgets";

export function LponStatusReport() {
  return (
    <>
      {/* ─── Section B: 핵심 평가 — 소스코드 역공학 가능성 ─── */}
      <section>
        <SectionHeader
          icon={Search}
          title="핵심 평가 — 소스코드 역공학은 가능한가?"
          subtitle="전자식 온누리상품권 플랫폼의 소스코드·문서에서 도메인 지식을 추출할 수 있는가"
        />

        {/* 핵심 질문 프레이밍 */}
        <div className="p-4 rounded-lg border mb-5" style={{
          borderColor: "var(--accent)",
          backgroundColor: "color-mix(in srgb, var(--accent) 6%, transparent)",
        }}>
          <p className="text-sm" style={{ color: "var(--text-primary)" }}>
            <strong>프로젝트 핵심 질문:</strong> 전자식 온누리상품권 플랫폼의 소스코드와 운영 문서(규정, 매뉴얼, 사용자 가이드 등)를 AI로 분석하여,
            <em> 플랫폼의 비즈니스 로직과 운영 정책을 체계적으로 추출·자산화</em>할 수 있는가?
            소스코드 API와 문서 간 갭(Gap)은 어디에 있으며, 어떻게 보완할 수 있는가?
          </p>
        </div>

        {/* 추출 차원별 평가 */}
        <h4 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>
          <Layers className="w-4 h-4 inline mr-1" />
          추출 차원별 평가
        </h4>
        <DataTable
          headers={["추출 차원", "수준", "현재 결과", "활용도"]}
          rows={[
            [
              "업무 규칙·정책",
              "★★★★☆",
              "88건 문서 → 848 정책 approved",
              "높음 — 상품권 발행·충전·사용·환불 규칙 추출",
            ],
            [
              "도메인 용어·개념",
              "★★★★★",
              "7,332 용어 자동 수집",
              "매우 높음 — 문서당 86.3건, 도메인 사전 즉시 활용",
            ],
            [
              "Skill 패키지",
              "★★★★☆",
              "859 Skill 패키징 완료",
              "높음 — MCP/OpenAPI 어댑터 즉시 생성 가능",
            ],
            [
              "소스코드 ↔ 문서 커버리지",
              "★★☆☆☆",
              "98/1,128 API 매칭 (8.7%)",
              "제한적 — 소스 API 대비 문서 커버리지 매우 낮음",
            ],
            [
              "암묵지 추론",
              "★★★☆☆",
              "규정·매뉴얼에서 비명시 규범 도출",
              "보통 — HITL 검증 후 신뢰 가능",
            ],
            [
              "프로세스 흐름",
              "★★★☆☆",
              "소스코드 API 패턴에서 흐름 복원",
              "보통 — 주요 흐름 파악 가능, 세부 분기 누락",
            ],
          ]}
        />

        {/* FactCheck 분석 결과 */}
        <div className="mt-5">
          <h4 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>
            <FileSearch className="w-4 h-4 inline mr-1" />
            FactCheck — 소스코드 ↔ 문서 API 커버리지
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border)" }}>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>전체 소스 API</div>
              <div className="text-xl font-bold" style={{ color: "#3b82f6" }}>1,128건</div>
              <div className="text-[0.65rem]" style={{ color: "var(--text-secondary)" }}>3회 분석 (v1/v2/v3)</div>
            </div>
            <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border)" }}>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>문서 매칭</div>
              <div className="text-xl font-bold" style={{ color: "#10b981" }}>98건</div>
              <div className="text-[0.65rem]" style={{ color: "var(--text-secondary)" }}>LLM 기반 의미 매칭</div>
            </div>
            <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border)" }}>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>미문서화 갭</div>
              <div className="text-xl font-bold" style={{ color: "#ef4444" }}>1,030건</div>
              <div className="text-[0.65rem]" style={{ color: "var(--text-secondary)" }}>소스 API 대비 문서 부재</div>
            </div>
            <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border)" }}>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>커버리지</div>
              <div className="text-xl font-bold" style={{ color: "#f59e0b" }}>8.7%</div>
              <div className="text-[0.65rem]" style={{ color: "var(--text-secondary)" }}>문서/소스 일치 비율</div>
            </div>
          </div>

          <h4 className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
            <Code2 className="w-4 h-4 inline mr-1" />
            주요 미문서화 API 패턴
          </h4>
          <DataTable
            headers={["API 패턴", "예상 갯수", "성격", "문서화 시급도"]}
            rows={[
              ["/gift/*", "다수", "상품권 발행·조회·관리 API", "높음"],
              ["/manual/*", "다수", "수동 처리·예외 관리 API", "높음"],
              ["/chargeDealing/*", "다수", "충전 거래 처리 API", "높음"],
              ["/v2/messages/*", "다수", "메시지·알림 API (v2)", "보통"],
              ["/admin/*", "다수", "관리자 기능 API", "보통"],
            ]}
          />
        </div>

        {/* 종합 판정 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          {/* 잘 되는 것 */}
          <div className="p-4 rounded-lg border" style={{ borderColor: "#10b981" }}>
            <div className="flex items-center gap-2 mb-3">
              <ThumbsUp className="w-4 h-4" style={{ color: "#10b981" }} />
              <span className="text-sm font-semibold" style={{ color: "#10b981" }}>
                생각보다 잘 되는 것
              </span>
            </div>
            <ul className="space-y-2 text-xs" style={{ color: "var(--text-secondary)" }}>
              <li className="flex items-start gap-1.5">
                <CircleDot className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "#10b981" }} />
                <span><strong style={{ color: "var(--text-primary)" }}>도메인 전환 유연성</strong> — 퇴직연금 → 온누리상품권 전환에 모델 재학습 없이 동일 파이프라인 즉시 적용</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CircleDot className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "#10b981" }} />
                <span><strong style={{ color: "var(--text-primary)" }}>용어 수집 밀도</strong> — 문서당 86.3건 용어 추출, 퇴직연금(34건)보다 2.5배 높은 수집률</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CircleDot className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "#10b981" }} />
                <span><strong style={{ color: "var(--text-primary)" }}>5-Stage 파이프라인 완주</strong> — Ingestion → Skill까지 전 단계 end-to-end 완료 (88건 → 859 Skills)</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CircleDot className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "#10b981" }} />
                <span><strong style={{ color: "var(--text-primary)" }}>정책 승인 효율</strong> — 848건 정책 전량 승인, 벌크 승인(333건) 운영 검증 완료</span>
              </li>
            </ul>
          </div>

          {/* 부족한 것 */}
          <div className="p-4 rounded-lg border" style={{ borderColor: "#ef4444" }}>
            <div className="flex items-center gap-2 mb-3">
              <ThumbsDown className="w-4 h-4" style={{ color: "#ef4444" }} />
              <span className="text-sm font-semibold" style={{ color: "#ef4444" }}>
                아직 부족한 것
              </span>
            </div>
            <ul className="space-y-2 text-xs" style={{ color: "var(--text-secondary)" }}>
              <li className="flex items-start gap-1.5">
                <CircleDot className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "#ef4444" }} />
                <span><strong style={{ color: "var(--text-primary)" }}>API 문서 커버리지 8.7%</strong> — 소스코드에 1,128개 API가 있으나 문서로 커버되는 것은 98건뿐</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CircleDot className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "#ef4444" }} />
                <span><strong style={{ color: "var(--text-primary)" }}>도메인 코드 하드코딩</strong> — 정책 코드가 POL-PENSION-*으로 고정, 온누리상품권 도메인 코드(POL-LPON-*) 자동 감지 미구현</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CircleDot className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "#ef4444" }} />
                <span><strong style={{ color: "var(--text-primary)" }}>Wave 2 미착수</strong> — Archive 폴더 127건 문서 미처리 (별도 세션 예정)</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CircleDot className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "#ef4444" }} />
                <span><strong style={{ color: "var(--text-primary)" }}>Neo4j 동기화 대기</strong> — 3,752건 ontology 노드 backfill 미완 (staging 배포 후 실행 필요)</span>
              </li>
            </ul>
          </div>

          {/* 보강 필요 */}
          <div className="p-4 rounded-lg border" style={{ borderColor: "#f59e0b" }}>
            <div className="flex items-center gap-2 mb-3">
              <Minus className="w-4 h-4" style={{ color: "#f59e0b" }} />
              <span className="text-sm font-semibold" style={{ color: "#f59e0b" }}>
                보강하면 가능한 것
              </span>
            </div>
            <ul className="space-y-2 text-xs" style={{ color: "var(--text-secondary)" }}>
              <li className="flex items-start gap-1.5">
                <CircleDot className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "#f59e0b" }} />
                <span><strong style={{ color: "var(--text-primary)" }}>소스코드 직접 분석</strong> — Java/Spring 소스 AST 분석으로 API 엔드포인트 자동 추출, 커버리지 100% 도달 가능</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CircleDot className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "#f59e0b" }} />
                <span><strong style={{ color: "var(--text-primary)" }}>FactCheck 문서 보완 자동 제안</strong> — 1,030건 갭을 기반으로 필요 문서 목록 자동 생성, 우선순위 제안</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CircleDot className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "#f59e0b" }} />
                <span><strong style={{ color: "var(--text-primary)" }}>도메인 코드 자동 감지</strong> — org별 도메인 매핑 설정으로 POL-LPON-* 코드 자동 생성</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CircleDot className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "#f59e0b" }} />
                <span><strong style={{ color: "var(--text-primary)" }}>Wave 2 투입</strong> — Archive 127건 추가 분석으로 정책·용어 자산 확대</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 결론 */}
        <div className="mt-5">
          <h4 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>
            <Target className="w-4 h-4 inline mr-1" />
            이 추출 결과로 무엇을 할 수 있는가?
          </h4>
          <DataTable
            headers={["활용 영역", "AI 자동 생성", "전문가 보완", "종합"]}
            rows={[
              ["비즈니스 정책 (상품권 규정)", "80~90%", "10~20%", "✅ 발행·충전·환불 규칙 즉시 활용"],
              ["도메인 용어 사전", "90~95%", "5~10%", "✅ 7,332 용어 체계화 완료"],
              ["Skill 패키지 (MCP/API)", "85~90%", "10~15%", "✅ 859건 즉시 배포 가능"],
              ["소스코드 문서화 보완", "20~30%", "70~80%", "⚠️ FactCheck 기반 갭 우선순위 제공"],
              ["프로세스 흐름도", "30~40%", "60~70%", "⚠️ API 패턴에서 부분 복원 수준"],
              ["시스템 통합 설계", "10~20%", "80~90%", "❌ 별도 아키텍처 설계 필요"],
            ]}
          />
        </div>

        {/* 최종 판정 */}
        <div className="mt-4 p-4 rounded-lg" style={{
          backgroundColor: "color-mix(in srgb, var(--accent) 8%, transparent)",
          border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
        }}>
          <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
            종합 판정
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            <strong style={{ color: "var(--text-primary)" }}>현재 수준:</strong>{" "}
            전자식 온누리상품권 플랫폼의 88건 문서에서 <em>848건 정책, 7,332건 용어, 859건 Skill</em>을 추출했어요.
            도메인 전환(퇴직연금 → 온누리상품권) 시 파이프라인 재설정 없이 즉시 적용 가능함을 검증했고,
            이는 AI Foundry의 <em>도메인 비의존(domain-agnostic) 아키텍처</em>가 유효함을 입증해요.
          </p>
          <p className="text-xs leading-relaxed mt-2" style={{ color: "var(--text-secondary)" }}>
            <strong style={{ color: "var(--text-primary)" }}>차별점:</strong>{" "}
            FactCheck 분석에서 소스코드 1,128개 API 대비 문서 커버리지가 8.7%에 불과한 점이 발견되었어요.
            이는 <em>SI 프로젝트의 구조적 문제</em>(문서 미갱신, 암묵지 소스코드 잠금)를 정량적으로 보여주며,
            AI Foundry가 이 갭을 메울 수 있는 도구임을 시사해요.
          </p>
          <p className="text-xs leading-relaxed mt-2" style={{ color: "var(--text-secondary)" }}>
            <strong style={{ color: "var(--text-primary)" }}>다음 단계:</strong>{" "}
            Wave 2 (Archive 127건) 투입, 도메인 코드 자동 감지(POL-LPON-*), Neo4j backfill 완료,
            그리고 소스코드 직접 분석(AST)으로 API 커버리지를 높이는 것이 우선이에요.
          </p>
        </div>
      </section>

      {/* ─── Section C: 품질 평가 ─── */}
      <section>
        <SectionHeader
          icon={Target}
          title="품질 평가"
          subtitle="온누리상품권 도메인 추출 성과 및 한계 분석"
        />

        <FindingCard
          icon={CheckCircle2}
          title="잘 되는 것 — 추출 사례"
          color="#10b981"
          items={[
            "상품권 발행·충전·사용·환불 전 과정의 업무 규칙을 조건-기준-결과 트리플로 자동 추출 (848건)",
            "규정집, 매뉴얼, FAQ 등 다양한 문서 유형에서 일관된 정책 구조화 — 파싱 성공률 96.6% (85/88)",
            "도메인 용어 밀도가 퇴직연금 대비 2.5배 — 온누리상품권 특화 용어 사전으로 즉시 활용 가능",
            "벌크 승인 333건 운영 — 대량 정책 검토·승인 워크플로 실용성 검증",
          ]}
        />

        <div className="mt-4">
          <FindingCard
            icon={AlertTriangle}
            title="한계점"
            color="#f59e0b"
            items={[
              "소스코드 ↔ 문서 커버리지 8.7% — 소스에 존재하는 API의 91.3%가 문서에 미반영",
              "정책 코드 POL-PENSION-* 하드코딩 — 온누리상품권 도메인 코드가 아닌 퇴직연금 코드로 생성됨",
              "PPTX 대용량 파일 1건 파싱 실패 (524 timeout) — Cloudflare 30초 제한",
              "Neo4j 그래프 backfill 3,752건 대기 — 온톨로지 시각화·검색 미완",
            ]}
          />
        </div>

        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
            종합 판단
          </h4>
          <DataTable
            headers={["평가 항목", "수준", "비고"]}
            rows={[
              ["문서 파싱 성공률", "★★★★★", "85/88 = 96.6% — PDF/DOCX/XLSX 안정적"],
              ["정책 추출 (Stage 3)", "★★★★☆", "848건 approved — 벌크 승인 운영 완료"],
              ["용어 수집 밀도", "★★★★★", "7,332건 — 문서당 86.3건 (매우 높음)"],
              ["Skill 패키징 (Stage 5)", "★★★★☆", "859건 draft — queue + backfill 병행 생성"],
              ["소스코드 ↔ 문서 일치", "★★☆☆☆", "8.7% — 문서화 갭이 매우 큼"],
              ["도메인 코드 정확성", "★★☆☆☆", "POL-PENSION 하드코딩 → 수정 필요"],
            ]}
          />
        </div>

        <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: "color-mix(in srgb, var(--accent) 8%, transparent)" }}>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            <strong style={{ color: "var(--text-primary)" }}>결론:</strong>{" "}
            88건 온누리상품권 문서에서 848건 정책, 7,332건 용어, 859건 Skill을 추출하여 5-Stage 파이프라인을 완주했어요.
            파싱 성공률 96.6%, 용어 밀도 86.3건/문서로 퇴직연금 파일럿 대비 더 높은 수집 효율을 보여줬어요.
            다만 소스코드 ↔ 문서 커버리지(8.7%)와 도메인 코드 하드코딩은 즉시 개선이 필요해요.
          </p>
        </div>
      </section>

      {/* ─── Section D: 파이프라인 상세 ─── */}
      <section>
        <SectionHeader
          icon={Layers}
          title="파이프라인 Stage별 상세"
          subtitle="5-Stage 파이프라인 단계별 처리 현황"
        />

        <DataTable
          headers={["Stage", "처리 현황", "산출물", "비고"]}
          highlightCol={2}
          rows={[
            ["Stage 1 — Ingestion", "85/88 파싱 (96.6%)", "85건 문서 청크", "2건 pending(PDF), 1건 failed(PPTX 524)"],
            ["Stage 2 — Extraction", "111건 완료", "프로세스·엔티티·규칙 추출", "중복 6건 cancelled 처리"],
            ["Stage 3 — Policy", "848건 approved", "조건-기준-결과 정책 트리플", "333건 벌크 승인 포함"],
            ["Stage 4 — Ontology", "848건 완료", "7,332 용어 + SKOS URI", "Neo4j backfill 3,752건 대기"],
            ["Stage 5 — Skill", "859건 draft", ".skill.json 패키지", "queue + 수동 backfill 병행"],
          ]}
        />

        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
            퇴직연금 vs 온누리상품권 비교
          </h4>
          <DataTable
            headers={["지표", "퇴직연금 (Miraeasset)", "온누리상품권 (LPON)", "비율"]}
            highlightCol={2}
            rows={[
              ["투입 문서", "787건 (15건 선별)", "88건", "×0.11"],
              ["파싱 성공률", "86.7% (13/15)", "96.6% (85/88)", "+10%p"],
              ["정책 (Approved)", "2,827건", "848건", "×0.30"],
              ["온톨로지 용어", "1,441건", "7,332건", "×5.09"],
              ["Skill 패키지", "3,065건", "859건", "×0.28"],
              ["용어/문서 밀도", "~34건/문서", "~86.3건/문서", "×2.5"],
              ["정책/문서 밀도", "~3.6건/문서", "~9.6건/문서", "×2.7"],
            ]}
          />
        </div>
      </section>

      {/* ─── Section E: LLM 비용 분석 ─── */}
      <section>
        <SectionHeader
          icon={DollarSign}
          title="LLM 비용 분석"
          subtitle="온누리상품권 파이프라인 비용 및 효율"
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="p-4 rounded-lg border" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4" style={{ color: "#ef4444" }} />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>LPON 파이프라인 추정</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: "#ef4444" }}>~$12</div>
            <div className="text-[0.65rem]" style={{ color: "var(--text-secondary)" }}>88건 문서 × 5-Stage</div>
          </div>
          <div className="p-4 rounded-lg border" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4" style={{ color: "#3b82f6" }} />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>문서당 비용</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: "#3b82f6" }}>~14¢</div>
            <div className="text-[0.65rem]" style={{ color: "var(--text-secondary)" }}>88건 기준 · 퇴직연금보다 높음</div>
          </div>
          <div className="p-4 rounded-lg border" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4" style={{ color: "#10b981" }} />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>비용 절감률</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: "#10b981" }}>60~70%</div>
            <div className="text-[0.65rem]" style={{ color: "var(--text-secondary)" }}>티어 라우팅 vs Opus 단일</div>
          </div>
          <div className="p-4 rounded-lg border" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4" style={{ color: "#8b5cf6" }} />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>FactCheck 비용</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: "#8b5cf6" }}>~$3</div>
            <div className="text-[0.65rem]" style={{ color: "var(--text-secondary)" }}>1,128건 API 3회 분석</div>
          </div>
        </div>

        <div className="p-3 rounded-lg" style={{ backgroundColor: "color-mix(in srgb, var(--accent) 8%, transparent)" }}>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            <strong style={{ color: "var(--text-primary)" }}>비용 분석:</strong>{" "}
            온누리상품권 88건 파이프라인 비용은 약 $12로, 문서당 ~14¢ 수준이에요.
            퇴직연금(~10¢/건) 대비 40% 높은데, 이는 문서당 용어 밀도가 2.5배 높아 Stage 4(Ontology) 처리량이 증가했기 때문이에요.
            FactCheck 분석(소스코드 ↔ 문서 매칭)은 약 $3 추가 비용이 발생했어요.
          </p>
        </div>
      </section>

      {/* ─── Section F: 향후 과제 ─── */}
      <section>
        <SectionHeader
          icon={Target}
          title="향후 과제"
          subtitle="온누리상품권 분석 고도화 로드맵"
        />
        <div className="space-y-3">
          <TaskCard
            priority="high"
            title="도메인 코드 자동 감지"
            description="POL-PENSION-* 하드코딩 → org별 도메인 코드 매핑 (POL-LPON-*) 자동 적용"
            status="즉시"
          />
          <TaskCard
            priority="high"
            title="Neo4j Backfill 실행"
            description="3,752건 ontology 노드를 Neo4j Aura에 동기화 — staging 배포 후 backfill 스크립트 실행"
            status="준비 완료"
          />
          <TaskCard
            priority="high"
            title="Wave 2 문서 투입"
            description="Archive 폴더 127건 추가 문서 분석 — 정책·용어 자산 확대"
            status="대기"
          />
          <TaskCard
            priority="medium"
            title="소스코드 직접 분석 (AST)"
            description="Java/Spring 소스 AST 분석으로 API 엔드포인트 자동 추출, FactCheck 커버리지 향상"
            status="검토 중"
          />
          <TaskCard
            priority="medium"
            title="FactCheck 갭 기반 문서 보완"
            description="1,030건 미문서화 API에 대한 자동 문서 생성 제안 + 우선순위 랭킹"
            status="검토 중"
          />
          <TaskCard
            priority="medium"
            title="Skill 패키지 MCP 어댑터"
            description="859건 Skill을 MCP Server에 등록, Claude Desktop에서 조회·실행 검증"
            status="AIF-REQ-009"
          />
          <TaskCard
            priority="low"
            title="PPTX 대용량 파일 처리"
            description="524 timeout 실패 1건 — 분할 업로드 또는 비동기 파싱 도입"
            status="AIF-REQ-004"
          />
        </div>
      </section>

      {/* ─── 대표 정책 예시 ─── */}
      <section>
        <SectionHeader
          icon={ShieldCheck}
          title="대표 추출 정책 예시"
          subtitle="온누리상품권 도메인에서 추출된 주요 정책 (POL-PENSION-* 코드는 하드코딩 이슈)"
        />
        <div className="p-3 mb-4 rounded-lg border" style={{
          borderColor: "#f59e0b",
          backgroundColor: "color-mix(in srgb, #f59e0b 6%, transparent)",
        }}>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            <AlertTriangle className="w-3 h-3 inline mr-1" style={{ color: "#f59e0b" }} />
            <strong style={{ color: "var(--text-primary)" }}>알림:</strong>{" "}
            현재 정책 코드가 POL-PENSION-*으로 생성되고 있어요 (도메인 코드 하드코딩 이슈).
            실제로는 온누리상품권 도메인의 정책이며, 향후 POL-LPON-*으로 마이그레이션 예정이에요.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <PolicyExampleCard
            code="POL-PENSION-BN-*"
            title="상품권 발행 규칙"
            description="전자식 온누리상품권 발행 시 본인인증 및 발행 한도 검증 — 1인당 월 구매 한도 제한"
          />
          <PolicyExampleCard
            code="POL-PENSION-CT-*"
            title="충전 거래 검증"
            description="상품권 충전 시 결제수단 유효성 및 충전 한도 검증 — 일/월 단위 누적 한도 적용"
          />
          <PolicyExampleCard
            code="POL-PENSION-WD-*"
            title="환불 조건 규칙"
            description="온누리상품권 환불 시 사용 이력 확인 및 환불 수수료 산정 — 사용 비율에 따른 차등 적용"
          />
          <PolicyExampleCard
            code="POL-PENSION-RG-*"
            title="가맹점 등록 기준"
            description="온누리상품권 가맹점 등록 시 소상공인 확인 및 업종 적격 심사 — 매출 기준 충족 여부"
          />
        </div>
      </section>
    </>
  );
}
