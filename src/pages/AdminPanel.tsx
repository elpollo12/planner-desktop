import { useState } from 'react';
import { MainLayout } from '../components/layout';
import { Card } from '../components/ui';
import { Users, Code, BarChart3, Activity } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Navigate } from 'react-router-dom';
import { UsersManagement } from '../components/admin/UsersManagement';
import { OperationCodesManagement } from '../components/admin/OperationCodesManagement';
import { Statistics } from '../components/admin/Statistics';

type AdminTab = 'users' | 'codes' | 'stats';

export default function AdminPanel() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  // Only admins can access
  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const tabs = [
    { id: 'users' as AdminTab, label: 'Usuarios', icon: Users },
    { id: 'codes' as AdminTab, label: 'Códigos de Operación', icon: Code },
    { id: 'stats' as AdminTab, label: 'Estadísticas', icon: BarChart3 },
  ];

  return (
    <MainLayout
      title="Panel de Administración"
      subtitle="Gestión del sistema"
    >
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <p className="text-sm text-gray-600">Códigos Activos</p>
                <p className="text-3xl font-bold text-gray-900">-</p>
              </div>
              <Code className="text-green-500" size={32} />
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

        {/* Tabs */}
        <Card>
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors
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
            {activeTab === 'codes' && <OperationCodesManagement />}
            {activeTab === 'stats' && <Statistics />}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
