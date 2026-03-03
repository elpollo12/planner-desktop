import { useState, useEffect } from 'react';
import { MainLayout } from '../components/layout';
import { Card } from '../components/ui';
import { Users, Bookmark, BarChart3, Activity, MapPin, Palette, Cloud, Building2, Download } from 'lucide-react';
import { OilRigIcon } from '../components/ui/icons/OilRigIcon';
import { useAuthStore } from '../store/authStore';
import { UsersManagement } from '../components/admin/UsersManagement';
import { OperationCodesManagement } from '../components/admin/OperationCodesManagement';
import { Statistics } from '../components/admin/Statistics';
import AreasManagement from '../components/admin/AreasManagement';
import RigsManagement from '../components/admin/RigsManagement';
import AppearanceSettings from '../components/admin/AppearanceSettings';
import SyncSettings from '../components/admin/SyncSettings';
import OperatorsManagement from '../components/admin/OperatorsManagement';
import UpdatesSettings from '../components/admin/UpdatesSettings';
import { usersApi, areasApi, rigsApi, reportsApi } from '../lib/api';

type AdminTab = 'users' | 'codes' | 'stats' | 'areas' | 'rigs' | 'operators' | 'appearance' | 'sync' | 'updates';

interface AdminStats {
  totalUsers: number;
  activeAreas: number;
  activeRigs: number;
  activityToday: number;
}

export default function AdminPanel() {
  const { sessionToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeAreas: 0,
    activeRigs: 0,
    activityToday: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (sessionToken) {
      loadAdminStats();
    }
  }, [sessionToken]);

  const loadAdminStats = async () => {
    if (!sessionToken) return;

    setLoadingStats(true);
    try {
      // Load all data in parallel
      const [users, areas, rigs, reportsResponse] = await Promise.all([
        usersApi.list(sessionToken),
        areasApi.list(true), // include inactive to count all
        rigsApi.list(true), // include inactive to count all
        reportsApi.list(sessionToken, {
          dateFrom: new Date().toISOString().split('T')[0],
          dateTo: new Date().toISOString().split('T')[0],
        }, 1, 1000),
      ]);

      setStats({
        totalUsers: users.length,
        activeAreas: areas.filter(a => a.active).length,
        activeRigs: rigs.filter(r => r.active).length,
        activityToday: reportsResponse.reports.length,
      });
    } catch (error) {
      console.error('Error loading admin stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const tabs = [
    { id: 'users' as AdminTab, label: 'Usuarios', icon: Users },
    { id: 'areas' as AdminTab, label: 'Áreas', icon: MapPin },
    { id: 'rigs' as AdminTab, label: 'Taladros', icon: OilRigIcon },
    { id: 'operators' as AdminTab, label: 'Operadores', icon: Building2 },
    { id: 'codes' as AdminTab, label: 'Códigos de Operación', icon: Bookmark },
    { id: 'stats' as AdminTab, label: 'Estadísticas', icon: BarChart3 },
    { id: 'appearance' as AdminTab, label: 'Apariencia', icon: Palette },
    { id: 'sync' as AdminTab, label: 'Sincronización', icon: Cloud },
    { id: 'updates' as AdminTab, label: 'Actualizaciones', icon: Download },
  ];

  return (
    <MainLayout
      title="Panel de Administración"
      subtitle="Gestión del sistema"
    >
      {activeTab !== 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Usuarios</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {loadingStats ? '...' : stats.totalUsers}
                </p>
              </div>
              <Users className="text-blue-500" size={32} />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Áreas Activas</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {loadingStats ? '...' : stats.activeAreas}
                </p>
              </div>
              <MapPin className="text-green-500" size={32} />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Taladros Activos</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {loadingStats ? '...' : stats.activeRigs}
                </p>
              </div>
              <OilRigIcon className="text-orange-500" size={32} />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Reportes Creados Hoy</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {loadingStats ? '...' : stats.activityToday}
                </p>
              </div>
              <Activity className="text-purple-500" size={32} />
            </div>
          </Card>
        </div>
      )}
      <div className="space-y-6">
        {/* Tabs */}
        <Card>
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                      ${
                        activeTab === tab.id
                          ? ''
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                      }
                    `}
                    style={activeTab === tab.id ? {
                      color: 'var(--color-primary-500)',
                      borderBottomColor: 'var(--color-primary-500)',
                    } : undefined}
                  >
                    <Icon size={18} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'users' && <UsersManagement />}
            {activeTab === 'areas' && <AreasManagement />}
            {activeTab === 'rigs' && <RigsManagement />}
            {activeTab === 'operators' && <OperatorsManagement />}
            {activeTab === 'codes' && <OperationCodesManagement />}
            {activeTab === 'stats' && <Statistics />}
            {activeTab === 'appearance' && <AppearanceSettings />}
            {activeTab === 'sync' && <SyncSettings />}
            {activeTab === 'updates' && <UpdatesSettings />}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
