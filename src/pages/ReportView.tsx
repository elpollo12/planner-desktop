import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { MainLayout } from '../components/layout';
import { Button, Card, ReportStatusBadge, SectionCarousel } from '../components/ui';
import { ArrowLeft, Edit, CheckCircle, XCircle, FileDown, FileSpreadsheet, Calendar, User as UserIcon, Send, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useModal } from '../store/modalStore';
import {
  reportsApi,
  crewApi,
  bitRecordsApi,
  drillStringApi,
  timeDistributionApi,
  mudApi,
  drillingParamsApi,
  deviationApi,
  operationsLogApi,
  usersApi,
} from '../lib/api';
import { saveDDRReport } from '../lib/reportExport';
import type { ReportBranding } from '../lib/logisticsExport';
import ApproveReportModal from '../components/modals/ApproveReportModal';
import RejectReportModal from '../components/modals/RejectReportModal';
import ReviewTimeline from '../components/reports/ReviewTimeline';
import { backgroundPush } from '../lib/syncHelper';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { DEFAULT_APP_SETTINGS } from '../types/appSettings';
import { toast } from '../lib/toast';
import { formatDateDMY, formatDateTime } from '../lib/dateUtils';
import { canEditReport, canApproveReport, canSubmitReport } from '../lib/reportPermissions';
import type {
  Report,
  CrewShift,
  BitRecord,
  DrillStringComponent,
  TimeDistribution,
  MudRecord,
  MudAdditive,
  DrillingParameters,
  DeviationHistory,
  OperationsLog,
} from '../types/report';
import { SHIFT_LABELS } from '../types/report';

// ── Shift sort helper ──────────────────────────────────────────────────────
const SHIFT_ORDER: Record<string, number> = { morning: 0, afternoon: 1, night: 2 };
function sortByShift<T extends { shift?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (SHIFT_ORDER[a.shift ?? ''] ?? 99) - (SHIFT_ORDER[b.shift ?? ''] ?? 99));
}

export default function ReportView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { sessionToken, user } = useAuthStore();
  const { openModal, closeModal } = useModal();

  // Determine back destination based on ?from query param
  const fromPage = searchParams.get('from');
  const backPath = fromPage === 'approvals' ? '/approvals' : '/reports';

  const [report, setReport] = useState<Report | null>(null);
  const [crewShifts, setCrewShifts] = useState<CrewShift[]>([]);
  const [bitRecords, setBitRecords] = useState<BitRecord[]>([]);
  const [drillStringComponents, setDrillStringComponents] = useState<DrillStringComponent[]>([]);
  const [timeDistributions, setTimeDistributions] = useState<TimeDistribution[]>([]);
  const [mudRecords, setMudRecords] = useState<MudRecord[]>([]);
  const [mudAdditives, setMudAdditives] = useState<MudAdditive[]>([]);
  const [drillingParams, setDrillingParams] = useState<DrillingParameters[]>([]);
  const [deviationHistory, setDeviationHistory] = useState<DeviationHistory[]>([]);
  const [operationsLog, setOperationsLog] = useState<OperationsLog[]>([]);
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0);
  const [viewTab, setViewTab] = useState<'report' | 'review'>('report');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    setAccessDenied(false);
    setReport(null);
    loadReport();
  }, [id]);

  const loadReport = async () => {
    if (!sessionToken || !id) return;

    setLoading(true);
    try {
      const reportData = await reportsApi.get(sessionToken, id);
      setReport(reportData);

      const results = await Promise.all([
        crewApi.listShifts(sessionToken, id).catch(() => []),
        bitRecordsApi.list(sessionToken, id).catch(() => []),
        drillStringApi.list(sessionToken, id).catch(() => []),
        timeDistributionApi.list(sessionToken, id).catch(() => []),
        mudApi.listRecords(sessionToken, id).catch(() => []),
        mudApi.listAdditives(sessionToken, id).catch(() => []),
        drillingParamsApi.list(sessionToken, id).catch(() => []),
        deviationApi.list(sessionToken, id).catch(() => []),
        operationsLogApi.list(sessionToken, id).catch(() => []),
      ]);

      setCrewShifts(sortByShift(results[0] as CrewShift[]));
      setBitRecords(results[1] as BitRecord[]);
      setDrillStringComponents(results[2] as DrillStringComponent[]);
      setTimeDistributions(results[3] as TimeDistribution[]);
      setMudRecords(sortByShift(results[4] as MudRecord[]));
      setMudAdditives(sortByShift(results[5] as MudAdditive[]));
      setDrillingParams(sortByShift(results[6] as DrillingParameters[]));
      setDeviationHistory(results[7] as DeviationHistory[]);
      setOperationsLog(sortByShift(results[8] as OperationsLog[]));

      // Resolve creator name
      if (reportData.createdBy) {
        usersApi.get(sessionToken, reportData.createdBy)
          .then((u) => setCreatorName(u.fullName || u.username))
          .catch(() => setCreatorName(null));
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('Permiso denegado') || errorMsg.includes('Permission denied')) {
        setAccessDenied(true);
      } else {
        console.error('Error loading report:', error);
        toast.error('Error al cargar el reporte');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleApprove = () => {
    if (!sessionToken || !id || !report) return;
    const label = `DDR #${report.reportNumber} · ${report.wellNumber || 'Sin pozo'} · ${report.rigNumber || 'Sin taladro'}`;
    openModal(
      <ApproveReportModal
        reportLabel={label}
        onConfirm={async (comment?: string) => {
          await reportsApi.approve(sessionToken, id, comment);
          closeModal();
          toast.success('Reporte aprobado exitosamente');
          backgroundPush(sessionToken);
          setReviewRefreshKey((k) => k + 1);
          loadReport();
        }}
      />,
      { title: 'Aprobar Reporte', size: 'md' },
    );
  };

  const handleReject = () => {
    if (!sessionToken || !id || !report) return;
    const label = `DDR #${report.reportNumber} · ${report.wellNumber || 'Sin pozo'} · ${report.rigNumber || 'Sin taladro'}`;
    openModal(
      <RejectReportModal
        reportLabel={label}
        onConfirm={async (reason) => {
          await reportsApi.reject(sessionToken, id, reason);
          closeModal();
          toast.success('Reporte rechazado');
          backgroundPush(sessionToken);
          setReviewRefreshKey((k) => k + 1);
          loadReport();
        }}
      />,
      { title: 'Rechazar Reporte', size: 'md' },
    );
  };

  const handleSubmit = async () => {
    if (!sessionToken || !id || actionLoading) return;

    // Guard: only draft or rejected reports can be submitted from this view
    if (report?.status !== 'draft' && report?.status !== 'rejected') {
      toast.error('Solo reportes en borrador o rechazados pueden ser enviados');
      return;
    }

    setActionLoading(true);
    try {
      // If rejected, reopen to draft first so backend accepts the submit
      if (report.status === 'rejected') {
        await reportsApi.reopen(sessionToken, id);
      }
      await reportsApi.submit(sessionToken, id);
      toast.success('Reporte enviado para aprobación');
      backgroundPush(sessionToken);
      loadReport();
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Error al enviar el reporte');
    } finally {
      setActionLoading(false);
    }
  };

  const canEdit = () => canEditReport(user, report);
  const canApprove = () => canApproveReport(user, report);
  const canSubmit = () => canSubmitReport(user, report);

  const appSettings = useAppSettingsStore((s) => s.settings);

  const getBranding = (): ReportBranding => ({
    logoBase64: appSettings?.logoPath ?? null,
    primaryColor: appSettings?.primaryColor ?? DEFAULT_APP_SETTINGS.primaryColor,
    rigName: report?.rigNumber ?? '',
    userName: user?.fullName ?? '',
  });

  const handleExport = async (format: 'pdf' | 'excel' | 'both') => {
    if (!report) { toast.warning('No hay información del reporte para exportar'); return; }
    try {
      const result = await saveDDRReport(
        {
          data: { report, crewShifts, bitRecords, timeDistributions, mudRecords, mudAdditives, drillingParams, deviationHistory, operationsLog, drillStringComponents },
          branding: getBranding(),
        },
        format,
      );
      if (result.saved) {
        toast.success(`${format === 'both' ? 'Reportes guardados' : format === 'pdf' ? 'PDF guardado' : 'Excel guardado'} exitosamente`);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error(`Error al exportar: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  // ── Loading / Not found ──────────────────────────────────────────────────

  if (loading) {
    return (
      <MainLayout title="Cargando...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
        </div>
      </MainLayout>
    );
  }

  if (accessDenied) {
    return (
      <MainLayout title="Acceso restringido" subtitle="No tienes permiso para ver este reporte">
        <div className="flex items-center justify-center ">
          <Card className="text-center w-full">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                <ShieldAlert size={32} className="text-amber-500" />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Acceso restringido
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              No tienes permiso para ver este reporte. Es posible que ya no tengas acceso al taladro asociado.
            </p>
            <Button onClick={() => navigate('/dashboard')} icon={<ArrowLeft size={16} />}>
              Volver al inicio
            </Button>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (!report) {
    return (
      <MainLayout title="Reporte no encontrado">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-500 mb-4">Reporte no encontrado</p>
            <Button onClick={() => navigate(backPath)}>Volver</Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <MainLayout
      title={`Reporte DDR #${report.reportNumber}`}
      subtitle={`${report.wellNumber || 'Sin pozo'} · ${report.rigNumber || 'Sin taladro'}`}
      headerActions={
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => navigate(backPath)} icon={<ArrowLeft size={16} />}>
            Volver
          </Button>
          <Button variant="primary" size='sm'  onClick={() => handleExport('pdf')} icon={<FileDown size={16} />}
            className='bg-red-600! hover:bg-red-400! border-2 hover:border-white!'
          >
            PDF
          </Button>
          <Button variant="primary" size='sm' onClick={() => handleExport('excel')} icon={<FileSpreadsheet size={16} />}
            className='bg-green-600! hover:bg-green-400! border-2 hover:border-white!'
          >
            Excel
          </Button>
        </div>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* ================================================================
            REPORT HERO — Title, metadata & status
            ================================================================ */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          {/* Left: primary identification */}
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                {report.wellNumber || 'Sin pozo'}
              </h2>
              <ReportStatusBadge status={report.status} size="md" />
            </div>

            <p className="text-base text-gray-600 dark:text-gray-400">
              Taladro <span className="font-semibold text-gray-800 dark:text-gray-200">{report.rigNumber || '-'}</span>
              {report.fieldDistrict && (
                <> · {report.fieldDistrict}</>
              )}
            </p>

            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 pt-1">
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={14} />
                Fecha reporte: {formatDateDMY(report.reportDate)}
              </span>
              <span className="hidden sm:inline text-gray-300 dark:text-gray-600">|</span>
              <span className="hidden sm:inline">
                Creado: {formatDateTime(report.createdAt)}
              </span>
              {report.updatedAt && report.updatedAt !== report.createdAt && (
                <>
                  <span className="hidden sm:inline text-gray-300 dark:text-gray-600">|</span>
                  <span className="hidden sm:inline">
                    Editado: {formatDateTime(report.updatedAt)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right: creator */}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 md:text-right shrink-0">
            <UserIcon size={14} className="text-gray-400" />
            <span>Creado por <span className="font-medium text-gray-700 dark:text-gray-300">{creatorName || report.createdBy || '-'}</span></span>
          </div>
        </div>

        {/* ================================================================
            TAB BAR + ACTION BUTTONS
            ================================================================ */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
          {/* Tabs — left */}
          <div className="flex gap-1">
            {[
              { key: 'report' as const, label: 'Reporte' },
              { key: 'review' as const, label: 'Revisión' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setViewTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b transition-colors cursor-pointer ${
                  viewTab === tab.key
                    ? 'border-primary-500! text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Action buttons — right */}
          <div className="flex items-center gap-2 pb-1">
            {canEdit() && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/reports/edit/${id}`)} icon={<Edit size={14} />}>
                Editar
              </Button>
            )}
            {canSubmit() && (
              <Button variant="primary" size="sm" onClick={handleSubmit} disabled={actionLoading} loading={actionLoading} icon={<Send size={14} />}>
                Enviar
              </Button>
            )}
            {canApprove() && (
              <>
                <Button variant="success" size="sm" onClick={handleApprove} icon={<CheckCircle size={14} />}>
                  Aprobar
                </Button>
                <Button variant="danger" size="sm" onClick={handleReject} icon={<XCircle size={14} />}>
                  Rechazar
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ================================================================
            TAB: REPORTE — Report data sections
            ================================================================ */}
        {viewTab === 'report' && (<>

        {/* ================================================================
            GENERAL DATA CARDS
            ================================================================ */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Datos Generales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <DataField label="Número API" value={report.apiNumber} />
              <DataField label="Contrato" value={report.contract} />
              <DataField label="Contratista" value={report.contractor} />
              <DataField label="Operador" value={report.operator} />
              <DataField label="Supervisor 24h" value={report.supervisor24h} />
            </div>
          </div>
        </Card>

        {/* ================================================================
            CREW SHIFTS — Carousel when multiple shifts
            ================================================================ */}
        {crewShifts.length > 0 && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Cuadrilla por Turno</h3>
              <SectionCarousel
                slides={crewShifts.map((shift) => ({
                  label: `${SHIFT_LABELS[shift.shift]} (${shift.shiftStart || '?'} - ${shift.shiftEnd || '?'})`,
                  content: (
                    <CrewShiftTable shift={shift} />
                  ),
                }))}
              />
            </div>
          </Card>
        )}

        {/* ================================================================
            TIME DISTRIBUTION
            ================================================================ */}
        {timeDistributions.length > 0 && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Distribución de Tiempo</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <TH align="left">Código</TH>
                      <TH>Mañana (hrs)</TH>
                      <TH>Tarde (hrs)</TH>
                      <TH>Noche (hrs)</TH>
                      <TH>Total</TH>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-50 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {timeDistributions.map((td, idx) => (
                      <tr key={idx}>
                        <TD align="left">{td.operationCode?.code || td.operationCodeId}</TD>
                        <TD>{td.hoursShift1}</TD>
                        <TD>{td.hoursShift2}</TD>
                        <TD>{td.hoursShift3}</TD>
                        <TD className="font-medium">{td.hoursShift1 + td.hoursShift2 + td.hoursShift3}h</TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}

        {/* ================================================================
            BIT RECORDS — Carousel when multiple
            ================================================================ */}
        {bitRecords.length > 0 && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Records de Mechas</h3>
              <SectionCarousel
                slides={bitRecords.map((bit, idx) => ({
                  label: `Mecha #${idx + 1}`,
                  content: (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <DataField label="Tamaño" value={bit.size} />
                      <DataField label="Marca" value={bit.brand} />
                      <DataField label="Tipo" value={bit.bitType} />
                      <DataField label="Serial" value={bit.serialNumber} />
                      <DataField label="Jets" value={bit.jets} />
                      <DataField label="TFA" value={bit.tfa} />
                      <DataField label="Prof. Entrada" value={bit.depthIn} />
                      <DataField label="Prof. Salida" value={bit.depthOut} />
                      <DataField label="Metraje" value={bit.footage} />
                      <DataField label="Horas Total" value={bit.hoursTotal?.toString()} />
                    </div>
                  ),
                }))}
              />
            </div>
          </Card>
        )}

        {/* ================================================================
            MUD RECORDS — Carousel by shift, table per shift
            ================================================================ */}
        {mudRecords.length > 0 && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Propiedades del Lodo</h3>
              <SectionCarousel
                slides={groupMudRecordsByShift(mudRecords)}
              />
            </div>
          </Card>
        )}

        {/* ================================================================
            MUD ADDITIVES
            ================================================================ */}
        {mudAdditives.length > 0 && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Aditivos del Lodo</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <TH align="left">Turno</TH>
                      <TH align="left">Tipo</TH>
                      <TH align="left">Cantidad</TH>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-50 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {mudAdditives.map((additive, idx) => (
                      <tr key={idx}>
                        <TD align="left">{additive.shift ? SHIFT_LABELS[additive.shift] : '-'}</TD>
                        <TD align="left">{additive.additiveType || '-'}</TD>
                        <TD align="left">{additive.quantity || '-'}</TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}

        {/* ================================================================
            DRILLING PARAMETERS — Carousel when multiple
            ================================================================ */}
        {drillingParams.length > 0 && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Parámetros de Perforación</h3>
              <SectionCarousel
                slides={drillingParams.map((param, idx) => ({
                  label: `${param.shift ? SHIFT_LABELS[param.shift] : `#${idx + 1}`}${param.depthFrom && param.depthTo ? ` (${param.depthFrom}–${param.depthTo} ft)` : ''}`,
                  content: (
                    <div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <DataField label="RPM" value={param.rotaryRpm} />
                        <DataField label="Peso Mecha" value={param.bitWeight} />
                        <DataField label="Presión" value={param.pumpPressure} />
                        <DataField label="GPM" value={param.totalGpm} />
                        <DataField label="# Bomba" value={param.pumpNumber} />
                        <DataField label="Liner Bomba" value={param.pumpLiner} />
                        <DataField label="SPM" value={param.pumpSpm} />
                        <DataField label="Método" value={param.methodUsed} />
                      </div>
                      {param.lithologyNotes && (
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notas de Litología</p>
                          <p className="text-sm text-gray-900 dark:text-gray-100">{param.lithologyNotes}</p>
                        </div>
                      )}
                    </div>
                  ),
                }))}
              />
            </div>
          </Card>
        )}

        {/* ================================================================
            DEVIATION HISTORY
            ================================================================ */}
        {deviationHistory.length > 0 && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Historial de Desviación</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <TH align="left">Profundidad (ft)</TH>
                      <TH align="left">Desviación (°)</TH>
                      <TH align="left">Dirección</TH>
                      <TH align="left">TVO (ft)</TH>
                      <TH align="left">Desp. Horizontal (ft)</TH>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-50 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {deviationHistory.map((dev, idx) => (
                      <tr key={idx}>
                        <TD align="left">{dev.depth || '-'}</TD>
                        <TD align="left">{dev.deviation || '-'}</TD>
                        <TD align="left">{dev.direction || '-'}</TD>
                        <TD align="left">{dev.tvo || '-'}</TD>
                        <TD align="left">{dev.horizontalDisplacement || '-'}</TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}

        {/* ================================================================
            OPERATIONS LOG — Carousel when multiple
            ================================================================ */}
        {operationsLog.length > 0 && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Log de Operaciones</h3>
              <SectionCarousel
                slides={operationsLog.map((op, idx) => ({
                  label: `${op.shift ? SHIFT_LABELS[op.shift] : ''} #${idx + 1}`,
                  content: (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        {op.operationCode && (
                          <span className="font-medium text-gray-900 dark:text-gray-100">{op.operationCode}</span>
                        )}
                        {op.timeFrom && op.timeTo && (
                          <span>{op.timeFrom} - {op.timeTo}</span>
                        )}
                        {op.duration && (
                          <span>Duración: {op.duration}</span>
                        )}
                      </div>
                      {op.details && (
                        <p className="text-sm text-gray-700 dark:text-gray-300">{op.details}</p>
                      )}
                    </div>
                  ),
                }))}
              />
            </div>
          </Card>
        )}

        {/* ================================================================
            DRILL STRING COMPONENTS
            ================================================================ */}
        {drillStringComponents.length > 0 && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Sarta de Perforación</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <TH align="left">N°</TH>
                      <TH align="left">Pieza</TH>
                      <TH>Longitud (ft)</TH>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-50 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {drillStringComponents.map((comp) => (
                      <tr key={comp.id}>
                        <TD align="left">{comp.entryNumber}</TD>
                        <TD align="left">{comp.pieceName}</TD>
                        <TD>{comp.length != null ? comp.length : '-'}</TD>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <TD align="left" className="font-semibold">Total</TD>
                      <TD align="left" className="font-semibold">{drillStringComponents.length} piezas</TD>
                      <TD className="font-semibold">
                        {drillStringComponents.reduce((sum, c) => sum + (c.length || 0), 0).toFixed(2)} ft
                      </TD>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </Card>
        )}

        </>)}

        {/* ================================================================
            TAB: REVISIÓN — Review & approval history
            ================================================================ */}
        {viewTab === 'review' && (
          <div className="space-y-6">
            {/* Rejection reason banner */}
            {report.status === 'rejected' && report.rejectionReason && (
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <XCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">Motivo del rechazo</p>
                  <p className="text-sm text-red-700 dark:text-red-400 mt-1 whitespace-pre-wrap">{report.rejectionReason}</p>
                </div>
              </div>
            )}

            {/* Status summary */}
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Estado del Reporte</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <DataField label="Estado Actual" value={
                    report.status === 'draft' ? 'Borrador' :
                    report.status === 'submitted' ? 'Enviado — Pendiente de aprobación' :
                    report.status === 'approved' ? 'Aprobado' :
                    report.status === 'rejected' ? 'Rechazado' : report.status
                  } />
                  {report.submittedAt && <DataField label="Fecha de Envío" value={formatDateTime(report.submittedAt)} />}
                  {report.approvedAt && <DataField label="Fecha de Aprobación" value={formatDateTime(report.approvedAt)} />}
                  {report.rejectedAt && <DataField label="Fecha de Rechazo" value={formatDateTime(report.rejectedAt)} />}
                </div>
              </div>
            </Card>

            {/* Timeline */}
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Historial de Revisiones</h3>
                <ReviewTimeline reportId={report.id} refreshKey={reviewRefreshKey} />
              </div>
            </Card>
          </div>
        )}

      </div>
    </MainLayout>
  );
}

// ============================================================================
// SMALL HELPER COMPONENTS (private to this file)
// ============================================================================

/** Reusable label + value pair */
function DataField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
      <p className="text-base font-medium text-gray-900 dark:text-gray-100">{value || '-'}</p>
    </div>
  );
}

/** Crew shift table rendered for each carousel slide */
function CrewShiftTable({ shift }: { shift: CrewShift }) {
  if (!shift.members || shift.members.length === 0) {
    return <p className="text-sm text-gray-500">No hay miembros registrados</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <TH align="left">Posición</TH>
            <TH align="left">CI</TH>
            <TH align="left">Nombre</TH>
            <TH align="left">Horas</TH>
          </tr>
        </thead>
        <tbody className="bg-gray-50 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {shift.members.map((member, mIdx) => (
            <tr key={mIdx}>
              <TD align="left">{member.position}</TD>
              <TD align="left">{member.personnelCi || member.ci || '-'}</TD>
              <TD align="left">{member.personnelName || member.name || '-'}</TD>
              <TD align="left">{member.hours || '-'}</TD>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Table header cell */
function TH({ children, align = 'center' }: { children: React.ReactNode; align?: 'left' | 'center' }) {
  return (
    <th className={`px-4 py-2 text-${align} text-xs font-medium text-gray-500 dark:text-gray-400 uppercase`}>
      {children}
    </th>
  );
}

/** Table data cell */
function TD({ children, align = 'center', className = '' }: { children: React.ReactNode; align?: 'left' | 'center'; className?: string }) {
  return (
    <td className={`px-4 py-2 text-sm text-gray-900 dark:text-gray-100 text-${align} ${className}`}>
      {children}
    </td>
  );
}

/** Group mud records by shift and return carousel slides with a table each */
function groupMudRecordsByShift(records: MudRecord[]) {
  const SHIFT_ORDER: Array<MudRecord['shift']> = ['morning', 'afternoon', 'night'];

  const grouped = new Map<string, MudRecord[]>();
  for (const r of records) {
    const key = r.shift || 'unknown';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  }

  // Build slides in shift order, then append any without a shift
  const slides: Array<{ label: string; content: React.ReactNode }> = [];

  for (const shift of SHIFT_ORDER) {
    const items = grouped.get(shift!);
    if (!items || items.length === 0) continue;
    slides.push({
      label: SHIFT_LABELS[shift!],
      content: <MudRecordsTable records={items} />,
    });
    grouped.delete(shift!);
  }

  // Remaining (records without a recognised shift)
  for (const [key, items] of grouped) {
    slides.push({
      label: key === 'unknown' ? 'Sin turno' : key,
      content: <MudRecordsTable records={items} />,
    });
  }

  return slides;
}

/** Table of mud records for a single shift */
function MudRecordsTable({ records }: { records: MudRecord[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <TH align="left">Hora</TH>
            <TH>Peso (ppg)</TH>
            <TH>Visc. (seg)</TH>
            <TH>PVP (cps)</TH>
            <TH>Geles</TH>
            <TH>Filtrado</TH>
            <TH>pH</TH>
            <TH>Sólidos</TH>
          </tr>
        </thead>
        <tbody className="bg-gray-50 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {records.map((mud, idx) => (
            <tr key={idx}>
              <TD align="left">{mud.hour || '-'}</TD>
              <TD>{mud.weight || '-'}</TD>
              <TD>{mud.viscosity || '-'}</TD>
              <TD>{mud.pvp || '-'}</TD>
              <TD>{mud.gels || '-'}</TD>
              <TD>{mud.filtrate || '-'}</TD>
              <TD>{mud.ph || '-'}</TD>
              <TD>{mud.solids || '-'}</TD>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
