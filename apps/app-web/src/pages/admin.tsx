import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersManager } from "@/components/admin/UsersManager";
import { AuditLog } from "@/components/admin/AuditLog";
import { buildHeaders } from "@/api/headers";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

interface HealthStatus {
  status: string;
  service: string;
  environment: string;
  timestamp: string;
}

interface UsageStats {
  totalSkills: number;
  totalPolicies: number;
  byTrustLevel: Record<string, number>;
  byDomain: Record<string, number>;
}

function HealthTab() {
  const { organizationId } = useOrganization();
  const [health, setHealth] = useState<Record<string, HealthStatus | { error: string }>>({});

  const SERVICES = [
    { name: "svc-ingestion", path: "/api/ingestion/health" },
    { name: "svc-extraction", path: "/api/extraction/health" },
    { name: "svc-policy", path: "/api/policy/health" },
    { name: "svc-skill", path: "/api/skills/health" },
    { name: "svc-mcp-server", path: "/api/mcp/health" },
  ] as const;

  useEffect(() => {
    void Promise.all(
      SERVICES.map(async (svc) => {
        try {
          const res = await fetch(svc.path, { headers: buildHeaders({ organizationId }) });
          const data = await res.json() as HealthStatus;
          return [svc.name, data] as const;
        } catch (e) {
          return [svc.name, { error: String(e) }] as const;
        }
      }),
    ).then((results) => {
      setHealth(Object.fromEntries(results));
    });
  }, [organizationId]);

  return (
    <div className="space-y-3">
      {SERVICES.map((svc) => {
        const h = health[svc.name];
        const isOk = h && !("error" in h) && (h as HealthStatus).status === "ok";
        return (
          <div key={svc.name} className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              {isOk ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <XCircle className="w-4 h-4 text-destructive" />
              )}
              <span className="font-mono text-sm">{svc.name}</span>
            </div>
            <Badge variant={isOk ? "secondary" : "destructive"}>
              {h ? (isOk ? "OK" : "ERROR") : "확인 중..."}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

function UsageTab() {
  const { organizationId } = useOrganization();
  const [stats, setStats] = useState<UsageStats | null>(null);

  useEffect(() => {
    void fetch("/api/skills/stats", { headers: buildHeaders({ organizationId }) })
      .then((r) => r.json())
      .then((data) => setStats(data as UsageStats))
      .catch(() => null);
  }, [organizationId]);

  if (!stats) return <p className="text-sm text-muted-foreground py-4">로딩 중...</p>;

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">총 Skill</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{stats.totalSkills.toLocaleString()}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">총 정책</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{stats.totalPolicies.toLocaleString()}</p>
        </CardContent>
      </Card>
      <Card className="col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">신뢰 수준별</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {Object.entries(stats.byTrustLevel).map(([level, cnt]) => (
              <div key={level} className="text-center">
                <p className="text-2xl font-semibold">{cnt}</p>
                <p className="text-xs text-muted-foreground capitalize">{level}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Admin 대시보드</h1>
        <p className="text-sm text-muted-foreground">사용자 관리 · 조직 · 서비스 상태 · 감사 로그 · 사용 현황</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">사용자</TabsTrigger>
          <TabsTrigger value="audit">감사 로그</TabsTrigger>
          <TabsTrigger value="health">서비스 상태</TabsTrigger>
          <TabsTrigger value="usage">사용 현황</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <UsersManager />
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <AuditLog />
        </TabsContent>

        <TabsContent value="health" className="mt-4">
          <HealthTab />
        </TabsContent>

        <TabsContent value="usage" className="mt-4">
          <UsageTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
