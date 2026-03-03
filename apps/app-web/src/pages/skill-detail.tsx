import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Download,
  FileJson,
  Code2,
  Globe,
  Star,
  Shield,
  Tag,
  Calendar,
  User,
  Hash,
  BookOpen,
  ClipboardCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchSkill, downloadSkill, fetchSkillMcp, fetchSkillOpenApi } from '@/api/skill';
import type { SkillDetail, McpAdapter } from '@/api/skill';
import { useOrganization } from '@/contexts/OrganizationContext';

const TRUST_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  unreviewed: { label: '미검토', color: '#9CA3AF', bg: 'rgba(156, 163, 175, 0.1)' },
  reviewed: { label: '검토됨', color: 'var(--accent)', bg: 'rgba(246, 173, 85, 0.15)' },
  validated: { label: '검증됨', color: 'var(--success)', bg: 'rgba(56, 161, 105, 0.1)' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: '초안', color: '#9CA3AF', bg: 'rgba(156, 163, 175, 0.1)' },
  published: { label: '발행됨', color: 'var(--success)', bg: 'rgba(56, 161, 105, 0.1)' },
  archived: { label: '보관됨', color: 'var(--accent)', bg: 'rgba(246, 173, 85, 0.15)' },
};

export default function SkillDetailPage() {
  const { organizationId } = useOrganization();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [skill, setSkill] = useState<SkillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [mcpAdapter, setMcpAdapter] = useState<McpAdapter | null>(null);
  const [openApiSpec, setOpenApiSpec] = useState<unknown>(null);
  const [showMcp, setShowMcp] = useState(false);
  const [showOpenApi, setShowOpenApi] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    void fetchSkill(organizationId, id)
      .then((res) => {
        if (res.success) {
          setSkill(res.data);
        } else {
          toast.error('Skill을 불러올 수 없습니다');
        }
      })
      .catch(() => toast.error('Skill 조회 실패'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownload = async () => {
    if (!id) return;
    try {
      const blob = await downloadSkill(organizationId, id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${id}.skill.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('다운로드 완료');
    } catch {
      toast.error('다운로드 실패');
    }
  };

  const handleViewMcp = async () => {
    if (!id) return;
    if (mcpAdapter) {
      setShowMcp(!showMcp);
      return;
    }
    try {
      const adapter = await fetchSkillMcp(organizationId, id);
      setMcpAdapter(adapter);
      setShowMcp(true);
    } catch {
      toast.error('MCP 어댑터 조회 실패');
    }
  };

  const handleViewOpenApi = async () => {
    if (!id) return;
    if (openApiSpec !== null) {
      setShowOpenApi(!showOpenApi);
      return;
    }
    try {
      const spec = await fetchSkillOpenApi(organizationId, id);
      setOpenApiSpec(spec);
      setShowOpenApi(true);
    } catch {
      toast.error('OpenAPI 스펙 조회 실패');
    }
  };

  const trustConfig = useMemo(() => {
    if (!skill) return TRUST_CONFIG['unreviewed']!;
    return TRUST_CONFIG[skill.trust.level] ?? TRUST_CONFIG['unreviewed']!;
  }, [skill]);

  const statusConfig = useMemo(() => {
    if (!skill) return STATUS_CONFIG['draft']!;
    return STATUS_CONFIG[skill.status] ?? STATUS_CONFIG['draft']!;
  }, [skill]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Skill 정보 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!skill) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/skills')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Skill 카탈로그로 돌아가기
        </Button>
        <Card>
          <CardContent className="p-16 text-center">
            <p style={{ color: 'var(--text-secondary)' }}>Skill을 찾을 수 없습니다</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const trustPercent = Math.round(skill.trust.score * 100);

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <Button variant="ghost" onClick={() => navigate('/skills')}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Skill 카탈로그
      </Button>

      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between w-full">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <code
                  className="text-sm px-3 py-1 rounded font-mono"
                  style={{ backgroundColor: 'var(--surface)', color: 'var(--primary)' }}
                >
                  {skill.skillId}
                </code>
                <Badge style={{ backgroundColor: trustConfig.bg, color: trustConfig.color, border: 'none' }}>
                  <Shield className="w-3 h-3" />
                  {trustConfig.label}
                </Badge>
                <Badge style={{ backgroundColor: statusConfig.bg, color: statusConfig.color, border: 'none' }}>
                  {statusConfig.label}
                </Badge>
                <Badge variant="outline">v{skill.metadata.version}</Badge>
              </div>
              <CardTitle className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {skill.metadata.domain}
                {skill.metadata.subdomain ? ` / ${skill.metadata.subdomain}` : ''}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {skill.metadata.author}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {new Date(skill.metadata.createdAt).toLocaleDateString('ko-KR')}
            </span>
            <span className="flex items-center gap-1.5">
              <Globe className="w-4 h-4" />
              {skill.metadata.language}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Trust Score */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>신뢰도 Trust Score</span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl font-bold" style={{ color: 'var(--primary)' }}>{trustPercent}%</span>
              <Badge style={{ backgroundColor: trustConfig.bg, color: trustConfig.color, border: 'none' }} className="text-xs">
                {trustConfig.label}
              </Badge>
            </div>
            <Progress value={trustPercent} className="h-2" />
          </CardContent>
        </Card>

        {/* Policy Count */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4" style={{ color: '#9333EA' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>정책 수 Policies</span>
            </div>
            <span className="text-3xl font-bold" style={{ color: '#9333EA' }}>{skill.policyCount}</span>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>condition-criteria-outcome triples</p>
          </CardContent>
        </Card>

        {/* Ontology Reference */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Hash className="w-4 h-4" style={{ color: 'var(--success)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>온톨로지 Ontology</span>
            </div>
            <code
              className="text-sm px-2 py-1 rounded font-mono break-all"
              style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
            >
              {skill.ontologyId || 'N/A'}
            </code>
          </CardContent>
        </Card>
      </div>

      {/* Tags */}
      {skill.metadata.tags.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>태그 Tags</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {skill.metadata.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-sm">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metadata Detail */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>상세 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>생성일</span>
              <p style={{ color: 'var(--text-primary)' }}>
                {new Date(skill.metadata.createdAt).toLocaleString('ko-KR')}
              </p>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>수정일</span>
              <p style={{ color: 'var(--text-primary)' }}>
                {new Date(skill.metadata.updatedAt).toLocaleString('ko-KR')}
              </p>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>R2 저장 경로</span>
              <code className="text-xs block mt-0.5 font-mono" style={{ color: 'var(--text-primary)' }}>
                {skill.r2Key}
              </code>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>상태</span>
              <p style={{ color: 'var(--text-primary)' }}>{statusConfig.label} ({skill.status})</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => void handleDownload()}>
          <Download className="w-4 h-4 mr-2" /> .skill.json 다운로드
        </Button>
        <Button variant="outline" onClick={() => void handleViewMcp()}>
          <Code2 className="w-4 h-4 mr-2" /> {showMcp ? 'MCP 어댑터 숨기기' : 'MCP 어댑터 보기'}
        </Button>
        <Button variant="outline" onClick={() => void handleViewOpenApi()}>
          <FileJson className="w-4 h-4 mr-2" /> {showOpenApi ? 'OpenAPI 스펙 숨기기' : 'OpenAPI 스펙 보기'}
        </Button>
        <Button variant="secondary" disabled>
          <ClipboardCheck className="w-4 h-4 mr-2" /> 평가하기 (준비 중)
        </Button>
      </div>

      {/* MCP Adapter Viewer */}
      {showMcp && mcpAdapter && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">MCP 어댑터</CardTitle>
          </CardHeader>
          <CardContent>
            <pre
              className="text-xs p-4 rounded overflow-auto max-h-96 font-mono"
              style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
            >
              {JSON.stringify(mcpAdapter, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* OpenAPI Spec Viewer */}
      {showOpenApi && openApiSpec !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">OpenAPI 스펙</CardTitle>
          </CardHeader>
          <CardContent>
            <pre
              className="text-xs p-4 rounded overflow-auto max-h-96 font-mono"
              style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
            >
              {JSON.stringify(openApiSpec, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
