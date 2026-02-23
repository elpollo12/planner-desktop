import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { MainLayout } from '../components/layout';
import { Card } from '../components/ui';
import { reportsApi } from '../lib/api';

interface DashboardStats {
  total: number;
  drafts: number;
  submitted: number;
  approved: number;
  rejected: number;
}

export default function Dashboard() {
  const { user, isAuthenticated, sessionToken } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    drafts: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (sessionToken) {
      loadStats();
    }
  }, [sessionToken]);

  const loadStats = async () => {
    if (!sessionToken) return;

    setLoading(true);
    try {
      // Load all reports for the user (no filters, large page size to get all)
      const response = await reportsApi.list(sessionToken, {}, 1, 1000);

      // Calculate statistics from the reports array
      const newStats: DashboardStats = {
        total: response.reports.length,
        drafts: response.reports.filter(r => r.status === 'draft').length,
        submitted: response.reports.filter(r => r.status === 'submitted').length,
        approved: response.reports.filter(r => r.status === 'approved').length,
        rejected: response.reports.filter(r => r.status === 'rejected').length,
      };

      setStats(newStats);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <MainLayout
      title="Dashboard"
      subtitle={`Bienvenido, ${user.fullName}`}
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Reportes Totales', value: stats.total, color: 'bg-blue-500', href: '/reports' },
          { label: 'Borradores', value: stats.drafts, color: 'bg-yellow-500', href: '/reports' },
          { label: 'Pendientes', value: stats.submitted, color: 'bg-purple-500', href: (user.role === 'supervisor' || user.role === 'admin') ? '/approvals' : '/reports' },
          { label: 'Aprobados', value: stats.approved, color: 'bg-green-500', href: '/reports' },
        ].map((stat) => (
          <div key={stat.label} onClick={() => navigate(stat.href)} className="cursor-pointer hover:shadow-md transition-shadow rounded-lg">
            <Card className="p-0! overflow-hidden">
              <div className={`h-2 ${stat.color}`} />
              <div className="p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {loading ? '...' : stat.value}
                </p>
              </div>
            </Card>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <Card title="Acciones Rápidas">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/reports/new')}
            className="p-6 border-2 border-dashed cursor-pointer border-gray-300 dark:border-gray-600 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition text-left"
            style={{ ['--hover-border' as string]: 'var(--color-primary-500)' }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-primary-500)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = ''}
          >
            <div className="text-2xl mb-2">📝</div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Nuevo Reporte</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Crear un nuevo DDR</p>
          </button>

          <button
            onClick={() => navigate('/reports')}
            className="p-6 border-2 border-dashed cursor-pointer border-gray-300 dark:border-gray-600 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition text-left"
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-primary-500)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = ''}
          >
            <div className="text-2xl mb-2">📊</div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Ver Reportes</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Consultar reportes existentes</p>
          </button>

          {(user.role === 'supervisor' || user.role === 'admin') && (
            <button
              onClick={() => navigate('/approvals')}
              className="p-6 border-2 border-dashed cursor-pointer border-gray-300 dark:border-gray-600 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition text-left"
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-primary-500)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = ''}
            >
              <div className="text-2xl mb-2">✅</div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Aprobaciones</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {stats.submitted > 0 ? `${stats.submitted} pendiente${stats.submitted !== 1 ? 's' : ''}` : 'Revisar reportes enviados'}
              </p>
            </button>
          )}

          {user.role === 'admin' && (
            <button
              onClick={() => navigate('/admin/')}
              className="p-6 border-2 border-dashed cursor-pointer border-gray-300 dark:border-gray-600 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition text-left"
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-primary-500)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = ''}
            >
              <div className="text-2xl mb-2">👥</div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Usuarios</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Gestionar usuarios del sistema</p>
            </button>
          )}

          <button
            onClick={() => navigate('/incidents')}
            className="p-6 border-2 border-dashed cursor-pointer border-gray-300 dark:border-gray-600 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition text-left"
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-primary-500)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = ''}
          >
            <div className="text-2xl mb-2">⚠️</div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Incidencias</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Registrar y consultar incidencias</p>
          </button>
        </div>
      </Card>

      {/* Recent Activity */}
      <Card title="Actividad Reciente" className="mt-6">
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="text-sm">No hay actividad reciente</p>
        </div>
      </Card>
    </MainLayout>
  );
}
