# 검토 피드백 — Round 2

**날짜:** 2026-04-18
**PRD:** /home/sinclair/work/axbd/Decode-X/docs/req-interview/decode-x-v1.2/prd-v2.md
**전체 소요:** 43.1초
**모델 레지스트리:** /home/sinclair/.claude/plugins/cache/ax-marketplace/ax/1.1.0/skills/req-interview/config/models.json

---

## 프로세스 타이밍

| AI | 모델 | 역할 | 소요(초) | 시도 | Fallback | 잘림 | 착수 판단 |
|----|------|------|---------|------|----------|------|----------|
| ChatGPT | openai/gpt-4.1-mini-2025-04-14 | 논리적 완결성, 실행 가능성 | 32.2 | 1 | openai/gpt-4.1-mini | - | Conditional |
| Gemini | google/gemini-2.5-flash | 시장/트렌드 관점, 유사 사례 | 27.6 | 1 | - | - | Conditional |
| DeepSeek | deepseek/deepseek-chat-v3 | 기술적 실현 가능성, 아키텍처 리뷰 | 43.1 | 1 | - | - | Conditional |

---

## ChatGPT 검토의견

**착수 판단:** Conditional
**역할:** 논리적 완결성, 실행 가능성
**소요:** 32.2초

아래는 Decode-X PRD (v1.2 기준)에 대한 실무적 검토 의견입니다.

---

1. **논리적 완결성**

- 전반적으로 문제 인식(비결정성, 검증불가, 스케일 한계, 지식 소실) → 방법론 선정(CPG+AutoSpec+Differential) → Spec 포맷 설계(3-layer 컨테이너) → Harness 및 검증 체계 → KPI/Phase 계획 → Foundry-X 통합 전략까지 논리 흐름이 매우 체계적이고 일관적입니다.
- 다만, §1.5 Mission Pivot에서 “100% 등가 Copy Machine” 프레임 폐기 선언 후 Tier-A/B/C 분리 및 Empty Slot 발굴·채움으로 성공 기준을 재정의한 부분의 인과관계가 다소 복잡하게 서술되어 있습니다.  
  → 예: “Tier-A는 행위 동등성 ≥95% + Empty Slot Fill Rate ≥70%”인데, Empty Slot Fill Rate가 낮을 때 구체적으로 어떤 운영 시나리오가 발생하는지, 그리고 Tier-B/C와의 경계에서 판단 기준이 모호할 수 있습니다.  
  → 제안: Tier별 성공 기준과 실제 운영 영향(예: Tier-C Sunset 시 고객 반응)을 좀 더 시나리오 형태로 명료화할 필요가 있습니다.
- §2.5 Core Service & Empty Slot 공정과 §4.5 Harness의 연결 고리가 매우 중요하지만, Harness가 Empty Slot 미충족 시 Domain Archeologist 에스컬레이션을 일으키는 절차가 너무 기술적 설명에 집중되어 있어, 이해관계자(도메인 SME, PM) 대상 간략 설명이 추가되면 좋겠습니다.
- Foundry-X와 역할 분담 및 통합 전략(§13)은 Decode-X 산출물이 Foundry-X의 “Input Plane” 역할임을 명확히 하여 잘 설계되었으나, 두 조직 간 책임 소재가 충돌할 경우 프로세스 조정 방안(R&R 충돌, SLA 불일치)에 대한 시나리오가 빠져 있습니다.

---

2. **실행 가능성**

- 12개월(50주) 일정과 12명 규모 인력 산정은 대규모 SI/ITO 환경에서는 현실적인 편입니다.  
- 다만, 다음 부분들은 과소평가 우려가 있습니다.  
  a) **Domain Archeologist 역할(1명)**: 암묵지 추출·인터뷰·Runbook 역추출은 매우 경험과 시간 소모가 큰 작업임. 1명으로 12개월 내 Target Empty Slot Fill Rate 70% 달성이 버거울 수 있음 → 추가 지원 인력 또는 외부 자문 검토 권고  
  b) **Harness 및 Differential Testing 구축(Phase 2~3)**: 복잡한 LangGraph 상태기계·Guardrail·Dual Run 환경 구축과 Playwright/Pact 통합은 예상보다 기술 난이도가 높아 일정 지연 위험 존재  
  c) **LLM 비용 및 품질 관리**: 비용 통제(R1), 모델 버전관리, 프라이빗 모델 폴백 등은 복합 이슈로, 비용과 성능 트레이드오프 조율에 추가 시간이 소요될 수 있음  
  d) **마이그레이션 계획(§12)**: 20주 별도 워크스트림이 Phase 1~2와 중첩되는데, 팀 역량이 분산되어 핵심 개발 일정에 영향 줄 가능성 존재  
- 전반적으로 기술 난이도 대비 리스크 대응 인력과 예비 일정 버퍼가 다소 부족해 보임.

---

3. **누락된 핵심 요소**

- **사용자 교육 및 온보딩 계획 구체화 부족**  
  → 특히 Domain Archeologist, Legacy Analyst, Spec Reviewer 등 주요 역할별 교육 커리큘럼과 온보딩 단계가 부록 C에서 간략히 언급되었으나, PRD 본문에 명확한 운영 정책과 교육 일정, 산출물 품질 보증 방법이 상세히 포함되어야 함  
- **고객사 및 현업 이해관계자와의 협업·소통 방안 미기재**  
  → 암묵지 발굴 시점부터 고객사 SME와의 지속 협업이 중요한데, HITL 인터뷰 주기, 피드백 루프, 갈등 조정 프로세스가 빠져 있음  
- **위기 상황 대응 프로세스(Incident Management)**  
  → Harness Failures, Spec 불일치, Foundry-X Drift 발생 시 긴급 대응 프로세스 및 조직 간 책임 연계가 미흡  
- **보안·컴플라이언스 관리 세부 계획 (부록 E는 있으나)**  
  → 개인정보·암묵지 노출 위험, 폐쇄망 운영 등 민감 이슈에 대한 구체적 보안 정책, 감사 절차, 위반 시 대응 체계가 PRD 본문에 좀 더 명확히 기술되어야 함  
- **성공 이후 확장 및 유지보수 전략 미흡**  
  → 12개월 이후 유지보수, 신규 도메인 확장, 기술 진화 대응을 위한 중장기 로드맵 부재 (Phase 3 이후 일부 있으나 구체 부족)

---

4. **리스크**

- **가장 큰 리스크는 “최초 입력 자료 불완전성 → 불량 자산 복제”(R12, 높음 확률·매우 높음 영향)**  
  → Input Completeness Score 낮은 핵심 서비스가 많으면 Decode-X Spec 품질 저하 → Foundry-X 동기화 실패 → 전체 프로젝트 실패로 직결  
  → 이 리스크는 기술뿐 아니라 조직·문화적 측면(고객사 데이터 품질, SME 협조도)에 크게 의존하므로, 기술적 대응 외 별도 거버넌스 강화 필요  
- **Harness Tier-3 오판에 의한 프로덕션 영향 우려(R9)**  
  → 에이전트 통제 실패 시 치명적 장애 가능성, Guardrail 강화 및 프로덕션 적용 전 충분한 시뮬레이션·테스트 필수  
- **Foundry-X 버전 스큐(R13)**  
  → 빠른 진화 주기와 Spec 포맷 드리프트가 Decode-X 산출물의 유효성 저하를 초래할 수 있음.  
  → 두 조직 간 정기 싱크 미팅과 자동화된 포맷 검증 체계 마련이 반드시 이뤄져야 함  
- **도메인 암묵지 유출(R14)**  
  → HITL 세션 중 민감 정보 노출 및 법적 분쟁 가능성. 보안·감사 정책 미준수 시 심각한 법적 리스크 발생  
- **LLM 모델 의존성 및 환각**  
  → 모델 성능 변화, 프롬프트 민감도, 비용 증가 등은 지속 모니터링과 빠른 전환 프로세스가 필요

---

5. **착수 판단**

- 전체 설계는 매우 정교하며, 리스크도 명확히 식별되어 있고, 개선 포인트가 구체적으로 제시되어 있어 조치 계획 수립에 용이함  
- 그러나 실행 난이도 및 조직·프로세스 준비 상태(특히 Domain Archeologist 역량 확보, 고객사 협업 거버넌스, Foundry-X 연계 준비)가 충분히 확보되었는지 검증이 필요함  
- 따라서, **조건부 착수(Conditional)**를 권고하며 다음 조건 충족 시 본격 착수 권장합니다:

  1. Domain Archeologist 역할 최소 1명 이상 즉시 확보 및 교육 완료  
  2. 고객사 및 Foundry-X와 MoU, 협업 프로세스, SLA 등 거버넌스 체계 확정  
  3. 프로토타입의 Option C 마이그레이션 Shadow 모드 인프라 구축 완료  
  4. LLM 벤더 선정 및 비용·성능 관리 정책 수립  
  5. Phase 0 Kick-off 체크리스트(부록 D-3) 중 핵심 항목 80% 이상 완료

---

# 요약

| 항목 | 의견 요약 |
|-------|-----------|
| 논리적 완결성 | 매우 우수하나 Mission Pivot Tier 기준과 운영 시나리오 구체화 필요 |
| 실행 가능성 | 전반적으론 타당하나 Domain Archeologist 업무량·Harness 구축 난이도 과소평가 우려 |
| 누락 요소 | 사용자 교육·고객사 협업·위기 대응·보안 정책·유지보수 전략 보완 필요 |
| 주요 리스크 | 입력 불완전성(R12), Harness 오판(R9), Foundry-X 버전 스큐(R13), 암묵지 유출(R14) |
| 착수 판단 | Conditional (위 5개 조건 충족 시 Ready) |

---

**착수 판단: Conditional**

---

## Gemini 검토의견

**착수 판단:** Conditional
**역할:** 시장/트렌드 관점, 유사 사례
**소요:** 27.6초

## Decode-X: Reverse Engineering 기반 VibeCoding Spec 생성 시스템 개발기획서 PRD 검토 의견

애널리스트로서 Decode-X PRD v1.3을 면밀히 검토했습니다. 본 PRD는 매우 상세하고 깊이 있는 분석을 바탕으로 체계적인 개발 계획을 제시하고 있습니다. 특히 v1.2와 v1.3에서 시장 트렌드와 조직 내 Foundry-X와의 통합 전략을 적극적으로 반영한 점은 매우 인상적입니다.

### 1. 시장 적합성: 이 솔루션이 현재 시장/트렌드와 맞닿아 있나요?

**매우 높은 시장 적합성**을 가지고 있습니다. PRD에서 언급된 AI 기반 코드 생성("Vibe Coding")의 비결정성, 검증 불가능성, 스케일 한계, 지식 손실 문제는 현재 엔터프라이즈 환경에서 AI 도입을 가로막는 핵심적인 장애물입니다. Decode-X는 이러한 문제를 해결하기 위한 Spec 자동 추출 및 검증 시스템으로, 다음과 같은 최신 시장/트렌드와 완벽하게 맞닿아 있습니다.

*   **AI 기반 소프트웨어 개발(AI-Native Development) 전환 가속화**: Copilot Agent Mode, Claude Code, Devin, Kiro 등 AI 에이전트의 발전은 소프트웨어 개발 패러다임을 근본적으로 바꾸고 있습니다. Decode-X는 ManMonth 중심의 SI 프로세스를 AI-Centric으로 전환하겠다는 Mission Pivot(§1.5)을 명확히 제시하며, 이는 업계 전반의 AI-Native 전환 노력과 일치합니다.
*   **Spec-Driven Development(SDD) 및 Contract-First 접근 방식의 부상**: AI의 비결정성을 제어하고 품질을 담보하기 위해 "구조화된 계약(Spec)"의 중요성이 더욱 커지고 있습니다. Decode-X의 3-Layer Spec 컨테이너(§4.3)와 SDD Triangle(Spec↔Code↔Test) 검증은 이러한 트렌드를 주도적으로 반영합니다. GitHub Spec Kit, Amazon Kiro, Tessl 등 유사 움직임이 이를 뒷받침합니다.
*   **레거시 시스템 현대화(Legacy Modernization) 및 지식 자산화**: 수십 년간 축적된 레거시 시스템의 암묵지(Tacit Knowledge)를 AI가 이해하고 활용할 수 있는 형태로 전환하는 것은 디지털 전환의 핵심 과제입니다. Decode-X의 Empty Slot Analysis(§2.5)와 Domain Archeologist 역할은 이 문제를 정면으로 다루며, 이는 IBM watsonx CA for Z, Amazon Q Code Transformation 등 주요 벤더의 전략과 궤를 같이 합니다.
*   **AI 에이전트 오케스트레이션 및 신뢰성 확보**: LangGraph, CrewAI, AutoGen 등 멀티 에이전트 시스템이 복잡한 작업을 수행하는 데 활용되면서, 에이전트의 행동을 제어하고 신뢰성을 확보하는 "하네스(Harness)", "가드레일(Guardrail)", "Stop Rules"의 중요성이 부각되고 있습니다. Decode-X의 VibeCoding Automation Harness(§4.5)는 이러한 요구사항을 충족합니다.
*   **Git-Native 및 코드형 인프라(X-as-Code) 트렌드**: 모든 것을 코드로 관리하고 Git을 Single Source of Truth로 활용하는 GitOps 철학은 개발 및 운영 전반으로 확산되고 있습니다. Decode-X의 Spec을 Git 기반으로 관리하고 Foundry-X와의 통합에 Git을 핵심 매개체로 활용하는 전략은 이 트렌드와 부합합니다.

#### 유사한 서비스나 제품이 있다면 어떤 차별점이 필요한가요?

PRD에 이미 다양한 유사 서비스 및 학술 연구가 언급되어 있어, 차별점은 주로 **구현의 깊이와 통합 전략**에 달려 있다고 판단됩니다.

1.  **AI Foundry OS / Foundry-X와의 긴밀한 통합**: 가장 큰 차별점이자 강점입니다. KT DS AXBD 내부에서 개발 중인 Foundry-X와의 역할 분담(Decode-X = Input Plane Producer, Foundry-X = Process/Output Plane Orchestrator)을 명확히 하고, Git, SPEC.md, Plumb `decisions.jsonl`, `shared/kg.ts` Ontology를 공통 매개체로 활용하는 전략은 외부 경쟁사들이 쉽게 모방하기 어려운 **강력한 수직 통합 경쟁 우위**를 제공합니다. 이는 Foundry-X의 PoC/MVP 3일 목표 달성을 위한 핵심 전제 조건(양질의 Input Spec)을 제공함으로써 시너지를 극대화할 것입니다.
2.  **레거시 암묵지 추출 및 Empty Slot Filling의 체계화**: AutoSpec, SpecGen 등 학술 연구는 Technical Spec 추출에 강점을 가지지만, Decode-X는 여기에 더해 §2.5의 Core Service 식별, Input Completeness Score, Empty Slot 분류 체계 및 발굴 파이프라인을 통해 **비즈니스적 가치가 높은 암묵지(Tacit Knowledge)를 체계적으로 Spec화**하는 데 집중합니다. 이는 단순히 코드를 복제하는 것을 넘어 "AI-Centric 체질 전환"이라는 Mission Pivot의 핵심 동력입니다.
3.  **검증 가능성(Verifiability)과 재현성(Reproducibility)에 대한 집착**: CPG, SCIP 기반의 양방향 트레이서빌리티, Daikon 동적 불변식, Csmith/DART/Dual Run 패턴의 Differential Testing, SWE-bench Verified 스타일의 Harness는 AI 생성 코드의 가장 큰 약점인 비결정성을 제어하고 "검증 가능한 Spec"을 만드는 데 초점을 맞춥니다. 특히 **"Spec ↔ Code ↔ Test 3자 Gap이 90% 이상 매칭될 때만 합격"** 이라는 기준은 매우 높은 품질 기준을 제시합니다.
4.  **3-Layer Spec 컨테이너 및 Policy-as-Code**: "기계 실행 가능 계층 + 기계 검증 가능 계층 + 사람 리뷰 가능 계층"으로 Spec을 재설계하고 EARS, Policy-as-Code를 적극 도입한 것은 AI 에이전트와 인간 리뷰어 모두에게 최적화된 Spec 포맷을 제공하려는 노력입니다. 이는 GitHub Spec Kit, Amazon Kiro, Anthropic Skills의 장점을 통합한 형태입니다.

### 2. 사실 확인: PRD에 포함된 가정이나 수치 중 검증이 필요한 것들은?

대부분의 수치는 KPI 목표치이거나 추정치로, 개발 과정에서 지속적인 검증이 필요합니다. 다만, 몇 가지 가정과 수치에 대해 추가적인 검증 또는 명확화가 필요합니다.

*   **§2.2 정량적 목표(KPI)**:
    *   **Reviewer Efficiency (≤ 2분/조항)**: 이 목표는 매우 공격적입니다. 복잡한 비즈니스 규칙이나 암묵지 관련 Spec의 경우, CPG 노드 하이라이트 등의 UX 개선만으로 2분 내 리뷰가 가능할지는 실제 SME 인터뷰와 사용성 테스트를 통해 검증이 필요합니다. 특히 DA 역할의 인센티브와 연계되므로, 현실적인 목표 설정이 중요합니다.
    *   **AI-Ready PassRate ≥ 75%**: 현재 프로토타입 23.6%에서 75%로의 상승은 매우 큰 폭입니다. Phase 1/2에서 이 목표 달성 가능성을 면밀히 추적하고, 달성 실패 시 Spec 추출 방법론 또는 AI-Ready 기준 자체에 대한 재검토가 필요할 수 있습니다.
    *   **Empty Slot Fill Rate ≥ 70%**: 암묵지 추출의 난이도를 고려할 때, 70%라는 목표는 높지만, DA 역할의 전문성과 인센티브 설계(§E-3)를 통해 달성 가능성을 높이고 있습니다. 구체적인 Empty Slot 발굴 파이프라인(§2.5.5)이 잘 정의되어 있으나, 초기 몇 건의 성공 사례가 전체 도메인으로 확장될 수 있는지 검증이 필요합니다.
*   **§4.5.8 Harness KPI (Mean Cost per PASS ≤ $5)**: LLM 토큰 비용은 모델, 입력 크기, 호출 횟수에 따라 크게 달라집니다. $5라는 목표는 현재의 LLM 비용 추세로는 매우 낙관적일 수 있습니다. 특히 복잡한 레거시 시스템의 Spec을 추출하고 여러 번의 Code Gen 시도(maxAttempts=5)를 거칠 경우, 비용이 급증할 가능성이 있습니다. Phase 0/1에서 실제 비용 데이터를 축적하여 재검증이 필요합니다. 캐싱, 프라이빗 모델 혼용, 프롬프트 최적화 등의 비용 절감 전략이 필수적입니다.
*   **§7 리스크 R15 (Mission Pivot 오해 → "레거시 대충 만들어도 된다" 해석)**: 이 리스크는 매우 현실적입니다. "Tier-A는 95%/70%/Fill 기준을 강화한 것임을 명시"한다고 했지만, 현업 담당자들에게 새로운 Mission Pivot의 의미를 명확히 전달하고 설득하는 커뮤니케이션 전략이 매우 중요합니다. 1-page 요약 배포 외에 워크숍, Q&A 세션 등 적극적인 소통이 필요합니다.
*   **§12.4 Migration Plan (총 M0~M3 = 20주)**: 프로토타입의 현재 Technical Spec 점수 4.3%, AI-Ready passRate 23.6%에서 Option C 권장안으로의 마이그레이션이 20주 내에 완료될 수 있을지는 공격적인 일정입니다. 특히 P0(Critical) Gap 4개를 포함한 다수의 Gap을 동시에 해결해야 합니다. Phase 0/1에서 마이그레이션 일정의 현실성을 면밀히 검토하고, 필요시 MVP 범위 또는 일정을 조정할 유연성이 필요합니다.
*   **§E-3 HITL Quality Gate**: "LLM 초안 → Spec 후보" 단계에서 `passRate ≥ 0.75`를 기준으로 LA 검토로 넘기는 것은 좋은 자동화입니다. 그러나 LLM의 환각(hallucination) 위험을 고려할 때, 이 `passRate`가 충분히 신뢰할 만한지, 또는 초반에는 LA가 더 많은 부분을 검토해야 하는지 초기 검증이 필요합니다.

### 3. 사용자 관점: 목표 사용자가 실제로 이 솔루션을 받아들일 것 같나요? 도입 장벽이 있다면?

부록 C의 사용자 페르소나 및 이해관계자 매트릭스가 추가되면서 사용자 관점 분석이 크게 강화되었습니다. 제시된 페르소나들은 이 솔루션의 핵심 가치를 명확히 인지하고 받아들일 가능성이 높다고 판단됩니다.

*   **Legacy Analyst (LA)**: "단순 반복 작업 자동화, 판단/검증에 집중"이라는 가치는 LA에게 매우 매력적입니다. 기존의 고되고 시간 소모적인 역공학 작업을 덜어주어 역할 승격 효과를 줄 수 있습니다.
*   **Domain Archeologist (DA)**: 암묵지 보존 및 지식 자산화, 인센티브 제공은 DA의 참여를 유도하는 강력한 동기입니다. 특히 인터뷰 부담 완화(Tacit Interview Agent)는 긍정적인 요소입니다.
*   **Vibe Coding Operator (VCO)**: AI 생성 코드의 비결정성 통제와 높은 재현성은 VCO의 핵심 요구사항입니다. Foundry-X와의 통합으로 단일 워크플로우를 제공하는 점도 긍정적입니다.
*   **Spec Reviewer (SR)**: "2분 내 판정 가능"이라는 목표와 CPG/SCIP 기반의 트레이서빌리티는 리뷰 부담을 획기적으로 줄여줄 수 있습니다.

**도입 장벽**:

1.  **초기 학습 곡선 및 신뢰 구축**: CPG, SCIP, EARS, Smithy 등 새로운 개념과 도구 스택이 많습니다. 특히 LA와 DA가 이러한 도구의 산출물을 이해하고 신뢰하기까지 상당한 학습과 온보딩 기간이 필요할 수 있습니다. 초기에는 AI가 생성한 Spec에 대한 불신이 존재할 수 있습니다.
    *   **대응**: 초기 워크숍, 상세한 온보딩 가이드, 성공 사례 공유를 통해 학습 곡선을 완화하고 신뢰를 구축해야 합니다. Reviewer UI의 직관성과 XAI(Explainable AI) 기능이 중요합니다.
2.  **레거시 시스템의 복잡성 및 이질성**: PRD에서 이미 "최초 입력 자료는 100% Working·무결점 서비스가 아님을 전제"한다고 언급했지만, 실제 레거시 시스템은 예상보다 훨씬 복잡하고 이질적인 기술 스택(예: 특정 벤더 프레임워크, 레거시 DB 스키마, 수십 년간 누적된 핫픽스)을 가질 수 있습니다. Joern/CPG의 프론트엔드 지원 범위, Daikon의 동적 불변식 추출 한계 등이 드러날 수 있습니다.
    *   **대응**: 단계별 실행 계획(Phase 1 PoC → Phase 2 파일럿 → Phase 3 도메인 확장)을 통해 점진적으로 적용하고, tree-sitter/ANTLR 폴백, 커스텀 노드 타입 확장(R2) 등 유연한 대응 전략을 수립해야 합니다.
3.  **조직 문화적 저항**: "ManMonth-기반 SI → AI-Centric 체질 전환"이라는 Mission Pivot은 조직의 기존 업무 방식과 역할에 큰 변화를 요구합니다. 특히 "AI가 분석·기획·설계·개발·테스트·운영의 주체"라는 선언은 일부 직원들에게는 위협으로 느껴질 수 있습니다.
    *   **대응**: §1.5의 Mission Re-definition과 §2.5의 Tier 체계를 명확히 전달하여 "AI가 사람의 일을 대체하는 것이 아니라, 사람의 역할을 고도화하고 생산성을 높인다"는 메시지를 지속적으로 강조해야 합니다. 성공적인 내부 파일럿 사례를 통해 가치를 증명하고, 역할 재조정 및 재교육 프로그램을 병행해야 합니다.
4.  **보안 및 규제 준수 우려**: 금융/공공 도메인의 경우, 코드 및 산출물에 대한 보안 및 규제 준수 요구사항이 매우 엄격합니다. LLM에 민감한 레거시 코드를 입력하는 것에 대한 우려, 암묵지 유출(R14) 문제 등이 제기될 수 있습니다.
    *   **대응**: §E-2 보안 정책(PII 마스킹, 입력 데이터 분류, 폐쇄망 운영, LLM Provider 관리)을 철저히 준수하고, 법무/CISO와의 긴밀한 협력을 통해 사전 승인을 확보해야 합니다. `Domain Archeologist` 세션의 NDA 및 녹취 Retention 정책은 필수적입니다.

### 4. 누락된 시장 관점: 시장/경쟁/트렌드 측면에서 고려되지 않은 것은?

PRD는 매우 포괄적인 시장 및 트렌드 분석을 포함하고 있지만, 다음과 같은 몇 가지 관점을 추가로 고려하면 더욱 강건해질 수 있습니다.

1.  **데이터 거버넌스 및 온톨로지 표준화의 중요성**: PRD에서는 `shared/kg.ts`를 SSOT로 활용한다고 언급했지만, 엔터프라이즈 환경에서 다양한 시스템과 데이터 소스를 통합하고, Spec에서 추출된 용어와 개념을 표준화된 온톨로지(예: FIBO for finance)와 연계하는 것은 장기적인 AI-Centric 전환의 핵심입니다. Decode-X가 추출하는 Term, Actor, Document 등의 Node Type(§4.4)이 Foundry-X의 전체 데이터 거버넌스 전략 내에서 어떻게 위치하고, 외부 표준과 어떻게 연동될지에 대한 그림이 더 명확하면 좋습니다.
    *   **대응**: `shared/kg.ts` Ontology를 확장하여 도메인별 표준 온톨로지(예: 금융 도메인의 경우 FIBO 등)와의 매핑 전략을 포함하고, Spec 추출 시 용어 표준화를 위한 메커니즘을 강화합니다.
2.  **AI 윤리 및 책임 있는 AI(Responsible AI) 프레임워크**: AI가 Spec을 생성하고 코드를 재현하는 과정에서 발생할 수 있는 편향(Bias), 불공정성, 투명성 부족 등의 문제에 대한 고려가 필요합니다. 특히 레거시 시스템에 내재된 편향이 Spec으로 추출되고 AI 생성 코드에 재현될 수 있습니다.
    *   **대응**: AI-Ready 6기준에 "Fairness" 또는 "Ethics"와 같은 추가 기준을 포함하는 것을 고려합니다. Spec Reviewer(SR)에게 AI 윤리 관련 가이드라인을 제공하고, AI 생성 Spec 및 코드의 XAI(Explainable AI) 기능을 강화하여 결정 과정을 추적할 수 있도록 합니다. `techdebt/*.yaml`에 윤리 관련 취약점을 기록하는 필드를 추가할 수도 있습니다.
3.  **멀티모달 입력 및 에이전트 간 협업의 진화**: 현재 PRD는 주로 코드, 문서, 운영 로그를 입력으로 가정합니다. 하지만 AI 개발 트렌드는 화이트보드 스케치, 디자인 목업, 음성 회의록 등 다양한 형태의 멀티모달 입력을 통해 Spec을 생성하는 방향으로 진화하고 있습니다. 또한, 에이전트 간의 더욱 복잡하고 자율적인 협업 모델(예: Devin과 같은 Autonomous Agents)이 등장하고 있습니다.
    *   **대응**: Phase 3 이후 검토 항목으로 멀티모달 입력을 명시하고(§부록 D.4), 장기적으로는 Decode-X Harness가 Foundry-X의 6-Agent 시스템과 더욱 긴밀하게 협력하여 자율적인 Spec 생성 및 검증을 수행할 수 있도록 로드맵을 확장합니다.
4.  **오픈소스 커뮤니티 기여 및 생태계 확장 전략**: Decode-X의 CPG, SCIP, EARS, LangGraph 등 많은 구성 요소가 오픈소스 기반입니다. 프로젝트 자체의 핵심 로직을 오픈소스화하거나, 관련 오픈소스 프로젝트에 기여함으로써 생태계를 확장하고 인지도를 높일 수 있는 기회가 있을 수 있습니다.
    *   **대응**: Phase 4 GTM 준비 단계에서 오픈소스 기여 또는 자체 프로젝트의 오픈소스화 가능성을 검토합니다. (예: Spec Schema, EARS Parser, CPG 쿼리 유틸리티 등)

### 5. 착수 판단: Conditional

PRD는 매우 상세하고 치밀하게 작성되었으며, 시장 적합성, 기술 스택, 통합 전략 모두 훌륭합니다. 특히 v1.3에서 사용자/이해관계자, MVP 정의, Kick-off 조건, 운영/보안/HITL 정책을 구체화한 점은 매우 긍정적입니다.

그러나 **몇 가지 Critical한 선결 조건**이 충족되어야 Phase 1 착수가 가능하다고 판단됩니다.

**Conditional Reason**:

1.  **Mission Pivot에 대한 조직 전반의 이해와 합의**: §1.5의 "100% 등가 Copy Machine 프레임 폐기, AI-Centric 체질 전환"이라는 Mission Pivot은 매우 중요하지만, 현업에서 "레거시를 대충 만들어도 된다"는 오해(R15)를 불러일으킬 수 있습니다. 이 부분에 대한 **KT DS AXBD 조직 차원의 강력한 리더십과 지속적인 커뮤니케이션**이 선행되어야 합니다. §10-9 의사결정 포인트와 §부록 D.3 Phase 0 Kick-off 조건에 명시된 "Mission Pivot 승인"은 단순한 승인을 넘어 **조직 전반의 이해와 공감대 형성**을 의미합니다.
2.  **Foundry-X와의 통합 MoU 체결 및 Plumb E2E 연동 검증**: Decode-X의 가장 큰 강점이 Foundry-X와의 통합에 있기 때문에, §10-10 의사결정 포인트와 §부록 D.3 Phase 0 Kick-off 조건에 명시된 "Foundry-X 역할 분담 확정" 및 "Foundry-X Plumb E2E 1건 녹색" 달성은 Decode-X의 존재 이유를 증명하는 핵심 선결 조건입니다. **두 팀 간의 MoU 체결과 기술적 연동이 Phase 0 내에 확실히 완료**되어야 합니다.
3.  **Domain Archeologist(DA) 역할의 확보 및 온보딩**: Empty Slot Fill Rate(§2.2)는 Decode-X의 핵심 KPI이자 차별점입니다. 이를 달성하기 위한 Domain Archeologist(DA)의 역할이 매우 중요하며, §부록 D.3에 명시된 "Domain Archeologist 1 FTE 확보"가 Phase 0 내에 완료되고, DA가 제 역할을 수행할 수 있도록 **초기 온보딩 및 인센티브 설계(§E-3)가 즉시 가동**되어야 합니다.
4.  **LLM 비용 관리 전략의 현실성 재검토**: 현재의 LLM 비용 추정치($5/PASS)는 다소 낙관적일 수 있으며, Phase 0 내에 "LLM 예산 승인" 및 "프라이빗 모델 폴백 옵션 1종 PoC 준비"가 완료되어 **비용 리스크(R1)에 대한 구체적인 대응책이 마련**되어야 합니다.

위 4가지 조건이 **Phase 0 내에 성공적으로 충족되고 검증**된다면, PRD에 제시된 Phase 1 이후의 계획은 매우 견고하고 실행 가능하다고 판단됩니다.

**착수 판단: Conditional**

---

## DeepSeek 검토의견

**착수 판단:** Conditional
**역할:** 기술적 실현 가능성, 아키텍처 리뷰
**소요:** 43.1초

### 기술 검토 의견

#### 1. 기술적 실현 가능성
- **긍정적 요소**:
  - CPG(Code Property Graph) 기반 정적 분석과 LLM의 결합은 학술적으로 검증된 접근 방식(AutoSpec, SpecGen)으로 타당함
  - Differential Testing(Google Dual Run 패턴)과 Daikon 동적 불변식은 검증 가능성 확보에 적합
  - 3-Layer Spec 컨테이너 설계는 기계 실행성과 인간 가독성의 균형을 잘 잡음

- **우려사항**:
  - **CPG의 언어 지원 한계**: JSP/MyBatis XML 등 레거시 스택에서 Joern의 적용성이 미검증(R2 리스크)
  - **LLM 비용 폭증**: Spec 생성 과정에서의 반복적 LLM 호출로 예산 초과 가능성(R1). 특히 대규모 엔터프라이즈 코드베이스에서
  - **동적 불변식 추출의 신뢰도**: Daikon이 복잡한 비즈니스 로직에서 의미 있는 Invariant를 추출할 수 있을지 미지수

#### 2. 아키텍처 적합성
- **강점**:
  - Foundry-X와의 역할 분담(Input/Process Plane)은 관심사 분리 원칙에 부합
  - LangGraph 기반 상태기계는 하네스 오케스트레이션에 적합한 선택
  - Git + SPEC.md SSOT의 단일 인터페이스는 버전 관리와 협업에 유리

- **개선점**:
  - **트레이서빌리티 과도한 설계**: SCIP + CPG 양방향 바인딩이 모든 조항에 필요할 만큼 ROI가 높은지 재검토 필요
  - **컨테이너 포맷의 복잡성**: OpenAPI/Smithy/AsyncAPI/JSON Schema 다중 포맷 유지보수 부담. Smithy의 실용성 검증 필요
  - **KG(Knowledge Graph) 운영 리스크**: shared/kg.ts의 스키마 변경이 Decode-X와 Foundry-X에 동시 영향을 줄 수 있음

#### 3. 구현 복잡도
- **저평가된 복잡성**:
  - **Empty Slot 채움 자동화**: E1~E5 유형의 암묵지 추출이 HITL에만 의존할 경우 확장성 한계. Semi-automated 추출 파이프라인 필요
  - **Plumb 동기화 엔진**: Foundry-X의 decisions.jsonl과 실시간 연동 시 버전 불일치 가능성(R13)
  - **비결정성 통제**: Temperature=0 설정만으로 생성 결과의 일관성을 보장하기 어려움. 더 강력한 결정성 메커니즘(예: 코드 템플릿 제약) 필요

#### 4. 기술 리스크
- **최상위 리스크 3가지**:
  1. **R12(입력 불완전성)**: 레거시 자산의 불완전함을 Copy Machine으로 재생산할 위험. Core Service 식별 실패 시 프로젝트 근본적 실패
  2. **R9(Harness 보안)**: Tier-3 명령어 실행으로 인한 프로덕션 사고 가능성. 샌드박스 격리 미흡 시 치명적
  3. **R4(비결정성)**: 동일 Spec으로 생성된 Working Site 간 변동성이 KPI(재생산성 ≥90%) 달성을 방해할 수 있음

#### 5. 착수 판단
**착수 판단: Conditional**

- **전제 조건**:
  1. Phase 0에서 CPG의 Java/Spring + Node/TS 파일럿 검증 완료(R2 해소)
  2. Foundry-X Plumb 엔진과의 E2E 연동 PoC 성공(R13 해소)
  3. Empty Slot 채움을 위한 Domain Archeologist 1FTE 확보(부록 E-3 충족)

- **추가 권고사항**:
  - **MVP 범위 축소**: Phase 1에서 Tier-A 핵심 서비스만 대상으로 축소 실행(부록 D-1 참조)
  - **LLM Fallback 전략**: 프라이빗 모델(Qwen/Llama) 오프라인 배포 옵션 필수 확보(R6 대응)
  - **Drift 감지 간소화**: 초기에는 Spectral + PactFlow 2-Layer로 시작, oasdiff는 Phase 3로 연기

이 조건들이 충족될 경우, 제안된 아키텍처는 혁신성과 실용성 사이에서 균형 잡힌 설계로 평가됩니다. 특히 Foundry-X와의 역할 분담은 조직 차원의 시너지를 창출할 잠재력이 큽니다.

---

## 품질 메트릭

| 메트릭 | 값 |
|--------|-----|
| 검토 AI | 3/3 성공 |
| 총 토큰 | 113,154 |
| 착수 판단 파싱 | 3/3 성공 (100%) |
| 응답 잘림 | 0건 |
| 모델 Fallback | 1건 |
| 재시도 | 0건 |
| 전체 소요 | 43.1초 |
| 완료 시각 | 16시 48분 40초 |