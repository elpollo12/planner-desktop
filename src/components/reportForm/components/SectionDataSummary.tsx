import { Card } from '../../ui';
import { CheckCircle2 } from 'lucide-react';
import { TABS } from '../config/reportFormConfig';
import type { TabId } from '../../../types';

interface SectionsDataSummaryProps {
  sectionsWithData: TabId[];
}

export function SectionDataSummary({ sectionsWithData }: SectionsDataSummaryProps) {
  if (sectionsWithData.length === 0) return null;

  return (
    <Card className="bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="text-green-600" size={20} />
          <h3 className="font-semibold text-green-900 dark:text-green-100">
            {sectionsWithData.length} Sección{sectionsWithData.length > 1 ? 'es' : ''} con Datos
          </h3>
        </div>
        <p className="text-sm text-green-800 dark:text-green-200">
          Al guardar, se registrarán: <strong>
            {sectionsWithData.map(id => TABS.find(t => t.id === id)?.label).join(', ')}
          </strong>
        </p>
      </div>
    </Card>
  );
}