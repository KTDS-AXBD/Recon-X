// ─── Raw markdown/code imports (Vite ?raw) ─────────────────────────────────
// Interview & PRD
import interviewLog from '../../../../반제품-스펙/interview-log.md?raw';
import prdFinal from '../../../../반제품-스펙/prd-final.md?raw';

// Spec documents (01~06)
import specBusinessLogic from '../../../../반제품-스펙/pilot-lpon-cancel/01-business-logic.md?raw';
import specDataModel from '../../../../반제품-스펙/pilot-lpon-cancel/02-data-model.md?raw';
import specFunctions from '../../../../반제품-스펙/pilot-lpon-cancel/03-functions.md?raw';
import specArchitecture from '../../../../반제품-스펙/pilot-lpon-cancel/04-architecture.md?raw';
import specApi from '../../../../반제품-스펙/pilot-lpon-cancel/05-api.md?raw';
import specScreens from '../../../../반제품-스펙/pilot-lpon-cancel/06-screens.md?raw';

// Working Version source code (domain + routes + index + db + auth)
import srcIndex from '../../../../반제품-스펙/pilot-lpon-cancel/working-version/src/index.ts?raw';
import srcDb from '../../../../반제품-스펙/pilot-lpon-cancel/working-version/src/db.ts?raw';
import srcAuth from '../../../../반제품-스펙/pilot-lpon-cancel/working-version/src/auth.ts?raw';
import srcDomainCancel from '../../../../반제품-스펙/pilot-lpon-cancel/working-version/src/domain/cancel.ts?raw';
import srcDomainCharging from '../../../../반제품-스펙/pilot-lpon-cancel/working-version/src/domain/charging.ts?raw';
import srcDomainPayment from '../../../../반제품-스펙/pilot-lpon-cancel/working-version/src/domain/payment.ts?raw';
import srcDomainRefund from '../../../../반제품-스펙/pilot-lpon-cancel/working-version/src/domain/refund.ts?raw';
import srcRoutesCancel from '../../../../반제품-스펙/pilot-lpon-cancel/working-version/src/routes/cancel.ts?raw';
import srcRoutesCharging from '../../../../반제품-스펙/pilot-lpon-cancel/working-version/src/routes/charging.ts?raw';
import srcRoutesPayment from '../../../../반제품-스펙/pilot-lpon-cancel/working-version/src/routes/payment.ts?raw';
import srcRoutesRefund from '../../../../반제품-스펙/pilot-lpon-cancel/working-version/src/routes/refund.ts?raw';

// Test files
import testCancel from '../../../../반제품-스펙/pilot-lpon-cancel/working-version/src/__tests__/cancel.test.ts?raw';
import testCharging from '../../../../반제품-스펙/pilot-lpon-cancel/working-version/src/__tests__/charging.test.ts?raw';
import testPayment from '../../../../반제품-스펙/pilot-lpon-cancel/working-version/src/__tests__/payment.test.ts?raw';

// ─── Exports ─────────────────────────────────────────────────────────────────

export const interview = interviewLog;
export const prd = prdFinal;

export const specDocs = [
  { id: 'business-logic', label: '01. 비즈니스 로직', labelEn: 'Business Logic', content: specBusinessLogic },
  { id: 'data-model', label: '02. 데이터 모델', labelEn: 'Data Model', content: specDataModel },
  { id: 'functions', label: '03. 기능 정의', labelEn: 'Functions', content: specFunctions },
  { id: 'architecture', label: '04. 아키텍처', labelEn: 'Architecture', content: specArchitecture },
  { id: 'api', label: '05. API 명세', labelEn: 'API Spec', content: specApi },
  { id: 'screens', label: '06. 화면 설계', labelEn: 'Screen Design', content: specScreens },
] as const;

export interface CodeFile {
  path: string;
  content: string;
  category: 'entry' | 'domain' | 'routes' | 'test';
}

export const codeFiles: CodeFile[] = [
  // Entry
  { path: 'src/index.ts', content: srcIndex, category: 'entry' },
  { path: 'src/db.ts', content: srcDb, category: 'entry' },
  { path: 'src/auth.ts', content: srcAuth, category: 'entry' },
  // Domain
  { path: 'src/domain/cancel.ts', content: srcDomainCancel, category: 'domain' },
  { path: 'src/domain/charging.ts', content: srcDomainCharging, category: 'domain' },
  { path: 'src/domain/payment.ts', content: srcDomainPayment, category: 'domain' },
  { path: 'src/domain/refund.ts', content: srcDomainRefund, category: 'domain' },
  // Routes
  { path: 'src/routes/cancel.ts', content: srcRoutesCancel, category: 'routes' },
  { path: 'src/routes/charging.ts', content: srcRoutesCharging, category: 'routes' },
  { path: 'src/routes/payment.ts', content: srcRoutesPayment, category: 'routes' },
  { path: 'src/routes/refund.ts', content: srcRoutesRefund, category: 'routes' },
  // Tests
  { path: 'src/__tests__/cancel.test.ts', content: testCancel, category: 'test' },
  { path: 'src/__tests__/charging.test.ts', content: testCharging, category: 'test' },
  { path: 'src/__tests__/payment.test.ts', content: testPayment, category: 'test' },
];

export const testResults = {
  totalTests: 24,
  passed: 24,
  failed: 0,
  suites: [
    { name: 'cancel.test.ts', tests: 8, passed: 8 },
    { name: 'charging.test.ts', tests: 8, passed: 8 },
    { name: 'payment.test.ts', tests: 8, passed: 8 },
  ],
} as const;

export const metrics = {
  specDocuments: 6,
  sourceFiles: 14,
  totalLines: 1610,
  testCount: 24,
  testPassRate: 100,
  humanIntervention: 0,
  domain: 'LPON 온누리상품권 결제/취소',
  generatedBy: 'AI Foundry 반제품 생성 엔진',
  pdcaMatchRate: 93,
  businessRules: 42,
  apiEndpoints: 10,
  dbTables: 7,
} as const;
