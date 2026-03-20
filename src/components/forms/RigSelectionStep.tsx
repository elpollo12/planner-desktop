import { useTranslation } from 'react-i18next';
import { Card, Button } from '../ui';
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { RigWithArea } from '../../types/rig';

interface RigSelectionStepProps {
  accessibleRigs: RigWithArea[];
  selectedRigId: string;
  isLoadingRigs: boolean;
  isLoadingSnapshot: boolean;
  onSelectRig: (rigId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RigSelectionStep({
  accessibleRigs,
  selectedRigId,
  isLoadingRigs,
  isLoadingSnapshot,
  onSelectRig,
  onConfirm,
  onCancel,
}: RigSelectionStepProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold">
            1
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('reports.rigStep.title')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('reports.rigStep.description')}
            </p>
          </div>
        </div>

        {isLoadingRigs ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        ) : accessibleRigs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              {t('reports.rigStep.noRigs')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accessibleRigs.map((rig) => (
              <button
                key={rig.id}
                type="button"
                onClick={() => onSelectRig(rig.id)}
                className={`
                  p-4 rounded-lg border-2 text-left transition-all
                  ${selectedRigId === rig.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:cursor-pointer'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🛢️</span>
                  <div className="flex-1">
                    <h3 className={`font-semibold ${selectedRigId === rig.id ? 'text-primary-700 dark:text-primary-400' : 'text-gray-900 dark:text-gray-100'}`}>
                      {rig.name}
                    </h3>
                    {rig.areaName && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {rig.areaName}
                      </p>
                    )}
                  </div>
                  {selectedRigId === rig.id && (
                    <CheckCircle2 className="text-primary-500 shrink-0" size={20} />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Continue button */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            type="button"
            onClick={onCancel}
            icon={<ChevronLeft size={16} />}
          >
            {t('actions.cancel')}
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={onConfirm}
            disabled={!selectedRigId || isLoadingSnapshot}
            loading={isLoadingSnapshot}
            icon={<ChevronRight size={20} />}
            iconPosition="right"
          >
            {t('actions.next')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
