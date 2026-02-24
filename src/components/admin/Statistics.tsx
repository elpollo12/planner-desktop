import { useState, useEffect } from 'react';
import { Card } from '../ui';
import { FileText, Users, Clock, CheckCircle, XCircle, TrendingUp, Package, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { reportsApi, usersApi } from '../../lib/api';
import { ActivityChart, LogisticsMetrics, IncidentsMetrics } from './stats';

export function Statistics() {
  const { sessionToken } = useAuthStore();
  const [stats, setStats] = useState({
    totalReports: 0,
    totalUsers: 0,
    reportsByStatus: {
      draft: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
    },
    usersByRole: {
      admin: 0,
      supervisor: 0,
      operator: 0,
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionToken) {
      loadStatistics();
    } else {
      setLoading(false);
    }
  }, [sessionToken]);

  const loadStatistics = async () => {
    if (!sessionToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [reportsResponse, users] = await Promise.all([
        reportsApi.list(sessionToken, {}, 1, 1000),
        usersApi.list(sessionToken),
      ]);

      const reports = reportsResponse.reports;

      // Calculate stats
      const reportsByStatus = {
        draft: reports.filter(r => r.status === 'draft').length,
        submitted: reports.filter(r => r.status === 'submitted').length,
        approved: reports.filter(r => r.status === 'approved').length,
        rejected: reports.filter(r => r.status === 'rejected').length,
      };

      const usersByRole = {
        admin: users.filter(u => u.role === 'admin').length,
        supervisor: users.filter(u => u.role === 'supervisor').length,
        operator: users.filter(u => u.role === 'operator').length,
      };

      setStats({
        totalReports: reports.length,
        totalUsers: users.length,
        reportsByStatus,
        usersByRole,
      });
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Cargando estadísticas...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Reportes</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalReports}</p>
            </div>
            <FileText className="text-blue-500" size={32} />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Usuarios</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalUsers}</p>
            </div>
            <Users className="text-green-500" size={32} />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tasa Aprobación</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.totalReports > 0
                  ? Math.round((stats.reportsByStatus.approved / stats.totalReports) * 100)
                  : 0}
                %
              </p>
            </div>
            <TrendingUp className="text-purple-500" size={32} />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pendientes</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.reportsByStatus.submitted}</p>
            </div>
            <Clock className="text-yellow-500" size={32} />
          </div>
        </Card>
      </div>

      {/* Activity Chart — replaces the old placeholder */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Actividad Reciente</h3>
          <ActivityChart />
        </div>
      </Card>

      {/* Reports by Status */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Reportes por Estado</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-700">
                <Clock className="text-gray-600" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.reportsByStatus.draft}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Borradores</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/40">
                <FileText className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.reportsByStatus.submitted}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Enviados</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/40">
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.reportsByStatus.approved}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Aprobados</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/40">
                <XCircle className="text-red-600" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.reportsByStatus.rejected}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Rechazados</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Users by Role */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Usuarios por Rol</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/40">
                <Users className="text-purple-600" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.usersByRole.admin}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Administradores</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/40">
                <Users className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.usersByRole.supervisor}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Supervisores</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/40">
                <Users className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.usersByRole.operator}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Operadores</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Logistics Metrics — NEW */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="text-emerald-500" size={22} />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Métricas de Logística</h3>
          </div>
          <LogisticsMetrics />
        </div>
      </Card>

      {/* Incidents Metrics — NEW */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="text-orange-500" size={22} />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Métricas de Incidencias</h3>
          </div>
          <IncidentsMetrics />
        </div>
      </Card>
    </div>
  );
}
