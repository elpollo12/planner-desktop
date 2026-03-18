import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '../components/layout';
import { Button, Card } from '../components/ui';
import { ChevronLeft, Pencil } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { fluidsApi } from '../lib/api';
import { toast } from '../lib/toast';
import { formatDateDMY } from '../lib/dateUtils';
import type { FluidReportFull } from '../types/fluid';

// ============================================================================
// Helpers
// ============================================================================

const fmtNum = (v: number | string | null | undefined): string => {
  if (v === null || v === undefined || v === '') return '-';
  return String(v);
};

const fmtStr = (v: string | null | undefined): string => v || '-';

type TabId = 'tab1' | 'tab2' | 'tab3';

// ============================================================================
// Read-only display components
// ============================================================================

function FieldDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-900 dark:text-gray-100 mt-0.5">{value}</dd>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
      {title}
    </h3>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function FluidView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sessionToken } = useAuthStore();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<TabId>('tab1');
  const [report, setReport] = useState<FluidReportFull | null>(null);
  const [loading, setLoading] = useState(true);

  const TABS: Array<{ id: TabId; label: string }> = [
    { id: 'tab1', label: t('fluids.form.tabs.tab1') },
    { id: 'tab2', label: t('fluids.form.tabs.tab2') },
    { id: 'tab3', label: t('fluids.form.tabs.tab3') },
  ];

  useEffect(() => {
    if (sessionToken && id) {
      loadReport(id);
    }
  }, [sessionToken, id]);

  const loadReport = async (fluidId: string) => {
    if (!sessionToken) return;
    setLoading(true);
    try {
      const data = await fluidsApi.get(sessionToken, fluidId);
      setReport(data);
    } catch (error) {
      console.error('Error loading fluid report:', error);
      toast.error(t('fluids.view.errorLoading'));
      navigate('/fluids');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !report) {
    return (
      <MainLayout title={t('fluids.view.loadingReport')}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
        </div>
      </MainLayout>
    );
  }

  const SHIFT_LABELS = [t('fluids.props.shift1'), t('fluids.props.shift2'), t('fluids.props.shift3')];

  return (
    <MainLayout
      title={t('fluids.view.title', { number: report.reportNumber || '' })}
      subtitle={`${fmtStr(report.wellNumber)} — ${report.reportDate ? formatDateDMY(report.reportDate) : '-'}`}
      headerActions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/fluids')} icon={<ChevronLeft size={16} />}>
            {t('fluids.view.back')}
          </Button>
          <Button variant="primary" onClick={() => navigate(`/fluids/edit/${id}`)} icon={<Pencil size={16} />}>
            {t('fluids.view.edit')}
          </Button>
        </div>
      }
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Report Header */}
        <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">{t('fluids.view.reportData')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <FieldDisplay label={t('fluids.view.report')} value={`#${report.reportNumber || '-'}`} />
              <FieldDisplay label={t('fluids.view.date')} value={report.reportDate ? formatDateDMY(report.reportDate) : '-'} />
              <FieldDisplay label={t('fluids.view.well')} value={fmtStr(report.wellNumber)} />
              <FieldDisplay label={t('fluids.view.rig')} value={fmtStr(report.rigNumber)} />
              <FieldDisplay label={t('fluids.view.contract')} value={fmtStr(report.contract)} />
              <FieldDisplay label={t('fluids.view.contractor')} value={fmtStr(report.contractor)} />
              <FieldDisplay label={t('fluids.view.operator')} value={fmtStr(report.operator)} />
              <FieldDisplay label={t('fluids.view.supervisor24h')} value={fmtStr(report.supervisor24h)} />
            </div>
          </div>
        </Card>

        {/* Tab Navigation */}
        <Card>
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* ── Tab 1: API Report ──────────────────────────────────── */}
            {activeTab === 'tab1' && (
              <div className="space-y-8">
                {/* Personal */}
                <section>
                  <SectionTitle title={t('fluids.view.personnel')} />
                  <dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <FieldDisplay label={t('fluids.view.fluidType')} value={fmtStr(report.fluidType)} />
                    <FieldDisplay label={t('fluids.view.wellPhase')} value={fmtStr(report.wellPhase)} />
                    <FieldDisplay label={t('fluids.view.coordinator')} value={fmtStr(report.fluidCoordinator)} />
                    <FieldDisplay label={t('fluids.view.techRep1')} value={fmtStr(report.techRep1)} />
                    <FieldDisplay label={t('fluids.view.techRep2')} value={fmtStr(report.techRep2)} />
                    <FieldDisplay label={t('fluids.view.trainee')} value={fmtStr(report.trainee)} />
                    <FieldDisplay label={t('fluids.view.supervisorOps')} value={fmtStr(report.opsSupervisor)} />
                  </dl>
                </section>

                {/* Propiedades del fluido */}
                {report.props.length > 0 && (
                  <section>
                    <SectionTitle title={t('fluids.view.fluidProps')} />
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.view.property')}</th>
                            {SHIFT_LABELS.map((s, i) => (
                              <th key={i} className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{s}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {([
                            [t('fluids.props.hour'), 'sampleHour'], [t('fluids.props.source'), 'sampleSource'], [t('fluids.props.temperature'), 'temperatureF'],
                            [t('fluids.props.depthMd'), 'depthMd'], [t('fluids.props.depthTvd'), 'depthTvd'],
                            [t('fluids.props.density'), 'density'], [t('fluids.props.marshVisc'), 'marshViscosity'],
                            ['L600', 'rpm600'], ['L300', 'rpm300'], ['L200', 'rpm200'], ['L100', 'rpm100'], ['L6', 'rpm6'], ['L3', 'rpm3'],
                            ['VP', 'pv'], ['YP', 'yp'], ['Gel 10s', 'gel10s'], ['Gel 10m', 'gel10m'], ['Gel 30m', 'gel30m'],
                            [t('fluids.props.apiFilter'), 'apiFiltrate'], [t('fluids.props.filterCake'), 'filterCake'],
                            [t('fluids.props.sandPct'), 'sandContent'], [t('fluids.props.solidsPct'), 'solidsRetort'], [t('fluids.props.oilPct'), 'oilRetort'], [t('fluids.props.waterPct'), 'waterRetort'],
                            ['pH', 'ph'], ['Pm', 'alkalinityPm'], ['Pf', 'alkalinityPf'], ['Mf', 'alkalinityMf'],
                            ['Ca²⁺', 'calciumPpm'], ['Cl⁻', 'chloridesPpm'], ['MBT', 'mbt'],
                            ['Brookfield', 'brookfieldVisc'], [t('fluids.props.lubCoef'), 'lubricityCoef'],
                          ] as [string, string][]).map(([label, key]) => {
                            const hasData = report.props.some((p) => (p as unknown as Record<string, unknown>)[key] != null);
                            if (!hasData) return null;
                            return (
                              <tr key={key}>
                                <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300 font-medium">{label}</td>
                                {report.props.map((p, i) => (
                                  <td key={i} className="px-3 py-1.5 text-center text-gray-900 dark:text-gray-100">
                                    {fmtNum((p as unknown as Record<string, unknown>)[key] as number | string | null)}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* Circulación */}
                <section>
                  <SectionTitle title={t('fluids.view.circulation')} />
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('fluids.form.circulationParam')}</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">{t('fluids.form.circulationMin')}</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">{t('fluids.form.circulationStrokes')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {([
                          [t('fluids.form.circBottomDown'), report.bottomDownMin, report.bottomDownEmb],
                          [t('fluids.form.circBottomUp'), report.bottomUpMin, report.bottomUpEmb],
                          [t('fluids.form.circWellCycle'), report.wellCycleMin, report.wellCycleEmb],
                          [t('fluids.form.circTotalCycle'), report.totalCycleMin, report.totalCycleEmb],
                        ] as [string, number | null, number | null][]).map(([label, min, emb]) => (
                          <tr key={label}>
                            <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300 font-medium">{label}</td>
                            <td className="px-3 py-1.5 text-center text-gray-900 dark:text-gray-100">{fmtNum(min)}</td>
                            <td className="px-3 py-1.5 text-center text-gray-900 dark:text-gray-100">{fmtNum(emb)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* DIMS */}
                <section>
                  <SectionTitle title={t('fluids.view.dims')} />
                  <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FieldDisplay label={t('fluids.form.dimsInitial')} value={fmtNum(report.volInicial)} />
                    <FieldDisplay label={t('fluids.form.dimsLostHole')} value={fmtNum(report.volPerdidoHoyo)} />
                    <FieldDisplay label={t('fluids.form.dimsDiscarded')} value={fmtNum(report.volDescartado)} />
                    <FieldDisplay label={t('fluids.form.dimsPrepared')} value={fmtNum(report.volPreparado)} />
                    <FieldDisplay label={t('fluids.form.dimsTransferred')} value={fmtNum(report.volTransferido)} />
                    <FieldDisplay label={t('fluids.form.dimsReceived')} value={fmtNum(report.volRecibido)} />
                    <FieldDisplay label={t('fluids.form.dimsLostSurface')} value={fmtNum(report.volPerdidoSup)} />
                    <FieldDisplay label={t('fluids.form.dimsFinal')} value={fmtNum(report.volFinal)} />
                  </dl>
                </section>

                {/* Hidráulica */}
                <section>
                  <SectionTitle title={t('fluids.view.hydraulics')} />
                  <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <FieldDisplay label="ESD" value={fmtNum(report.esd)} />
                    <FieldDisplay label="ECD" value={fmtNum(report.ecd)} />
                    <FieldDisplay label="n Tubería" value={fmtNum(report.embNTuberia)} />
                    <FieldDisplay label="n Anular" value={fmtNum(report.embNAnular)} />
                    <FieldDisplay label="K Tubería" value={fmtNum(report.embKTuberia)} />
                    <FieldDisplay label="K Anular" value={fmtNum(report.embKAnular)} />
                  </dl>
                </section>

                {/* Control de Sólidos */}
                {report.solidsControl.length > 0 && (
                  <section>
                    <SectionTitle title={t('fluids.view.solidsControl')} />
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('fluids.solids.equipment')}</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">{t('fluids.solids.meshDesign')}</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">{t('fluids.solids.hrsToday')}</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">{t('fluids.solids.hrsAccum')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {report.solidsControl.map((sc, i) => (
                            <tr key={i}>
                              <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{fmtStr(sc.equipment)}</td>
                              <td className="px-3 py-1.5 text-center text-gray-900 dark:text-gray-100">{fmtStr(sc.designMesh)}</td>
                              <td className="px-3 py-1.5 text-center text-gray-900 dark:text-gray-100">{fmtNum(sc.hoursToday)}</td>
                              <td className="px-3 py-1.5 text-center text-gray-900 dark:text-gray-100">{fmtNum(sc.hoursAccumulated)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* Bitácora de horas */}
                {report.activity && (
                  <section>
                    <SectionTitle title={t('fluids.view.activityLog')} />
                    <dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      <FieldDisplay label={t('fluids.form.actMoving')} value={fmtNum(report.activity.hoursMoving)} />
                      <FieldDisplay label={t('fluids.form.actCirculating')} value={fmtNum(report.activity.hoursCirculating)} />
                      <FieldDisplay label={t('fluids.form.actDrilling')} value={fmtNum(report.activity.hoursDrilling)} />
                      <FieldDisplay label={t('fluids.form.actTripping')} value={fmtNum(report.activity.hoursTripping)} />
                      <FieldDisplay label={t('fluids.form.actCleaning')} value={fmtNum(report.activity.hoursCleaning)} />
                      <FieldDisplay label={t('fluids.form.actBackreaming')} value={fmtNum(report.activity.hoursBackreaming)} />
                      <FieldDisplay label={t('fluids.form.actCementing')} value={fmtNum(report.activity.hoursCementing)} />
                      <FieldDisplay label={t('fluids.form.actRunningCsg')} value={fmtNum(report.activity.hoursRunningCsg)} />
                      <FieldDisplay label={t('fluids.form.actOther')} value={fmtNum(report.activity.hoursOther)} />
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
                        <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('fluids.view.total')}</dt>
                        <dd className="text-sm font-bold text-gray-900 dark:text-gray-100">{fmtNum(report.activity.hoursTotal)} {t('fluids.view.hrs')}</dd>
                      </div>
                    </dl>
                  </section>
                )}

                {/* Comentarios */}
                {(report.fluidComments || report.productComments || report.volComments) && (
                  <section>
                    <SectionTitle title={t('fluids.view.comments')} />
                    <div className="space-y-3">
                      {report.fluidComments && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">{t('fluids.view.commentFluid')}</p>
                          <p className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">{report.fluidComments}</p>
                        </div>
                      )}
                      {report.productComments && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">{t('fluids.view.commentProducts')}</p>
                          <p className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">{report.productComments}</p>
                        </div>
                      )}
                      {report.volComments && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">{t('fluids.view.commentVol')}</p>
                          <p className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">{report.volComments}</p>
                        </div>
                      )}
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* ── Tab 2: Inventario ─────────────────────────────────── */}
            {activeTab === 'tab2' && (
              <div className="space-y-8">
                {report.inventory.length > 0 ? (
                  <section>
                    <SectionTitle title={t('fluids.view.inventory')} />
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('fluids.inventory.product')}</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">{t('fluids.inventory.initial')}</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">{t('fluids.inventory.recToday')}</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">{t('fluids.inventory.transferred')}</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">{t('fluids.inventory.consumed')}</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-green-50 dark:bg-green-900/20">{t('fluids.inventory.invFinal')}</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">{t('fluids.inventory.dailyCost')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {report.inventory.map((inv, i) => (
                            <tr key={i}>
                              <td className="px-3 py-1.5">
                                <span className="font-medium text-primary-600 dark:text-primary-400">{inv.productCode || '-'}</span>
                                <span className="ml-1 text-gray-600 dark:text-gray-400">{inv.productName || ''}</span>
                              </td>
                              <td className="px-3 py-1.5 text-center">{fmtNum(inv.invInicial)}</td>
                              <td className="px-3 py-1.5 text-center">{fmtNum(inv.receivedToday)}</td>
                              <td className="px-3 py-1.5 text-center">{fmtNum(inv.transferredToday)}</td>
                              <td className="px-3 py-1.5 text-center">{fmtNum(inv.consumedToday)}</td>
                              <td className="px-3 py-1.5 text-center font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/10">{fmtNum(inv.invFinal)}</td>
                              <td className="px-3 py-1.5 text-center">{fmtNum(inv.dailyCost)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ) : (
                  <div className="text-center py-8 text-gray-500">{t('fluids.view.noInventory')}</div>
                )}

                {report.services.length > 0 ? (
                  <section>
                    <SectionTitle title={t('fluids.view.services')} />
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('fluids.services.service')}</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">{t('fluids.services.hrsPerDay')}</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">{t('fluids.services.quantity')}</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">{t('fluids.services.daysToday')}</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">{t('fluids.services.daysTotal')}</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">{t('fluids.services.dailyCost')}</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">{t('fluids.services.accumCost')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {report.services.map((svc, i) => (
                            <tr key={i}>
                              <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300 font-medium">{fmtStr(svc.serviceName)}</td>
                              <td className="px-3 py-1.5 text-center">{fmtNum(svc.hoursPerDay)}</td>
                              <td className="px-3 py-1.5 text-center">{fmtNum(svc.quantity)}</td>
                              <td className="px-3 py-1.5 text-center">{fmtNum(svc.daysToday)}</td>
                              <td className="px-3 py-1.5 text-center">{fmtNum(svc.daysTotal)}</td>
                              <td className="px-3 py-1.5 text-center">{fmtNum(svc.dailyCost)}</td>
                              <td className="px-3 py-1.5 text-center">{fmtNum(svc.accumulatedCost)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">{t('fluids.view.noServices')}</div>
                )}
              </div>
            )}

            {/* ── Tab 3: Volumetría ────────────────────────────────── */}
            {activeTab === 'tab3' && (
              <div className="space-y-8">
                {/* Tanques */}
                {report.tanks.length > 0 ? (
                  <section>
                    <SectionTitle title={t('fluids.view.tanks')} />
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('fluids.tanks.name')}</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">{t('fluids.tanks.system')}</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">{t('fluids.tanks.volumeBls')}</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">{t('fluids.tanks.lpg')}</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">{t('fluids.tanks.fluidType')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {report.tanks.map((tk, i) => (
                            <tr key={i}>
                              <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300 font-medium">{fmtStr(tk.name)}</td>
                              <td className="px-3 py-1.5 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                  tk.systemStatus === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                  tk.systemStatus === 'reserve' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                  'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                }`}>
                                  {tk.systemStatus === 'active' ? t('fluids.tanks.active') : tk.systemStatus === 'reserve' ? t('fluids.tanks.reserve') : t('fluids.tanks.contingency')}
                                </span>
                              </td>
                              <td className="px-3 py-1.5 text-center">{fmtNum(tk.volumeBls)}</td>
                              <td className="px-3 py-1.5 text-center">{fmtNum(tk.lpg)}</td>
                              <td className="px-3 py-1.5 text-center">{fmtStr(tk.fluidType)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-100 dark:bg-gray-800 font-semibold text-sm">
                          <tr>
                            <td colSpan={2} className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{t('fluids.tanks.totals')}</td>
                            <td className="px-3 py-2 text-center text-gray-900 dark:text-gray-100">
                              {report.tanks.reduce((sum, tk) => sum + (tk.volumeBls || 0), 0).toFixed(1)}
                            </td>
                            <td colSpan={2} />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </section>
                ) : (
                  <div className="text-center py-8 text-gray-500">{t('fluids.view.noTanks')}</div>
                )}

                {/* Vol Stats */}
                {report.volStats && (
                  <section>
                    <SectionTitle title={t('fluids.view.volStats')} />
                    {([
                      {
                        title: t('fluids.volStats.wellVolumes'), color: 'blue',
                        fields: [
                          [t('fluids.volStats.capSarta'), 'volCapSarta'], [t('fluids.volStats.despSarta'), 'volDespSarta'], [t('fluids.volStats.casing'), 'volRevestidor'],
                          [t('fluids.volStats.openHole'), 'volHoyoDesnudo'], [t('fluids.volStats.wellNoPipe'), 'volPozoSinTuberia'],
                          [t('fluids.volStats.wellWithPipe'), 'volPozoConTuberia'], [t('fluids.volStats.activeSystem'), 'volSistemaActivo'],
                          [t('fluids.volStats.reserveSystem'), 'volSistemaReserva'], [t('fluids.volStats.contingency'), 'volSistemaContingencia'],
                          [t('fluids.volStats.abandonedHole'), 'volHoyoAbandonado'],
                        ],
                      },
                      {
                        title: t('fluids.volStats.addedVolumes'), color: 'green',
                        fields: [
                          [t('fluids.volStats.waterToday'), 'volAguaAgregadoHoy'], [t('fluids.volStats.waterAccum'), 'volAguaAgregadoAcum'],
                          [t('fluids.volStats.productsToday'), 'volProductosHoy'], [t('fluids.volStats.productsAccum'), 'volProductosAcum'],
                          [t('fluids.volStats.oilAccum'), 'volAceiteAcum'], [t('fluids.volStats.receivedToday'), 'volRecibidoHoy'], [t('fluids.volStats.receivedAccum'), 'volRecibidoAcum'],
                          [t('fluids.volStats.processedToday'), 'volProcesadoHoy'], [t('fluids.volStats.processedAccum'), 'volProcesadoAcum'],
                          [t('fluids.volStats.handledToday'), 'volManejadoHoy'], [t('fluids.volStats.totalAddedToday'), 'volTotalAgregadoHoy'],
                          [t('fluids.volStats.totalAddedAccum'), 'volTotalAgregadoAcum'], [t('fluids.volStats.transferredOut'), 'volTransferidoFuera'],
                        ],
                      },
                      {
                        title: t('fluids.volStats.losses'), color: 'red',
                        fields: [
                          [t('fluids.volStats.ecsToday'), 'volPerdidoEcs'], [t('fluids.volStats.ecsAccum'), 'volPerdidoEcsAcum'],
                          [t('fluids.volStats.wettingToday'), 'volPerdidoHumectacion'], [t('fluids.volStats.wettingAccum'), 'volPerdidoHumectacionAcum'],
                          [t('fluids.volStats.formationToday'), 'volPerdidoFormacionHoy'], [t('fluids.volStats.formationAccum'), 'volPerdidoFormacionAcum'],
                          [t('fluids.volStats.permeabilityToday'), 'volPerdidoPermeabilidad'], [t('fluids.volStats.permeabilityAccum'), 'volPerdidoPermeabilidadAcum'],
                          [t('fluids.volStats.discarded'), 'volDescartado'], [t('fluids.volStats.trapped'), 'volEntrampado'],
                          [t('fluids.volStats.surfaceToday'), 'volPerdidoSuperficie'], [t('fluids.volStats.surfaceAccum'), 'volPerdidoSuperficieAcum'],
                          [t('fluids.volStats.otherLosses'), 'volOtrasPerdidas'], [t('fluids.volStats.totalLostToday'), 'volTotalPerdidoHoy'],
                          [t('fluids.volStats.totalLostAccum'), 'volTotalPerdidoAcum'],
                        ],
                      },
                      {
                        title: t('fluids.volStats.dailyBalance'), color: 'purple',
                        fields: [
                          [t('fluids.volStats.dailyInitial'), 'volInicialDiario'], [t('fluids.volStats.dailyFinal'), 'volFinalDiario'],
                        ],
                      },
                    ] as Array<{ title: string; color: string; fields: [string, string][] }>).map((group) => {
                      const colorMap: Record<string, string> = {
                        blue: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800',
                        green: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800',
                        red: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800',
                        purple: 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800',
                      };
                      const titleColor: Record<string, string> = {
                        blue: 'text-blue-700 dark:text-blue-400',
                        green: 'text-green-700 dark:text-green-400',
                        red: 'text-red-700 dark:text-red-400',
                        purple: 'text-purple-700 dark:text-purple-400',
                      };
                      return (
                        <div key={group.title} className={`rounded-lg border p-4 mb-4 ${colorMap[group.color]}`}>
                          <h5 className={`text-sm font-semibold ${titleColor[group.color]} mb-3`}>{group.title}</h5>
                          <dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            {group.fields.map(([label, key]) => (
                              <FieldDisplay key={key} label={label} value={fmtNum(report.volStats![key])} />
                            ))}
                          </dl>
                        </div>
                      );
                    })}
                  </section>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
