import { Card } from '../../ui';
import { TABS } from '../config/reportFormConfig';
import type { TabId } from '../../../types';

// Import form sections
import { CrewSection } from './forms/CrewSection';
import { TimeDistributionSection } from './forms/TimeDistributionSection';
import { BitRecordSection } from './forms/BitRecordSection';
import { MudRecordSection } from './forms/MudRecordSection';
import { LithologySection } from './forms/LithologySection';
import { ObservationsSection } from './forms/ObservationsSection';

interface ActiveSectionContentProps {
  activeTab: TabId;
}

export function ActiveSectionContent({ activeTab }: ActiveSectionContentProps) {
  const renderTabContent = () => {
    switch (activeTab) {
      case 'crew':
        return <CrewSection />;
      case 'time':
        return <TimeDistributionSection />;
      case 'bits':
        return <BitRecordSection />;
      case 'mud':
        return <MudRecordSection />;
      case 'lithology':
        return <LithologySection />;
      case 'observations':
        return <ObservationsSection />;
      case 'drillString':
        return (
          <div className="text-center py-8 text-gray-500">
            Sección de Sarta de Perforación (por implementar)
          </div>
        );
      default:
        return null;
    }
  };

  const activeTabInfo = TABS.find(t => t.id === activeTab);

  return (
    <Card>
      <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{activeTabInfo?.icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {activeTabInfo?.label}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {activeTabInfo?.description}
            </p>
          </div>
        </div>
        <div>
          {/* Puedes agregar indicadores de completación aquí */}
        </div>
      </div>
      <div className="p-6">
        {renderTabContent()}
      </div>
    </Card>
  );
}