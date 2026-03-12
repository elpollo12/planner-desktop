import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card } from '../ui';
import {
  FileText, Search, Droplets, Fuel, Container,
  Package, ClipboardSignature,
  FolderArchive,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useModalStore } from '../../store';
import {
  useWaterBottlesStock,
  useFuelStock,
  useVacuumActions,
  usePendingRequestsCount,
  useMaterialsCatalog,
  useLogisticsReport,
} from '../../hooks/useLogistics';
import { capitalize } from '../../lib/stringUtils';
import { GeneralReportModal } from './forms/reports/GeneralReportModal';
import { DetailedReportModal } from './forms/reports/DetailedReportModal';
import type { LogisticsReport as LogisticsReportType } from '../../types/logistics';

type Section = 'botellones' | 'combustible' | 'vacuum' | 'materiales' | 'solicitudes';

export function LogisticsReports({ rigId, rigName }: { rigId: string; rigName: string | null }) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { openModal } = useModalStore();
  const canGenerate = user?.role === 'supervisor' || user?.role === 'admin';

  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [activeSection, setActiveSection] = useState<Section>('botellones');
  const [periodStart, setPeriodStart] = useState(thirtyDaysAgo);
  const [periodEnd, setPeriodEnd] = useState(today);
  // Controlled trigger: only fetch report when user clicks "Buscar"
  const [reportParams, setReportParams] = useState({ start: thirtyDaysAgo, end: today });

  // ── Stock queries (cached, shared with inventory tabs) ──
  const { data: waterBottlesStock, isLoading: loadingWb } = useWaterBottlesStock(rigId);
  const { data: fuelStock, isLoading: loadingFuel } = useFuelStock(rigId);
  const { data: vacuumData, isLoading: loadingVacuum } = useVacuumActions(rigId, 1, 1);
  const { data: pendingCount, isLoading: loadingPending } = usePendingRequestsCount(rigId);
  const { data: materialsList = [], isLoading: loadingMaterials } = useMaterialsCatalog();

  const stockLoading = loadingWb || loadingFuel || loadingVacuum || loadingPending || loadingMaterials;

  // ── Report query ──
  const { data: report, isLoading: reportLoading } = useLogisticsReport(
    rigId,
    reportParams.start,
    reportParams.end,
    canGenerate,
  );

  const SECTIONS: { value: Section; label: string; icon: typeof Droplets; color: string }[] = [
    { value: 'botellones', label: t('logistics.reports.sectionBotellones'), icon: Droplets, color: 'text-blue-600 dark:text-blue-400' },
    { value: 'combustible', label: t('logistics.reports.sectionCombustible'), icon: Fuel, color: 'text-amber-600 dark:text-amber-400' },
    { value: 'vacuum', label: t('logistics.reports.sectionVacuum'), icon: Container, color: 'text-purple-600 dark:text-purple-400' },
    { value: 'materiales', label: t('logistics.reports.sectionMateriales'), icon: Package, color: 'text-teal-600 dark:text-teal-400' },
    { value: 'solicitudes', label: t('logistics.reports.sectionSolicitudes'), icon: ClipboardSignature, color: 'text-orange-600 dark:text-orange-400' },
  ];

  const stockItems: { section: Section; label: string; value: string; sub: string; icon: typeof Droplets; color: string; bg: string }[] = [
    { section: 'botellones', label: t('logistics.reports.sectionBotellones'), value: fmtStock(waterBottlesStock), sub: t('logistics.reports.units'), icon: Droplets, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/10' },
    { section: 'combustible', label: t('logistics.reports.sectionCombustible'), value: fmtStock(fuelStock), sub: t('logistics.reports.liters'), icon: Fuel, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/10' },
    { section: 'vacuum', label: t('logistics.reports.sectionVacuum'), value: fmtStock(vacuumData?.total), sub: t('logistics.reports.actionsCount'), icon: Container, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/10' },
    { section: 'materiales', label: t('logistics.reports.sectionMateriales'), value: String(materialsList.length), sub: t('logistics.reports.types'), icon: Package, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/10' },
    { section: 'solicitudes', label: t('logistics.reports.sectionSolicitudes'), value: fmtStock(pendingCount), sub: t('logistics.reports.pendingCount'), icon: ClipboardSignature, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/10' },
  ];

  if (!canGenerate) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <p>{t('logistics.reports.onlySupervisors')}</p>
      </div>
    );
  }

  const handleSearch = () => {
    setReportParams({ start: periodStart, end: periodEnd });
  };

  const handleSectionChange = (section: Section) => {
    setActiveSection(section);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('logistics.reports.generalStock')}</h2>
        <div className='flex gap-2'>
          <Button
            variant="secondary"
            size="md"
            icon={<FileText size={16} />}
            onClick={() => {
              openModal(
                <DetailedReportModal rigId={rigId} rigName={rigName} section={activeSection} periodStart={periodStart} periodEnd={periodEnd} />,
                { title: t('logistics.reports.generateDetailed'), size: 'md', showCloseButton: true, closeOnOutsideClick: false }
              );
            }}
          >
            {t('logistics.reports.detailedReport')}
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={<FolderArchive size={16} />}
            onClick={() => {
              openModal(
                <GeneralReportModal rigId={rigId} rigName={rigName} periodStart={periodStart} periodEnd={periodEnd} />,
                { title: t('logistics.reports.generateGeneral'), size: 'md', showCloseButton: true, closeOnOutsideClick: false }
              );
            }}
          >
            {t('logistics.reports.generalReport')}
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Columna izquierda: Filtros + Detalle */}
        <div className="flex-1 space-y-4">
          {/* Filtros */}
          <Card className="p-4!">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('logistics.common.from')}</label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('logistics.common.to')}</label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('logistics.reports.section')}</label>
                <select
                  value={activeSection}
                  onChange={(e) => handleSectionChange(e.target.value as Section)}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
                >
                  {SECTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <Button
                variant="primary"
                size="md"
                icon={<Search size={16} />}
                onClick={handleSearch}
                disabled={reportLoading}
              >
                {reportLoading ? t('logistics.common.loading') : t('logistics.reports.search')}
              </Button>
            </div>
          </Card>

          {/* Detalle del reporte */}
          {reportLoading ? (
            <Card className="p-8!">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                <p className="mt-2 text-sm text-gray-500">{t('logistics.reports.loadingData')}</p>
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

const fmtStock = (val: number | null | undefined) =>
  val === null || val === undefined ? '—' : Number.isInteger(val) ? String(val) : val.toFixed(2);

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

function BotellonesDetail({ report }: { report: LogisticsReportType }) {
  const { t } = useTranslation();
  const s = report.waterBottlesSummary;
  return (
    <Card className="p-5!">
      <SummaryGrid items={[
        { label: t('logistics.reports.entries'), value: `+${s.totalEntries}`, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/10' },
        { label: t('logistics.reports.exits'), value: `-${s.totalExits}`, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/10' },
        { label: t('logistics.reports.net'), value: String(s.net), color: s.net >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-600', bg: 'bg-gray-50 dark:bg-gray-700/50' },
      ]} />
    </Card>
  );
}

function CombustibleDetail({ report }: { report: LogisticsReportType }) {
  const { t } = useTranslation();
  const s = report.fuelSummary;
  return (
    <Card className="p-5!">
      <SummaryGrid items={[
        { label: t('logistics.reports.entriesL'), value: `+${s.totalEntries.toFixed(2)}`, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/10' },
        { label: t('logistics.reports.exitsL'), value: `-${s.totalExits.toFixed(2)}`, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/10' },
        { label: t('logistics.reports.netL'), value: s.net.toFixed(2), color: s.net >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-600', bg: 'bg-gray-50 dark:bg-gray-700/50' },
      ]} />
    </Card>
  );
}

function VacuumDetail({ report }: { report: LogisticsReportType }) {
  const { t } = useTranslation();
  return (
    <Card className="p-5!">
      <SummaryGrid items={[
        { label: t('logistics.reports.actionsInPeriod'), value: String(report.vacuumSummary.totalActions), color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/10' },
      ]} />
    </Card>
  );
}

function MaterialesDetail({ report }: { report: LogisticsReportType }) {
  const { t } = useTranslation();
  const mats = report.materialsSummary;
  return (
    <Card className="p-5!">
      {mats.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">{t('logistics.reports.noMaterialMovements')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('logistics.reports.materialColumn')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('logistics.reports.unitColumn')}</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t('logistics.reports.entries')}</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t('logistics.reports.exits')}</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t('logistics.reports.net')}</th>
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

function SolicitudesDetail({ report }: { report: LogisticsReportType }) {
  const { t } = useTranslation();
  const s = report.requestsSummary;
  return (
    <Card className="p-5!">
      <SummaryGrid items={[
        { label: t('logistics.reports.total'), value: String(s.total), color: 'text-gray-900 dark:text-gray-100', bg: 'bg-gray-50 dark:bg-gray-700/50' },
        { label: t('logistics.reports.requested'), value: String(s.requested), color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/10' },
        { label: t('logistics.reports.pendingLabel'), value: String(s.pending), color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/10' },
        { label: t('logistics.reports.approved'), value: String(s.approved), color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/10' },
        { label: t('logistics.reports.rejected'), value: String(s.rejected), color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/10' },
      ]} />
    </Card>
  );
}
