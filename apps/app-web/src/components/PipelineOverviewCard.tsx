import { Card, CardContent } from '@/components/ui/card';
import { FileText, Layers, CheckCircle, Star, BarChart3 } from 'lucide-react';
import type { QualityMetrics } from '@/api/analytics';

interface Props {
  data: QualityMetrics;
}

interface KpiItem {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

export const PipelineOverviewCard: React.FC<Props> = ({ data }) => {
  const kpis: KpiItem[] = [
    {
      label: '총 문서',
      value: String(data.parsing.totalDocuments),
      icon: <FileText className="w-5 h-5" />,
      color: 'var(--primary)',
    },
    {
      label: '평균 청크/문서',
      value: data.parsing.avgChunksPerDoc.toFixed(1),
      icon: <Layers className="w-5 h-5" />,
      color: 'var(--accent)',
    },
    {
      label: '정책 승인율',
      value: `${data.policy.approvalRate}%`,
      icon: <CheckCircle className="w-5 h-5" />,
      color: 'var(--success)',
    },
    {
      label: '평균 신뢰도',
      value: data.policy.avgTrustScore.toFixed(3),
      icon: <Star className="w-5 h-5" />,
      color: 'var(--accent)',
    },
    {
      label: '총 규칙',
      value: String(data.extraction.totalRules),
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'var(--primary)',
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} style={{ borderRadius: 'var(--radius-lg)' }}>
          <CardContent className="pt-4 pb-4 flex flex-col items-center gap-2">
            <div style={{ color: kpi.color }}>{kpi.icon}</div>
            <div
              className="text-2xl font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              {kpi.value}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {kpi.label}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
