import { useState, useEffect } from 'react';
import { MainLayout } from '../components/layout';
import { Card } from '../components/ui';
import { 
  Droplets, 
  Fuel, 
  Container, 
  Package, 
  ClipboardSignature,
  TrendingUp
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { logisticsRequestsApi } from '../lib/api';
import { Navigate } from 'react-router-dom';

import { BotellonesInventory } from '../components/logistics/BotellonesInventory';
import { CombustibleInventory } from '../components/logistics/CombustibleInventory';
import { VacuumInventory } from '../components/logistics/VacuumInventory';
import { MaterialesInventory } from '../components/logistics/MaterialesInventory';
import { LogisticsReports } from '../components/logistics/LogisticsReports';
import { RequestsManagement } from '../components/logistics/RequestsManagement';

type LogisticsTab = 'botellones' | 'combustible' | 'materiales' | 'vacuum' | 'solicitudes' | 'reportes';

export default function LogisticsPage() {
  const { user, sessionToken, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<LogisticsTab>('botellones');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (sessionToken) loadPendingCount();
  }, [sessionToken]);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const loadPendingCount = async () => {
    if (!sessionToken) return;
    try {
      const count = await logisticsRequestsApi.getPendingCount(sessionToken);
      setPendingCount(count);
    } catch (error) { console.error('Error loading pending count:', error); }
  };

  const tabs = [
    { id: 'botellones' as LogisticsTab, label: 'Botellones', icon: Droplets },
    { id: 'combustible' as LogisticsTab, label: 'Combustible', icon: Fuel },
    { id: 'materiales' as LogisticsTab, label: 'Materiales', icon: Package },
    { id: 'vacuum' as LogisticsTab, label: 'Vacuum', icon: Container },
    { id: 'solicitudes' as LogisticsTab, label: 'Solicitudes', icon: ClipboardSignature, badge: pendingCount },
    { id: 'reportes' as LogisticsTab, label: 'Reportes', icon: TrendingUp },
  ];

  return (
    <MainLayout title="Logística" subtitle="Gestión de inventario y solicitudes">
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
          {activeTab === 'botellones' && <BotellonesInventory onUpdate={loadPendingCount} />}
          {activeTab === 'combustible' && <CombustibleInventory onUpdate={loadPendingCount} />}
          {activeTab === 'materiales' && <MaterialesInventory onUpdate={loadPendingCount} />}
          {activeTab === 'vacuum' && <VacuumInventory onUpdate={loadPendingCount} />}
          {activeTab === 'solicitudes' && <RequestsManagement onUpdate={loadPendingCount} />}
          {activeTab === 'reportes' && <LogisticsReports />}
        </div>
      </Card>
    </MainLayout>
  );
}
