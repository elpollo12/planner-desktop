import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import { Droplets, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card } from '../../ui';
import { useFluidStats } from '../../../hooks/useAdminStats';
import { PeriodSelector } from './PeriodSelector';
import { useAxisTickColor, useGridStroke } from './chartHelpers';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export function FluidMetrics() {
  const { t } = useTranslation();
  const [days, setDays] = useState(30);
  const { data, isLoading } = useFluidStats(days);
  const tickColor = useAxisTickColor();
  const gridStroke = useGridStroke();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!data || data.totalReports === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Droplets className="mx-auto mb-4 text-gray-400" size={48} />
        <p>{t('admin.fluidMetrics.noData')}</p>
      </div>
    );
  }

  const fluidTypeData = data.byFluidType.map((item, i) => ({
    name: item.category,
    value: item.count,
    color: COLORS[i % COLORS.length],
  }));

  const wellPhaseData = data.byWellPhase.map((item, i) => ({
    name: item.category,
    value: item.count,
    color: COLORS[(i + 3) % COLORS.length],
  }));

  const dailyData = data.dailyReports.map((d) => ({
    ...d,
    label: format(parseISO(d.day), 'd MMM', { locale: es }),
  }));

  return (
    <div className="space-y-6">
      {/* Summary badges */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <Droplets className="text-blue-500" size={20} />
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.totalReports}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{t('admin.fluidMetrics.totalReports')}</span>
        </div>
        {data.byFluidType.map((item, i) => (
          <div
            key={item.category}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
            style={{ backgroundColor: `${COLORS[i % COLORS.length]}18`, color: COLORS[i % COLORS.length] }}
          >
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            {item.category}: {item.count}
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie: by fluid type */}
        {fluidTypeData.length > 0 && (
          <Card className="p-5">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('admin.fluidMetrics.byFluidType')}</h4>
            <div style={{ width: '100%', height: 192 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={fluidTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {fluidTypeData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3">
              {fluidTypeData.map((e, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                  <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
                  {e.name}: {e.value}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Bar: top rigs */}
        {data.topRigs.length > 0 && (
          <Card className="p-5">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('admin.fluidMetrics.topRigs')}</h4>
            <div style={{ width: '100%', height: 224 }}>
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
                          <p className="text-blue-600">{t('admin.fluidMetrics.reports', { count: item.count })}</p>
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
      </div>

      {/* Pie: by well phase */}
      {wellPhaseData.length > 0 && (
        <Card className="p-5">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('admin.fluidMetrics.byWellPhase')}</h4>
          <div className="flex items-center gap-8">
            <div style={{ width: 200, height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={wellPhaseData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3}>
                    {wellPhaseData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {wellPhaseData.map((e, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
                  {e.name}: <strong>{e.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Daily trend */}
      {dailyData.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('admin.fluidMetrics.dailyTrend')}</h4>
            <PeriodSelector value={days} onChange={setDays} />
          </div>
          <div style={{ width: '100%', height: 224 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFluid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
                        <p className="text-blue-600">{t('admin.fluidMetrics.reports', { count: item.count })}</p>
                      </div>
                    );
                  }}
                />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#colorFluid)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
