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
import { AlertTriangle, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card } from '../../ui';
import { useIncidentsStats } from '../../../hooks/useAdminStats';
import { PeriodSelector } from './PeriodSelector';
import { getIncidentColor, useAxisTickColor, useGridStroke } from './chartHelpers';

export function IncidentsMetrics() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useIncidentsStats(days);
  const tickColor = useAxisTickColor();
  const gridStroke = useGridStroke();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!data || data.totalIncidents === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <AlertTriangle className="mx-auto mb-4 text-gray-400" size={48} />
        <p>No hay datos de incidencias disponibles</p>
      </div>
    );
  }

  const typeData = data.byType.map((t: { typeName: string; count: number; color: string; typeId: string }) => ({
    name: t.typeName,
    value: t.count,
    color: getIncidentColor(t.color),
  }));

  const dailyData = data.dailyIncidents.map((d: { day: string; count: number }) => ({
    ...d,
    label: format(parseISO(d.day), 'd MMM', { locale: es }),
  }));

  return (
    <div className="space-y-6">
      {/* Summary badges */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <AlertTriangle className="text-orange-500" size={20} />
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.totalIncidents}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">Total Incidencias</span>
        </div>

        {data.byType.map((t: { typeName: string; count: number; color: string; typeId: string }) => (
          <div
            key={t.typeId}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
            style={{
              backgroundColor: `${getIncidentColor(t.color)}18`,
              color: getIncidentColor(t.color),
            }}
          >
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: getIncidentColor(t.color) }} />
            {t.typeName}: {t.count}
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie: by type */}
        <Card className="p-5">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Distribución por Tipo</h4>
          <div className="h-48" style={{ minWidth: 0 }}>
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
                  {typeData.map((entry: { name: string; value: number; color: string }, idx: number) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3">
            {typeData.map((entry: { name: string; value: number; color: string }, idx: number) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                {entry.name}: {entry.value}
              </div>
            ))}
          </div>
        </Card>

        {/* Top rigs */}
        {data.topRigs.length > 0 && (
          <Card className="p-5">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Top Taladros con Incidencias</h4>
            <div className="h-56" style={{ minWidth: 0 }}>
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
                          <p className="text-orange-600">{item.count} incidencias</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {/* Daily trend */}
      {dailyData.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tendencia de Incidencias</h4>
            <PeriodSelector value={days} onChange={setDays} />
          </div>
          <div className="h-56" style={{ minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
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
                        <p className="text-orange-600">{item.count} incidencias</p>
                      </div>
                    );
                  }}
                />
                <Area type="monotone" dataKey="count" stroke="#f97316" strokeWidth={2} fill="url(#colorIncidents)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
