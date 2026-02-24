import { useState } from 'react';
import { MainLayout } from '../components/layout';
import { Card } from '../components/ui';
import { 
  Droplets, 
  Fuel, 
  Container, 
  Package, 
  ClipboardSignature,
  TrendingUp,
  PackageOpen,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useLogisticsRigs } from '../hooks/useLogisticsRigs';
import { usePendingRequestsCount } from '../hooks/useLogistics';
import { RigSelector } from '../components/logistics/RigSelector';

import { BotellonesInventory } from '../components/logistics/BotellonesInventory';
import { CombustibleInventory } from '../components/logistics/CombustibleInventory';
import { VacuumInventory } from '../components/logistics/VacuumInventory';
import { MaterialesInventory } from '../components/logistics/MaterialesInventory';
import { LogisticsReports } from '../components/logistics/LogisticsReports';
import { RequestsManagement } from '../components/logistics/RequestsManagement';

type LogisticsTab = 'botellones' | 'combustible' | 'materiales' | 'vacuum' | 'solicitudes' | 'reportes';

export default function LogisticsPage() {
  const { user } = useAuthStore();
  const { accessibleRigs, selectedRigId, selectedRigName, loading: rigsLoading, setSelectedRig } = useLogisticsRigs();
  const [activeTab, setActiveTab] = useState<LogisticsTab>('botellones');

  const { data: pendingCount = 0 } = usePendingRequestsCount(selectedRigId ?? '');

  const isOperator = user?.role === 'operator';

  const tabs = [
    { id: 'botellones' as LogisticsTab, label: 'Botellones', icon: Droplets },
    { id: 'combustible' as LogisticsTab, label: 'Combustible', icon: Fuel },
    { id: 'materiales' as LogisticsTab, label: 'Materiales', icon: Package },
    { id: 'vacuum' as LogisticsTab, label: 'Vacuum', icon: Container },
    { id: 'solicitudes' as LogisticsTab, label: 'Solicitudes', icon: ClipboardSignature, badge: pendingCount },
    ...(!isOperator ? [{ id: 'reportes' as LogisticsTab, label: 'Reportes', icon: TrendingUp }] : []),
  ];

  return (
    <MainLayout title="Logística" subtitle="Gestión de inventario y solicitudes">
      {/* Rig Selector — always visible at the top */}
      <div className="mb-4">
        <RigSelector
          rigs={accessibleRigs}
          selectedRigId={selectedRigId}
          selectedRigName={selectedRigName}
          loading={rigsLoading}
          onSelect={setSelectedRig}
        />
      </div>

      {/* Content — only when a rig is selected */}
      {!rigsLoading && !selectedRigId && accessibleRigs.length > 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <PackageOpen size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
              Selecciona un taladro para gestionar la logística
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              Elige un taladro en el selector de arriba para ver su inventario y solicitudes
            </p>
          </div>
        </Card>
      ) : selectedRigId ? (
        <Card>
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                      activeTab === tab.id ? '' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                    }`}
                    style={activeTab === tab.id ? { color: 'var(--color-primary-500)', borderBottomColor: 'var(--color-primary-500)' } : undefined}
                  >
                    <Icon size={18} />
                    {tab.label}
                    {tab.badge ? (
                      <span className="ml-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full text-xs font-medium">{tab.badge}</span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'botellones' && <BotellonesInventory rigId={selectedRigId} />}
            {activeTab === 'combustible' && <CombustibleInventory rigId={selectedRigId} />}
            {activeTab === 'materiales' && <MaterialesInventory rigId={selectedRigId} />}
            {activeTab === 'vacuum' && <VacuumInventory rigId={selectedRigId} />}
            {activeTab === 'solicitudes' && <RequestsManagement rigId={selectedRigId} />}
            {activeTab === 'reportes' && !isOperator && <LogisticsReports rigId={selectedRigId} rigName={selectedRigName} />}
          </div>
        </Card>
      ) : null}
    </MainLayout>
  );
}
