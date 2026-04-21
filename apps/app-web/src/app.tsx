import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { OrganizationProvider } from "./contexts/OrganizationContext";
import { Toaster } from "./components/ui/sonner";
import { Layout } from "./components/Layout";
// F374: Feature Flag — ?legacy=1 시 기존 대시보드 라우트 유지, 기본은 Executive View (S220 활성화)
import { isLegacyMode } from "./lib/feature-flag";

// === S220 Executive View (F375, F376, F378) ===
const ExecutiveOverviewPage = lazy(() => import("./pages/executive/overview"));
const EvidencePage = lazy(() => import("./pages/executive/evidence"));

// === Legacy / Preserved pages ===
const DashboardPage = lazy(() => import("./pages/dashboard"));
const LoginPage = lazy(() => import("./pages/login"));
const WelcomePage = lazy(() => import("./pages/welcome")); // F372
const UploadPage = lazy(() => import("./pages/upload"));
const HITLReviewPage = lazy(() => import("./pages/hitl"));
const OntologyPage = lazy(() => import("./pages/ontology"));
const SkillCatalogPage = lazy(() => import("./pages/skill-catalog"));
const SkillDetailPage = lazy(() => import("./pages/skill-detail"));
const ApiConsolePage = lazy(() => import("./pages/api-console"));
// F378: analysis-report, org-spec, poc-report → /executive/evidence 허브로 이관
// 기존 경로는 redirect 유지 (북마크/링크 보호)
const AnalysisReportPage = lazy(() => import("./pages/analysis-report"));
const GuidePage = lazy(() => import("./pages/guide"));
const SettingsPage = lazy(() => import("./pages/settings"));
const SourceUploadPage = lazy(() => import("./pages/source-upload"));
const FactCheckPage = lazy(() => import("./pages/fact-check"));
const GapAnalysisPage = lazy(() => import("./pages/gap-analysis"));
const SpecCatalogPage = lazy(() => import("./pages/spec-catalog"));
const SpecDetailPage = lazy(() => import("./pages/spec-detail"));
const ExportCenterPage = lazy(() => import("./pages/export-center"));
const MockupPage = lazy(() => import("./pages/mockup"));
const PocReportPage = lazy(() => import("./pages/poc-report"));
const OrgSpecPage = lazy(() => import("./pages/org-spec"));
const NotFoundPage = lazy(() => import("./pages/not-found"));
// F379/F380: Engineer Workbench (S221 / Sprint 226)
const EngineerWorkbenchPage = lazy(() => import("./pages/engineer/workbench"));
// F382/F387: Admin 기본
const AdminPage = lazy(() => import("./pages/admin"));
// F377: 5 Archive 페이지 제거됨 — analysis, benchmark, poc-ai-ready, poc-ai-ready-detail, poc-phase-2-report
// 구 경로는 /executive/overview redirect 처리 (404 방지)

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">로딩 중...</p>
      </div>
    </div>
  );
}

// F370 + F389: CF Access 인증 기반 ProtectedRoute
// isLoading 중에는 스피너 표시 — CF JWT 확인 완료 전에 /welcome 리다이렉트 방지
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingFallback />;
  if (!isAuthenticated) {
    return <Navigate to="/welcome" replace />;
  }
  return <>{children}</>;
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

// F374: Feature Flag 실 분기 활성화 (S220)
// ?legacy=1: 기존 대시보드 루트 / 기본: Executive Overview 루트
function AppRoutes() {
  const legacy = isLegacyMode();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Root: F374 분기 — legacy=1이면 기존 dashboard, 기본은 executive/overview */}
      <Route
        path="/"
        element={
          legacy ? (
            <P><DashboardPage /></P>
          ) : (
            <Navigate to="/executive/overview" replace />
          )
        }
      />

      {/* === Executive View (F375, F376, F378) === */}
      <Route path="/executive/overview" element={<P><ExecutiveOverviewPage /></P>} />
      <Route path="/executive/evidence" element={<P><EvidencePage /></P>} />

      {/* === Engineer routes (S221 — placeholders for now) === */}
      {/* F379 Split View, F380 Provenance Inspector는 S221(Sprint 225)에서 구현 */}

      {/* === Preserved functional pages === */}
      <Route path="/upload" element={<P><UploadPage /></P>} />
      <Route path="/source-upload" element={<P><SourceUploadPage /></P>} />
      <Route path="/hitl" element={<P><HITLReviewPage /></P>} />
      <Route path="/ontology" element={<P><OntologyPage /></P>} />
      <Route path="/skills" element={<P><SkillCatalogPage /></P>} />
      <Route path="/skills/:id" element={<P><SkillDetailPage /></P>} />
      <Route path="/api-console" element={<P><ApiConsolePage /></P>} />
      <Route path="/guide" element={<P><GuidePage /></P>} />
      <Route path="/fact-check" element={<P><FactCheckPage /></P>} />
      <Route path="/gap-analysis" element={<P><GapAnalysisPage /></P>} />
      <Route path="/specs" element={<P><SpecCatalogPage /></P>} />
      <Route path="/specs/:id" element={<P><SpecDetailPage /></P>} />
      <Route path="/export" element={<P><ExportCenterPage /></P>} />
      <Route path="/mockup" element={<P><MockupPage /></P>} />
      <Route path="/settings" element={<P><SettingsPage /></P>} />

      {/* F379/F380: Engineer Workbench */}
      <Route path="/engineer/workbench" element={<P><EngineerWorkbenchPage /></P>} />
      <Route path="/engineer/workbench/:id" element={<P><EngineerWorkbenchPage /></P>} />

      {/* F382/F387: Admin */}
      <Route path="/admin" element={<P><AdminPage /></P>} />

      {/* F378: 기존 evidence 페이지 경로 → /executive/evidence redirect (북마크 보호) */}
      <Route path="/analysis-report" element={<P><AnalysisReportPage /></P>} />
      <Route path="/org-spec" element={<P><OrgSpecPage /></P>} />
      <Route path="/poc-report" element={<P><PocReportPage /></P>} />

      {/* F377: Archive된 경로 → /executive/overview redirect (404 방지) */}
      <Route path="/analysis" element={<Navigate to="/executive/overview" replace />} />
      <Route path="/benchmark" element={<Navigate to="/executive/overview" replace />} />
      <Route path="/poc/ai-ready" element={<Navigate to="/executive/overview" replace />} />
      <Route path="/poc/ai-ready/:skillId" element={<Navigate to="/executive/overview" replace />} />
      <Route path="/poc-phase-2" element={<Navigate to="/executive/overview" replace />} />
      {/* legacy dashboard still accessible when ?legacy=1 */}
      <Route path="/dashboard" element={<P><DashboardPage /></P>} />

      <Route path="*" element={<P><NotFoundPage /></P>} />
    </Routes>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OrganizationProvider>
          <Toaster />
          <BrowserRouter>
            <Suspense fallback={<LoadingFallback />}>
              <AppRoutes />
            </Suspense>
          </BrowserRouter>
        </OrganizationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
