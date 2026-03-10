import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { user, isAuthenticated, sessionToken } = useAuthStore();
  const { canAccess } = usePermissions();
  const navigate = useNavigate();
  const [appVersion, setAppVersion] = useState('');
  const [versionOpen, setVersionOpen] = useState(false);
  const versionRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0, drafts: 0, submitted: 0, approved: 0, rejected: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => {});
  }, []);

  // Cerrar el dropdown al hacer click fuera
  useEffect(() => {
    if (!versionOpen) return;
    const handler = (e: MouseEvent) => {
      if (versionRef.current && !versionRef.current.contains(e.target as Node)) {
        setVersionOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [versionOpen]);

  useEffect(() => {
    if (sessionToken && canAccess.reports) loadStats();
  }, [sessionToken, canAccess.reports]);

  const loadStats = async () => {
    if (!sessionToken) return;
    setLoading(true);
    try {
      const response = await reportsApi.list(sessionToken, {}, 1, 1000);
      setStats({
        total: response.reports.length,
        drafts: response.reports.filter(r => r.status === 'draft').length,
        submitted: response.reports.filter(r => r.status === 'submitted').length,
        approved: response.reports.filter(r => r.status === 'approved').length,
        rejected: response.reports.filter(r => r.status === 'rejected').length,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = useMemo(() => {
    const actions: QuickAction[] = [];
    if (canAccess.reports) {
      actions.push({ icon: '📝', title: t('dashboard.newReport'), description: t('dashboard.newReportDesc'), href: '/reports/new' });
      actions.push({ icon: '📊', title: t('dashboard.viewReports'), description: t('dashboard.viewReportsDesc'), href: '/reports' });
    }
    if (canAccess.incidents) {
      actions.push({ icon: '⚠️', title: t('dashboard.incidents'), description: t('dashboard.incidentsDesc'), href: '/incidents' });
    }
    if (canAccess.approvals) {
      actions.push({
        icon: '✅', title: t('dashboard.approvals'),
        description: stats.submitted > 0 ? t('dashboard.approvalsDescPending', { count: stats.submitted }) : t('dashboard.approvalsDescEmpty'),
        href: '/approvals',
      });
    }
    if (canAccess.admin) {
      actions.push({ icon: '👥', title: t('dashboard.users'), description: t('dashboard.usersDesc'), href: '/admin/' });
    }
    if (canAccess.logistics) {
      actions.push({ icon: '🚚', title: t('dashboard.logistics'), description: t('dashboard.logisticsDesc'), href: '/logistics' });
    }
    return actions;
  }, [canAccess.reports, canAccess.incidents, canAccess.approvals, canAccess.admin, canAccess.logistics, stats.submitted]);

  if (!user) return null;

  return (
    <MainLayout title="Dashboard" subtitle={t('dashboard.welcome', { name: user.fullName })}>
      {/* Version badge dropdown */}
      {appVersion && (
        <div className="flex justify-end mb-4">
          <div className="relative" ref={versionRef}>
            <button
              onClick={() => setVersionOpen(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-full hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
            >
              <Tag size={11} />
              v{appVersion}
              <ChevronDown size={11} className={`transition-transform ${versionOpen ? 'rotate-180' : ''}`} />
            </button>
            {versionOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('dashboard.versionInstalled')}</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">D-Planner v{appVersion}</p>
                </div>
                <div className="px-4 py-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Cpu size={12} /><span>Windows x64</span>
                </div>
                <div className="px-4 py-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
                  <Calendar size={12} /><span>{t('dashboard.updatedOk')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      {canAccess.reports && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: t('dashboard.totalReports'), value: stats.total, color: 'bg-blue-500', href: '/reports' },
            { label: t('dashboard.drafts'), value: stats.drafts, color: 'bg-yellow-500', href: '/reports' },
            { label: t('dashboard.pending'), value: stats.submitted, color: 'bg-purple-500', href: canAccess.approvals ? '/approvals' : '/reports' },
            { label: t('dashboard.approved'), value: stats.approved, color: 'bg-green-500', href: '/reports' },
          ].map((stat) => (
            <div key={stat.label} onClick={() => navigate(stat.href)} className="cursor-pointer hover:shadow-md transition-shadow rounded-lg">
              <Card className="p-0! overflow-hidden">
                <div className={`h-2 ${stat.color}`} />
                <div className="p-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{loading ? '...' : stat.value}</p>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {quickActions.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
            <ShieldOff size={48} className="text-gray-300 dark:text-gray-600" />
            <div>
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">{t('dashboard.noModules')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('dashboard.noModulesDesc')}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('dashboard.quickActions')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <button
                key={action.href}
                onClick={() => navigate(action.href)}
                className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-primary-50 dark:hover:bg-gray-700 transition text-left"
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
