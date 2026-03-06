import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldOff, ChevronDown, Tag, Cpu, Calendar } from 'lucide-react';
import { getVersion } from '@tauri-apps/api/app';
import { useAuthStore } from '../store/authStore';
import { usePermissions } from '../hooks/usePermissions';
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

interface QuickAction {
  icon: string;
  title: string;
  description: string;
  href: string;
}

export default function Dashboard() {
  const { user, isAuthenticated, sessionToken } = useAuthStore();
  const { canAccess } = usePermissions();
  const navigate = useNavigate();
  const [appVersion, setAppVersion] = useState('');
  const [versionOpen, setVersionOpen] = useState(false);
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
    getVersion().then(setAppVersion).catch(() => {});
  }, []);
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (sessionToken && canAccess.reports) {
      loadStats();
    }
  }, [sessionToken, canAccess.reports]);

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
    const actions: QuickAction[] = [];

    if (canAccess.reports) {
      actions.push({ icon: '📝', title: 'Nuevo Reporte', description: 'Crear un nuevo DDR', href: '/reports/new' });
      actions.push({ icon: '📊', title: 'Ver Reportes', description: 'Consultar reportes existentes', href: '/reports' });
    }

    if (canAccess.incidents) {
      actions.push({ icon: '⚠️', title: 'Incidencias', description: 'Registrar y consultar incidencias', href: '/incidents' });
    }

    if (canAccess.approvals) {
      actions.push({
        icon: '✅',
        title: 'Aprobaciones',
        description: stats.submitted > 0
          ? `${stats.submitted} pendiente${stats.submitted !== 1 ? 's' : ''}`
          : 'Revisar reportes enviados',
        href: '/approvals',
      });
    }

    if (canAccess.admin) {
      actions.push({ icon: '👥', title: 'Usuarios', description: 'Gestionar usuarios del sistema', href: '/admin/' });
    }

    if (canAccess.logistics) {
      actions.push({ icon: '🚚', title: 'Logística', description: 'Gestión de recursos y materiales', href: '/logistics' });
    }

    return actions;
  }, [canAccess.reports, canAccess.incidents, canAccess.approvals, canAccess.admin, canAccess.logistics, stats.submitted]);

  if (!user) return null;

  return (
    <MainLayout
      title="Dashboard"
      subtitle={`Bienvenido, ${user.fullName}`}
    >
      {/* Version badge dropdown */}
      {appVersion && (
        <div className="flex justify-end mb-4">
          <div className="relative">
            <button
              onClick={() => setVersionOpen(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                         bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400
                         border border-green-200 dark:border-green-800 rounded-full
                         hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
            >
              <Tag size={11} />
              v{appVersion}
              <ChevronDown size={11} className={`transition-transform ${versionOpen ? 'rotate-180' : ''}`} />
            </button>
            {versionOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200
                              dark:border-gray-700 rounded-lg shadow-lg z-10 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Versión instalada</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">D-Planner v{appVersion}</p>
                </div>
                <div className="px-4 py-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Cpu size={12} />
                  <span>Windows x64</span>
                </div>
                <div className="px-4 py-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
                  <Calendar size={12} />
                  <span>Actualizado correctamente ✓</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Stats Grid — only shown when user has access to reports */}
      {canAccess.reports && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Reportes Totales', value: stats.total, color: 'bg-blue-500', href: '/reports' },
            { label: 'Borradores', value: stats.drafts, color: 'bg-yellow-500', href: '/reports' },
            { label: 'Pendientes', value: stats.submitted, color: 'bg-purple-500', href: canAccess.approvals ? '/approvals' : '/reports' },
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
      )}

      {/* Quick Actions Grid / No permissions message */}
      {quickActions.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
            <ShieldOff size={48} className="text-gray-300 dark:text-gray-600" />
            <div>
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">Sin acceso a módulos</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Actualmente no tienes permisos para acceder a ningún módulo.<br />
                Contacta con un administrador para que te asigne los permisos necesarios.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Acciones Rápidas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <button
                key={action.href}
                onClick={() => navigate(action.href)}
                className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg
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
        </Card>
      )}
    </MainLayout>
  );
}
