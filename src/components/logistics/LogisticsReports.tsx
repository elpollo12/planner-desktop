import { useState, useEffect } from 'react';
import { Button, Card } from '../ui';
import {
  FileText, Sheet, Search, Droplets, Fuel, Container,
  Package, ClipboardSignature,
  FolderArchive,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import {
  waterBottlesApi, fuelApi, vacuumApi, materialsApi,
  logisticsRequestsApi, logisticsReportsApi,
} from '../../lib/api';
import { toast } from 'react-toastify';
import { capitalize } from '../../lib/stringUtils';
import type { LogisticsReport } from '../../types/logistics';

type Section = 'botellones' | 'combustible' | 'vacuum' | 'materiales' | 'solicitudes';

const SECTIONS: { value: Section; label: string; icon: typeof Droplets; color: string }[] = [
  { value: 'botellones', label: 'Botellones', icon: Droplets, color: 'text-blue-600 dark:text-blue-400' },
  { value: 'combustible', label: 'Combustible', icon: Fuel, color: 'text-amber-600 dark:text-amber-400' },
  { value: 'vacuum', label: 'Vacuum / Cisterna', icon: Container, color: 'text-purple-600 dark:text-purple-400' },
  { value: 'materiales', label: 'Materiales', icon: Package, color: 'text-teal-600 dark:text-teal-400' },
  { value: 'solicitudes', label: 'Solicitudes', icon: ClipboardSignature, color: 'text-orange-600 dark:text-orange-400' },
];

interface StockData {
  waterBottles: number | null;
  fuel: number | null;
  vacuumActions: number | null;
  pendingRequests: number | null;
  materialTypes: number;
}

export function LogisticsReports() {
  const { sessionToken, user } = useAuthStore();
  const canGenerate = user?.role === 'supervisor' || user?.role === 'admin';

  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [stock, setStock] = useState<StockData>({
    waterBottles: null, fuel: null, vacuumActions: null,
    pendingRequests: null, materialTypes: 0,
  });
  const [stockLoading, setStockLoading] = useState(true);

  const [activeSection, setActiveSection] = useState<Section>('botellones');
  const [periodStart, setPeriodStart] = useState(thirtyDaysAgo);
  const [periodEnd, setPeriodEnd] = useState(today);
  const [report, setReport] = useState<LogisticsReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Load stock + initial report on mount
  useEffect(() => {
    if (sessionToken && canGenerate) {
      loadStock();
      loadReport();
    }
  }, [sessionToken]);

  const loadStock = async () => {
    if (!sessionToken) return;
    setStockLoading(true);
    try {
      const [wb, fuel, vacuumRes, pending, materialsList] = await Promise.all([
        waterBottlesApi.getStock(sessionToken),
        fuelApi.getStock(sessionToken),
        vacuumApi.getActions(sessionToken, 1, 1),
        logisticsRequestsApi.getPendingCount(sessionToken),
        materialsApi.list(sessionToken, true),
      ]);
      setStock({
        waterBottles: wb, fuel, vacuumActions: vacuumRes.total,
        pendingRequests: pending, materialTypes: materialsList.length,
      });
    } catch (error) {
      console.error('Error cargando stock:', error);
    } finally {
      setStockLoading(false);
    }
  };

  const loadReport = async () => {
    if (!sessionToken || !canGenerate) return;
    setReportLoading(true);
    try {
      const data = await logisticsReportsApi.getReport(sessionToken, periodStart, periodEnd);
      setReport(data);
    } catch (error: any) {
      toast.error(error?.toString() || 'Error al generar reporte');
    } finally {
      setReportLoading(false);
    }
  };

  const handleSearch = () => {
    loadReport();
  };

  const handleSectionChange = (section: Section) => {
    setActiveSection(section);
  };

  if (!canGenerate) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <p>Solo supervisores y administradores pueden ver reportes</p>
      </div>
    );
  }

  const fmtStock = (val: number | null) =>
    val === null ? '—' : Number.isInteger(val) ? String(val) : val.toFixed(2);

  const stockItems: { section: Section; label: string; value: string; sub: string; icon: typeof Droplets; color: string; bg: string }[] = [
    { section: 'botellones', label: 'Botellones', value: fmtStock(stock.waterBottles), sub: 'uds', icon: Droplets, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/10' },
    { section: 'combustible', label: 'Combustible', value: fmtStock(stock.fuel), sub: 'litros', icon: Fuel, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/10' },
    { section: 'vacuum', label: 'Vacuum', value: fmtStock(stock.vacuumActions), sub: 'acciones', icon: Container, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/10' },
    { section: 'materiales', label: 'Materiales', value: String(stock.materialTypes), sub: 'tipos', icon: Package, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/10' },
    { section: 'solicitudes', label: 'Solicitudes', value: fmtStock(stock.pendingRequests), sub: 'pendientes', icon: ClipboardSignature, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Stock General</h2>
        <Button
          variant="primary"
          size="sm"
          icon={<FolderArchive size={16} />}
          onClick={() => {/* TODO: generar reporte general */ }}
        >
          Reporte General
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Columna izquierda: Filtros + Detalle */}
        <div className="flex-1 space-y-4">
          {/* Filtros */}
          <Card className="p-4!">
            <div className="flex flex-wrap items-end gap-3">
              {/* Fecha desde */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Desde</label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              {/* Fecha hasta */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Hasta</label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              {/* Select de sección */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sección</label>
                <select
                  value={activeSection}
                  onChange={(e) => handleSectionChange(e.target.value as Section)}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
                >
                  {SECTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Buscar */}
              <Button
                variant="primary"
                size="md"
                icon={<Search size={16} />}
                onClick={handleSearch}
                disabled={reportLoading}
              >
                {reportLoading ? 'Cargando...' : 'Buscar'}
              </Button>
            </div>
          </Card>

          {/* Detalle del reporte */}
          {reportLoading ? (
            <Card className="p-8!">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                <p className="mt-2 text-sm text-gray-500">Cargando datos...</p>
              </div>
            </Card>
          ) : report ? (
            <div className='mt-6'>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {(() => {
                    const cfg = SECTIONS.find(s => s.value === activeSection)!;
                    const Icon = cfg.icon;
                    return (
                      <>
                        <Icon size={18} className={cfg.color} />
                        <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100">{cfg.label}</h3>
                      </>
                    );
                  })()}
                  <span className="text-xs text-gray-400 ml-2">{report.periodStart} — {report.periodEnd}</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<FileText size={16} />}
                  onClick={() => {/* TODO: generar reporte especifico */ }}
                >
                  Reporte Detallado
                </Button>
              </div>

              {activeSection === 'botellones' && <BotellonesDetail report={report} />}
              {activeSection === 'combustible' && <CombustibleDetail report={report} />}
              {activeSection === 'vacuum' && <VacuumDetail report={report} />}
              {activeSection === 'materiales' && <MaterialesDetail report={report} />}
              {activeSection === 'solicitudes' && <SolicitudesDetail report={report} />}
            </div>
          ) : null}
        </div>

        {/* Columna derecha: Stock cards mini clickeables */}
        <div className="flex gap-2 lg:flex-col lg:gap-2 overflow-x-auto lg:overflow-visible lg:w-52 shrink-0">
          {stockItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.section;
            return (
              <button
                key={item.section}
                onClick={() => handleSectionChange(item.section)}
                className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg min-w-30 lg:min-w-0 text-left transition-all duration-150 ${isActive
                  ? `${item.bg} ring-2 ring-primary-400 shadow-sm`
                  : `${item.bg} hover:ring-1 hover:ring-gray-300 dark:hover:ring-gray-600`
                  }`}
              >
                <Icon size={14} className={item.color} />
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${item.color}`}>
                    {stockLoading ? '...' : item.value}
                  </p>
                  <p className="text-[10px] text-gray-500 leading-tight">{item.label} · {item.sub}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-componentes de detalle
// ============================================================================

function SummaryGrid({ items }: { items: { label: string; value: string; color: string; bg: string }[] }) {
  return (
    <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((item) => (
        <div key={item.label} className={`p-4 rounded-lg text-center ${item.bg}`}>
          <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
          <p className="text-xs text-gray-500 mt-1">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

function BotellonesDetail({ report }: { report: LogisticsReport }) {
  const s = report.waterBottlesSummary;
  return (
    <Card className="p-5!">
      <SummaryGrid items={[
        { label: 'Entradas', value: `+${s.totalEntries}`, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/10' },
        { label: 'Salidas', value: `-${s.totalExits}`, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/10' },
        { label: 'Neto', value: String(s.net), color: s.net >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-600', bg: 'bg-gray-50 dark:bg-gray-700/50' },
      ]} />
    </Card>
  );
}

function CombustibleDetail({ report }: { report: LogisticsReport }) {
  const s = report.fuelSummary;
  return (
    <Card className="p-5!">
      <SummaryGrid items={[
        { label: 'Entradas (L)', value: `+${s.totalEntries.toFixed(2)}`, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/10' },
        { label: 'Salidas (L)', value: `-${s.totalExits.toFixed(2)}`, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/10' },
        { label: 'Neto (L)', value: s.net.toFixed(2), color: s.net >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-600', bg: 'bg-gray-50 dark:bg-gray-700/50' },
      ]} />
    </Card>
  );
}

function VacuumDetail({ report }: { report: LogisticsReport }) {
  return (
    <Card className="p-5!">
      <SummaryGrid items={[
        { label: 'Acciones en el período', value: String(report.vacuumSummary.totalActions), color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/10' },
      ]} />
    </Card>
  );
}

function MaterialesDetail({ report }: { report: LogisticsReport }) {
  const mats = report.materialsSummary;
  return (
    <Card className="p-5!">
      {mats.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">Sin movimientos de materiales en el período</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unidad</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Entradas</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Salidas</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Neto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {mats.map((ms) => (
                <tr key={ms.materialId}>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{capitalize(ms.materialName)}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">{ms.unit}</td>
                  <td className="px-4 py-2 text-sm text-right text-green-600">+{ms.totalEntries}</td>
                  <td className="px-4 py-2 text-sm text-right text-red-600">-{ms.totalExits}</td>
                  <td className={`px-4 py-2 text-sm text-right font-bold ${ms.net >= 0 ? '' : 'text-red-600'}`}>{ms.net}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function SolicitudesDetail({ report }: { report: LogisticsReport }) {
  const s = report.requestsSummary;
  return (
    <Card className="p-5!">
      <SummaryGrid items={[
        { label: 'Total', value: String(s.total), color: 'text-gray-900 dark:text-gray-100', bg: 'bg-gray-50 dark:bg-gray-700/50' },
        { label: 'Solicitadas', value: String(s.requested), color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/10' },
        { label: 'En espera', value: String(s.pending), color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/10' },
        { label: 'Aprobadas', value: String(s.approved), color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/10' },
        { label: 'Rechazadas', value: String(s.rejected), color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/10' },
      ]} />
    </Card>
  );
}
