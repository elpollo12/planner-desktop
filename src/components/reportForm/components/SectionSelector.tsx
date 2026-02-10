import { Card } from '../../ui';
import { CheckCircle2 } from 'lucide-react';
import { TABS } from '../config/reportFormConfig';
import { SectionSelectorProps } from '../../../types';

export function SectionSelector({
  tabs,
  activeTab,
  onTabSelect,
  getSectionSummary,
  hasSectionData,
}: SectionSelectorProps) {
  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-bold">
            2
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Selecciona una Sección
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Elige el tipo de reporte que deseas completar
            </p>
          </div>
        </div>

        {/* Tabs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const summary = getSectionSummary(tab.id);

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabSelect(tab.id)}
                className={`
                  p-4 rounded-lg border-2 text-left transition-all
                  ${isActive
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{tab.icon}</span>
                  <div className="flex-1">
                    <h3 className={`font-semibold mb-1 ${isActive ? 'text-primary-700 dark:text-primary-400' : 'text-gray-900 dark:text-gray-100'
                      }`}>
                      {tab.label}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      {tab.description}
                    </p>
                    <p className={`text-xs font-medium ${summary !== 'Sin datos'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-500 dark:text-gray-500'
                      }`}>
                      {summary}
                    </p>
                  </div>
                  {isActive && (
                    <CheckCircle2 className="text-primary-500 shrink-0" size={20} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}