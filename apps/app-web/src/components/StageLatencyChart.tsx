import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface LatencyData {
  avgMs: number;
  minMs: number;
  maxMs: number;
  samples: number;
}

interface Props {
  data: Record<string, LatencyData>;
}

const STAGE_LABELS: Record<string, string> = {
  ingestion: 'Stage 1: 문서 수집',
  extraction: 'Stage 2: 구조 추출',
  policy: 'Stage 3: 정책 추론',
  ontology: 'Stage 4: 온톨로지',
  skill: 'Stage 5: Skill 패키징',
};

const STAGE_ORDER = ['ingestion', 'extraction', 'policy', 'ontology', 'skill'];

export const StageLatencyChart: React.FC<Props> = ({ data }) => {
  const maxAvg = Math.max(
    ...Object.values(data).map((d) => d.avgMs),
    1,
  );

  return (
    <Card style={{ borderRadius: 'var(--radius-lg)' }}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4" style={{ color: 'var(--primary)' }} />
          Stage 소요시간 (ms)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {STAGE_ORDER.map((stage) => {
          const stageData = data[stage];
          if (!stageData) {
            return (
              <div key={stage} className="space-y-1">
                <div
                  className="flex justify-between text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span>{STAGE_LABELS[stage] ?? stage}</span>
                  <span>-</span>
                </div>
                <div
                  className="h-4 rounded"
                  style={{ backgroundColor: 'var(--border)' }}
                />
              </div>
            );
          }
          const widthPct = Math.max((stageData.avgMs / maxAvg) * 100, 4);
          return (
            <div key={stage} className="space-y-1">
              <div
                className="flex justify-between text-xs"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span>{STAGE_LABELS[stage] ?? stage}</span>
                <span>
                  {stageData.avgMs.toLocaleString()}ms (n={stageData.samples})
                </span>
              </div>
              <div
                className="h-4 rounded"
                style={{ backgroundColor: 'var(--border)' }}
              >
                <div
                  className="h-full rounded"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: 'var(--primary)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
