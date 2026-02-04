import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { MainLayout } from '../components/layout';
import { Card } from '../components/ui';

export default function Dashboard() {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!user) return null;

  const stats = [
    { label: 'Reportes Totales', value: '0', color: 'bg-blue-500' },
    { label: 'Borradores', value: '0', color: 'bg-yellow-500' },
    { label: 'Enviados', value: '0', color: 'bg-purple-500' },
    { label: 'Aprobados', value: '0', color: 'bg-green-500' },
  ];

  return (
    <MainLayout
      title="Dashboard"
      subtitle={`Bienvenido, ${user.full_name}`}
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label} className="!p-0 overflow-hidden">
            <div className={`h-2 ${stat.color}`} />
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card title="Acciones Rápidas">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/reports/new')}
            className="p-6 border-2 border-dashed cursor-pointer border-gray-300 rounded-lg hover:border-[#1E3A5F] hover:bg-blue-50 transition text-left"
          >
            <div className="text-2xl mb-2">📝</div>
            <h3 className="font-semibold text-gray-900 mb-1">Nuevo Reporte</h3>
            <p className="text-sm text-gray-600">Crear un nuevo DDR</p>
          </button>

          <button
            onClick={() => navigate('/reports')}
            className="p-6 border-2 border-dashed cursor-pointer border-gray-300 rounded-lg hover:border-[#1E3A5F] hover:bg-blue-50 transition text-left"
          >
            <div className="text-2xl mb-2">📊</div>
            <h3 className="font-semibold text-gray-900 mb-1">Ver Reportes</h3>
            <p className="text-sm text-gray-600">Consultar reportes existentes</p>
          </button>

          {user.role === 'admin' && (
            <button
              onClick={() => navigate('/admin/')}
              className="p-6 border-2 border-dashed cursor-pointer border-gray-300 rounded-lg hover:border-[#1E3A5F] hover:bg-blue-50 transition text-left"
            >
              <div className="text-2xl mb-2">👥</div>
              <h3 className="font-semibold text-gray-900 mb-1">Usuarios</h3>
              <p className="text-sm text-gray-600">Gestionar usuarios del sistema</p>
            </button>
          )}
        </div>
      </Card>

      {/* Recent Activity */}
      <Card title="Actividad Reciente" className="mt-6">
        <div className="text-center py-12 text-gray-500">
          <p className="text-sm">No hay actividad reciente</p>
        </div>
      </Card>
    </MainLayout>
  );
}
