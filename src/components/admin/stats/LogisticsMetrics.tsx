import { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { Package, Clock, CheckCircle, XCircle, Loader2, PackageOpen } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card } from '../../ui';
import { useLogisticsStats } from '../../../hooks/useAdminStats';
import { PeriodSelector } from './PeriodSelector';
import {
  REQUEST_TYPE_LABELS,
  REQUEST_STATUS_LABELS,
  STATUS_COLOR_MAP,
  CHART_COLORS,
  useAxisTickColor,
  useGridStroke,
} from './chartHelpers';

export function LogisticsMetrics() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useLogisticsStats(days);
  const tickColor = useAxisTickColor();
  const gridStroke = useGridStroke();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!data || data.totalRequests === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <PackageOpen className="mx-auto mb-4 text-gray-400" size={48} />
        <p>No hay datos de logística disponibles</p>
      </div>
    );
  }

  // Prepare data with Spanish labels
  const statusData = data.byStatus.map((s) => ({
    name: REQUEST_STATUS_LABELS[s.category] ?? s.category,
    value: s.count,
    color: STATUS_COLOR_MAP[s.category] ?? '#6b7280',
  }));

  const typeData = data.byType.map((t, i) => ({
    name: REQUEST_TYPE_LABELS[t.category] ?? t.category,
    value: t.count,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const dailyData = data.dailyRequests.map((d) => ({
    ...d,
    label: format(parseISO(d.day), 'd MMM', { locale: es }),
  }));

  const approvedCount = data.byStatus.find((s) => s.category === 'approved')?.count ?? 0;
  const rejectedCount = data.byStatus.find((s) => s.category === 'rejected')?.count ?? 0;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={Package} color="text-blue-500" label="Total Solicitudes" value={data.totalRequests} />
        <SummaryCard icon={Clock} color="text-yellow-500" label="Pendientes" value={data.pendingCount} />
        <SummaryCard icon={CheckCircle} color="text-green-500" label="Aprobadas" value={approvedCount} />
        <SummaryCard icon={XCircle} color="text-red-500" label="Rechazadas" value={rejectedCount} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie: by type */}
        <Card className="p-5">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Por Tipo de Solicitud</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {typeData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3">
            {typeData.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                {entry.name}: {entry.value}
              </div>
            ))}
          </div>
        </Card>

        {/* Pie: by status */}
        <Card className="p-5">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Por Estado</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {statusData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3">
            {statusData.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                {entry.name}: {entry.value}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top rigs bar chart */}
      {data.topRigs.length > 0 && (
        <Card className="p-5">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Top Taladros por Solicitudes</h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topRigs} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: tickColor }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="rigName" tick={{ fontSize: 12, fill: tickColor }} width={120} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2 text-sm">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{item.rigName}</p>
                        <p className="text-blue-600">{item.count} solicitudes</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Daily trend */}
      {dailyData.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tendencia de Solicitudes</h4>
            <PeriodSelector value={days} onChange={setDays} />
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLogistics" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: tickColor }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: tickColor }} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2 text-sm">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {format(parseISO(item.day), "d 'de' MMMM", { locale: es })}
                        </p>
                        <p className="text-emerald-600">{item.count} solicitudes</p>
                      </div>
                    );
                  }}
                />
                <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} fill="url(#colorLogistics)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// INTERNAL COMPONENTS
// ============================================================================

function SummaryCard({ icon: Icon, color, label, value }: {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
      <Icon className={color} size={24} />
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}
