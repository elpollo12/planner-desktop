import { useState } from 'react';
import { MainLayout } from '../components/layout';
import { Card } from '../components/ui';
import { Users, BookMarked, BarChart3, Activity, MapPin, Drill } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Navigate } from 'react-router-dom';
import { UsersManagement } from '../components/admin/UsersManagement';
import { OperationCodesManagement } from '../components/admin/OperationCodesManagement';
import { Statistics } from '../components/admin/Statistics';
import AreasManagement from '../components/admin/AreasManagement';
import RigsManagement from '../components/admin/RigsManagement';

type AdminTab = 'users' | 'codes' | 'stats' | 'areas' | 'rigs';

export default function AdminPanel() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  // Only admins can access
  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const tabs = [
    { id: 'users' as AdminTab, label: 'Usuarios', icon: Users },
    { id: 'areas' as AdminTab, label: 'Áreas', icon: MapPin },
    { id: 'rigs' as AdminTab, label: 'Taladros', icon: Drill },
    { id: 'codes' as AdminTab, label: 'Códigos de Operación', icon: BookMarked },
    { id: 'stats' as AdminTab, label: 'Estadísticas', icon: BarChart3 },
  ];

  return (
    <MainLayout
      title="Panel de Administración"
      subtitle="Gestión del sistema"
    >
      {activeTab !== 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Usuarios</p>
                <p className="text-3xl font-bold text-gray-900">-</p>
              </div>
              <Users className="text-blue-500" size={32} />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Áreas Activas</p>
                <p className="text-3xl font-bold text-gray-900">-</p>
              </div>
              <MapPin className="text-green-500" size={32} />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taladros Activos</p>
                <p className="text-3xl font-bold text-gray-900">-</p>
              </div>
              <Drill className="text-orange-500" size={32} />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Actividad Hoy</p>
                <p className="text-3xl font-bold text-gray-900">-</p>
              </div>
              <Activity className="text-purple-500" size={32} />
            </div>
          </Card>
        </div> 
      )}
      <div className="space-y-6">
        {/* Tabs */}
        <Card>
          <div className="border-b border-gray-200">
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
                          ? 'border-[#1E3A5F] text-[#1E3A5F]'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
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
            {activeTab === 'codes' && <OperationCodesManagement />}
            {activeTab === 'stats' && <Statistics />}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
