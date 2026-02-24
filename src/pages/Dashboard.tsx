import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

const PAGE_SIZE = 3;

interface QuickAction {
  icon: string;
  title: string;
  description: string;
  href: string;
}

function QuickActionsCarousel({ actions }: { actions: QuickAction[] }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(actions.length / PAGE_SIZE);
  const showArrows = actions.length > PAGE_SIZE;

  const visibleActions = actions.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Acciones Rápidas</h3>
      <div className="flex items-center gap-3">
        {showArrows && (
          <button
            type="button"
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
            className="shrink-0 p-2 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400
                       hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-w-0">
          {visibleActions.map((action) => (
            <button
              key={action.href}
              onClick={() => navigate(action.href)}
              className="p-6 border-2 border-dashed cursor-pointer border-gray-300 dark:border-gray-600 rounded-lg
                         hover:bg-primary-50 dark:hover:bg-gray-700 transition text-left"
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-primary-500)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = ''}
            >
              <div className="text-2xl mb-2">{action.icon}</div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{action.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{action.description}</p>
            </button>
          ))}
        </div>
        {showArrows && (
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages - 1}
            className="shrink-0 p-2 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400
                       hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>
    </Card>
  );
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

  const quickActions = useMemo(() => {
    const actions = [
      { icon: '📝', title: 'Nuevo Reporte', description: 'Crear un nuevo DDR', href: '/reports/new' },
      { icon: '📊', title: 'Ver Reportes', description: 'Consultar reportes existentes', href: '/reports' },
      { icon: '⚠️', title: 'Incidencias', description: 'Registrar y consultar incidencias', href: '/incidents' },
    ];

    if (user?.role === 'supervisor' || user?.role === 'admin') {
      actions.push({
        icon: '✅',
        title: 'Aprobaciones',
        description: stats.submitted > 0
          ? `${stats.submitted} pendiente${stats.submitted !== 1 ? 's' : ''}`
          : 'Revisar reportes enviados',
        href: '/approvals',
      });
    }

    if (user?.role === 'admin') {
      actions.push({ icon: '👥', title: 'Usuarios', description: 'Gestionar usuarios del sistema', href: '/admin/' });
    }

    actions.push({ icon: '🚚', title: 'Logística', description: 'Gestión de recursos y materiales', href: '/logistics' });

    return actions;
  }, [user?.role, stats.submitted]);

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

      {/* Quick Actions Carousel */}
      <QuickActionsCarousel actions={quickActions} />
    </MainLayout>
  );
}
