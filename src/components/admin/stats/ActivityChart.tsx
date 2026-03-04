import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useActivityStats } from '../../../hooks/useAdminStats';
import { PeriodSelector } from './PeriodSelector';
import { useAxisTickColor, useGridStroke } from './chartHelpers';

export function ActivityChart() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useActivityStats(days);
  const tickColor = useAxisTickColor();
  const gridStroke = useGridStroke();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!data || data.dailyReports.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <TrendingUp className="mx-auto mb-4 text-gray-400" size={48} />
        <p>No hay actividad de reportes en los últimos {days} días</p>
      </div>
    );
  }

  const chartData = data.dailyReports.map((d: { day: string; count: number }) => ({
    ...d,
    label: format(parseISO(d.day), 'd MMM', { locale: es }),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total en el período:{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {data.totalPeriod} reportes
            </span>
          </p>
        </div>
        <PeriodSelector value={days} onChange={setDays} />
      </div>

      <div className="h-72" style={{ minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: tickColor }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: tickColor }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0].payload;
                return (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2 text-sm">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {format(parseISO(item.day), "d 'de' MMMM", { locale: es })}
                    </p>
                    <p className="text-blue-600">
                      {item.count} {item.count === 1 ? 'reporte' : 'reportes'}
                    </p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#colorReports)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
