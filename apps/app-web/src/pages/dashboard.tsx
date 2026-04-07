import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Upload,
  FileSearch,
  CheckSquare,
  Package,
  ShieldCheck,
  AlertCircle,
  FileText,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { fetchSkills } from '@/api/skill';
import { fetchDocuments } from '@/api/ingestion';
import { fetchPolicies } from '@/api/policy';
import { useOrganization } from '@/contexts/OrganizationContext';

interface SystemStat {
  label: string;
  value: string;
  color: string;
  icon: LucideIcon;
}

export default function DashboardPage() {
  const { organizationId } = useOrganization();
  const [stats, setStats] = useState<SystemStat[]>([
    { label: '등록 문서', value: '—', color: '#3B82F6', icon: FileText },
    { label: '검토 대기', value: '—', color: 'var(--accent)', icon: AlertCircle },
    { label: '활성 Skill', value: '—', color: 'var(--success)', icon: ShieldCheck },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [docsRes, policiesRes, skillsRes] = await Promise.allSettled([
          fetchDocuments(organizationId),
          fetchPolicies(organizationId, { status: 'candidate', limit: 1 }),
          fetchSkills(organizationId, { limit: 1 }),
        ]);

        if (cancelled) return;

        const docCount = docsRes.status === 'fulfilled' && docsRes.value.success
          ? docsRes.value.data.total : 0;
        const candidateCount = policiesRes.status === 'fulfilled' && policiesRes.value.success
          ? policiesRes.value.data.total : 0;
        const skillCount = skillsRes.status === 'fulfilled' && skillsRes.value.success
          ? skillsRes.value.data.total : 0;

        setStats([
          { label: '등록 문서', value: `${docCount}건`, color: '#3B82F6', icon: FileText },
          { label: '검토 대기', value: `${candidateCount}건`, color: 'var(--accent)', icon: AlertCircle },
          { label: '활성 Skill', value: `${skillCount}개`, color: 'var(--success)', icon: ShieldCheck },
        ]);
      } catch {
        // graceful fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadData();
    return () => { cancelled = true; };
  }, [organizationId]);

  const quickActions = [
    { icon: Upload, label: '문서 업로드', path: '/upload', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' },
    { icon: FileSearch, label: '분석 결과', path: '/analysis', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
    { icon: CheckSquare, label: 'HITL 검토', path: '/hitl', color: 'var(--accent)', bg: 'rgba(246, 173, 85, 0.1)' },
    { icon: Package, label: 'Skill 카탈로그', path: '/skills', color: '#9333EA', bg: 'rgba(147, 51, 234, 0.1)' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          대시보드 Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          AI Foundry 플랫폼 통합 관리
        </p>
      </div>

      {/* Guide Banner — shown when 0 documents */}
      {!loading && stats[0]?.value === '0건' && (
        <Link to="/guide">
          <Card
            className="transition-all hover:shadow-lg cursor-pointer"
            style={{
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))',
              border: '1px solid rgba(59, 130, 246, 0.2)',
            }}
          >
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-500/10">
                <BookOpen className="w-6 h-6" style={{ color: '#3B82F6' }} />
              </div>
              <div className="flex-1">
                <div className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  AI Foundry 시작하기
                </div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  문서 업로드부터 AI Skill 생성까지 — 이용 가이드에서 시작하세요
                </div>
              </div>
              <ArrowRight className="w-5 h-5" style={{ color: '#3B82F6' }} />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* System Status */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} style={{ borderRadius: 'var(--radius-lg)' }}>
            <CardContent className="p-6">
              <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{stat.label}</div>
              <div className="text-3xl font-bold" style={{ color: stat.color }}>
                {loading ? '...' : stat.value}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                <stat.icon className="w-4 h-4 inline-block" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card style={{ borderRadius: 'var(--radius-lg)' }}>
        <CardHeader>
          <CardTitle>빠른 실행 Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link key={index} to={action.path}>
                  <Card className="cursor-pointer transition-all hover:shadow-lg" style={{ borderRadius: 'var(--radius-lg)' }}>
                    <CardContent className="p-6 flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: action.bg }}>
                        <Icon className="w-8 h-8" style={{ color: action.color }} />
                      </div>
                      <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{action.label}</div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
