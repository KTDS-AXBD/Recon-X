import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PackagePlus } from 'lucide-react';

interface ExportFormProps {
  onSubmit: (description: string) => void;
  creating?: boolean;
}

export function ExportForm({ onSubmit, creating }: ExportFormProps) {
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    onSubmit(description);
    setDescription('');
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Spec 패키지 생성</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
            Description (optional)
          </label>
          <textarea
            className="w-full border rounded-lg p-3 text-sm"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface, #fff)', color: 'var(--text-primary)' }}
            rows={3}
            placeholder="패키지 설명을 입력하세요..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <Button onClick={handleSubmit} disabled={creating} className="gap-2">
          <PackagePlus className="w-4 h-4" />
          {creating ? '생성 중...' : 'Spec 패키지 생성'}
        </Button>
      </CardContent>
    </Card>
  );
}
