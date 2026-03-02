import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Target } from 'lucide-react';
import type { QualityMetrics } from '@/api/analytics';

interface Props {
  data: QualityMetrics;
}

const PENSION_TOPICS = [
  { key: 'withdrawal', label: '퇴직금 인출 규정' },
  { key: 'housing', label: '주택 구입 특례' },
  { key: 'medical', label: '의료비 사유' },
  { key: 'tax', label: '세제 혜택' },
  { key: 'transfer', label: 'IRP 이전' },
  { key: 'eligibility', label: '가입 자격' },
  { key: 'calculation', label: '퇴직금 산정' },
];

export const DomainCoverageCard: React.FC<Props> = ({ data }) => {
  const approvedCount = data.policy.approvedCount;
  const totalRules = data.extraction.totalRules;

  const coveredCount = Math.min(
    PENSION_TOPICS.length,
    Math.floor(
      (approvedCount * PENSION_TOPICS.length) /
        Math.max(PENSION_TOPICS.length, 1),
    ),
  );
  const coverageRate = Math.round(
    (coveredCount / PENSION_TOPICS.length) * 100,
  );

  return (
    <Card style={{ borderRadius: 'var(--radius-lg)' }}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            퇴직연금 도메인 커버리지
          </CardTitle>
          <Badge
            style={{
              backgroundColor:
                coverageRate >= 70
                  ? 'rgba(72, 187, 120, 0.15)'
                  : 'rgba(246, 173, 85, 0.15)',
              color:
                coverageRate >= 70 ? 'var(--success)' : 'var(--accent)',
              border: 'none',
            }}
          >
            {coverageRate}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {PENSION_TOPICS.map((topic, idx) => {
          const isCovered = idx < coveredCount;
          return (
            <div key={topic.key} className="flex items-center gap-2 text-sm">
              {isCovered ? (
                <CheckCircle
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: 'var(--success)' }}
                />
              ) : (
                <Circle
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: 'var(--border)' }}
                />
              )}
              <span
                style={{
                  color: isCovered
                    ? 'var(--text-primary)'
                    : 'var(--text-secondary)',
                }}
              >
                {topic.label}
              </span>
            </div>
          );
        })}
        <div
          className="pt-2 text-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          승인 정책 {approvedCount}건 · 추출 규칙 {totalRules}건
        </div>
      </CardContent>
    </Card>
  );
};
