import { useState, useEffect } from 'react';
import { TrustGaugeCard } from '@/components/TrustGaugeCard';
import { PolicyQualityChart } from '@/components/PolicyQualityChart';
import { HitlOperationsCard } from '@/components/HitlOperationsCard';
import { ReasoningEngineCard } from '@/components/ReasoningEngineCard';
import { GoldenTestCard } from '@/components/GoldenTestCard';
import { Loader2 } from 'lucide-react';
import { fetchTrust, type TrustData } from '@/api/governance';

function extractScore(
  data: TrustData,
  targetType: string,
): number | null {
  const bucket = data.byTargetType[targetType];
  if (!bucket) return null;
  let totalCount = 0;
  let weightedSum = 0;
  for (const level of Object.keys(bucket)) {
    const entry = bucket[level];
    if (entry) {
      totalCount += entry.count;
      weightedSum += entry.avgScore * entry.count;
    }
  }
  if (totalCount === 0) return null;
  return Math.round((weightedSum / totalCount) * 100) / 100;
}

export default function TrustDashboardPage() {
  const [trustData, setTrustData] = useState<TrustData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchTrust()
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setTrustData(res.data);
        } else {
          setError(res.error.message);
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        console.error('Failed to fetch trust data', e);
        setError('신뢰도 데이터를 불러올 수 없습니다');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const l1Score = trustData ? extractScore(trustData, 'output') : null;
  const l2Score = trustData ? extractScore(trustData, 'skill') : null;
  const l3Score = trustData ? extractScore(trustData, 'system') : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          신뢰도 & 품질 대시보드 Trust & Quality Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          AI 시스템 신뢰도 모니터링 및 품질 지표 관리
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-secondary)' }} />
        </div>
      )}

      {error && (
        <div className="text-sm text-center py-8" style={{ color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-3 gap-6">
            <TrustGaugeCard level="L1" title="출력 신뢰도" description="개별 AI 추론 결과 품질" score={l1Score ?? 0} />
            <TrustGaugeCard level="L2" title="Skill 신뢰도" description="패키지 수준 검증 결과" score={l2Score ?? 0} />
            <TrustGaugeCard level="L3" title="시스템 신뢰도" description="전체 파이프라인 안정성" score={l3Score ?? 0} />
          </div>

          {/* TODO: PolicyQualityChart, HitlOperationsCard, GoldenTestCard, ReasoningEngineCard
               현재 하위 컴포넌트 자체 mock 데이터 사용. API 연동 시 trustData에서 추출하여 전달 */}
          <div className="grid grid-cols-[60%_40%] gap-6">
            <PolicyQualityChart />
            <HitlOperationsCard />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <ReasoningEngineCard />
            <GoldenTestCard />
          </div>
        </>
      )}
    </div>
  );
}
