import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '../components/layout';
import { Button, Card, ReportStatusBadge, SectionCarousel } from '../components/ui';
import { ArrowLeft, Edit, CheckCircle, XCircle, FileDown, FileSpreadsheet, Calendar, User as UserIcon, Send, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useModal } from '../store/modalStore';
import {
  reportsApi, crewApi, bitRecordsApi, drillStringApi,
  timeDistributionApi, mudApi, drillingParamsApi,
  deviationApi, operationsLogApi, usersApi,
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
  Report, CrewShift, BitRecord, DrillStringComponent,
  TimeDistribution, MudRecord, MudAdditive,
  DrillingParameters, DeviationHistory, OperationsLog,
} from '../types/report';
import i18n from '../lib/i18n';

const SHIFT_ORDER: Record<string, number> = { morning: 0, afternoon: 1, night: 2 };
function sortByShift<T extends { shift?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (SHIFT_ORDER[a.shift ?? ''] ?? 99) - (SHIFT_ORDER[b.shift ?? ''] ?? 99));
}

const creatorNameCache = new Map<string, string>();

export default function ReportView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { sessionToken, user } = useAuthStore();
  const { openModal, closeModal } = useModal();
  const { t } = useTranslation();

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
  const resolveAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setAccessDenied(false);
    setReport(null);
    setCreatorName(null);
    loadReport();
  }, [id]);

  const resolveCreatorName = async (createdBy: string) => {
    resolveAbortRef.current?.abort();
    const controller = new AbortController();
    resolveAbortRef.current = controller;

    if (user && createdBy === user.id) {
      setCreatorName(user.fullName || user.username);
      return;
    }
    if (creatorNameCache.has(createdBy)) {
      setCreatorName(creatorNameCache.get(createdBy)!);
      return;
    }
    try {
      if (!sessionToken) return;
      const u = await usersApi.get(sessionToken, createdBy);
      if (controller.signal.aborted) return;
      const name = u.fullName || u.username;
      creatorNameCache.set(createdBy, name);
      setCreatorName(name);
    } catch (err) {
      if (controller.signal.aborted) return;
      console.warn('[ReportView] Could not resolve creator name for', createdBy, err);
      setCreatorName(t('reports.view.deletedUser'));
    }
  };

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
      if (reportData.createdBy) resolveCreatorName(reportData.createdBy);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('Permiso denegado') || errorMsg.includes('Permission denied')) {
        setAccessDenied(true);
      } else {
        console.error('Error loading report:', error);
        toast.error(t('reports.view.errorLoading'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () => {
    if (!sessionToken || !id || !report) return;
    const label = `DDR #${report.reportNumber} · ${report.wellNumber || t('reports.view.noWell')} · ${report.rigNumber || t('reports.view.noRig')}`;
    openModal(
      <ApproveReportModal reportLabel={label} onConfirm={async (comment?: string) => {
        await reportsApi.approve(sessionToken, id, comment);
        closeModal();
        toast.success(t('reports.view.approvedSuccess'));
        backgroundPush(sessionToken);
        setReviewRefreshKey((k) => k + 1);
        loadReport();
      }} />,
      { title: t('reports.view.approveModalTitle'), size: 'md' },
    );
  };

  const handleReject = () => {
    if (!sessionToken || !id || !report) return;
    const label = `DDR #${report.reportNumber} · ${report.wellNumber || t('reports.view.noWell')} · ${report.rigNumber || t('reports.view.noRig')}`;
    openModal(
      <RejectReportModal reportLabel={label} onConfirm={async (reason) => {
        await reportsApi.reject(sessionToken, id, reason);
        closeModal();
        toast.success(t('reports.view.rejectedSuccess'));
        backgroundPush(sessionToken);
        setReviewRefreshKey((k) => k + 1);
        loadReport();
      }} />,
      { title: t('reports.view.rejectModalTitle'), size: 'md' },
    );
  };

  const handleSubmit = async () => {
    if (!sessionToken || !id || actionLoading) return;
    if (report?.status !== 'draft' && report?.status !== 'rejected') {
      toast.error(t('reports.view.submitOnlyDraftOrRejected'));
      return;
    }
    setActionLoading(true);
    try {
      if (report.status === 'rejected') await reportsApi.reopen(sessionToken, id);
      await reportsApi.submit(sessionToken, id);
      toast.success(t('reports.view.submittedForApproval'));
      backgroundPush(sessionToken);
      loadReport();
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error(t('reports.view.errorSubmitting'));
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
    if (!report) { toast.warning(t('reports.view.noExportData')); return; }
    try {
      const result = await saveDDRReport({
        data: { report, crewShifts, bitRecords, timeDistributions, mudRecords, mudAdditives, drillingParams, deviationHistory, operationsLog, drillStringComponents },
        branding: getBranding(),
      }, format);
      if (result.saved) toast.success(format === 'both' ? t('reports.view.bothSaved') : format === 'pdf' ? t('reports.view.pdfSaved') : t('reports.view.excelSaved'));
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error(t('reports.view.exportError', { error: error instanceof Error ? error.message : t('reports.view.unknownError') }));
    }
  };

  if (loading) return (
    <MainLayout title={t('reports.view.loading')}>
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    </MainLayout>
  );

  if (accessDenied) return (
    <MainLayout title={t('reports.view.accessDenied')} subtitle={t('reports.view.accessDeniedSubtitle')}>
      <div className="flex items-center justify-center">
        <Card className="text-center w-full">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
              <ShieldAlert size={32} className="text-amber-500" />
            </div>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('reports.view.accessDenied')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {t('reports.view.accessDeniedMsg')}
          </p>
          <Button onClick={() => navigate('/dashboard')} icon={<ArrowLeft size={16} />}>{t('reports.view.backToHome')}</Button>
        </Card>
      </div>
    </MainLayout>
  );

  if (!report) return (
    <MainLayout title={t('reports.view.notFound')}>
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{t('reports.view.notFound')}</p>
          <Button onClick={() => navigate(backPath)}>{t('actions.back')}</Button>
        </div>
      </div>
    </MainLayout>
  );

  return (
    <MainLayout
      title={t('reports.view.reportTitle', { number: report.reportNumber })}
      subtitle={`${report.wellNumber || t('reports.view.noWell')} · ${report.rigNumber || t('reports.view.noRig')}`}
      headerActions={
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => navigate(backPath)} icon={<ArrowLeft size={16} />}>{t('actions.back')}</Button>
          <Button variant="primary" size='sm' onClick={() => handleExport('pdf')} icon={<FileDown size={16} />}
            className='bg-red-600! hover:bg-red-400! border-2 hover:border-white!'>PDF</Button>
          <Button variant="primary" size='sm' onClick={() => handleExport('excel')} icon={<FileSpreadsheet size={16} />}
            className='bg-green-600! hover:bg-green-400! border-2 hover:border-white!'>Excel</Button>
        </div>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* Hero */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{report.wellNumber || t('reports.view.noWell')}</h2>
              <ReportStatusBadge status={report.status} size="md" />
            </div>
            <p className="text-base text-gray-600 dark:text-gray-400">
              {t('reports.view.rig')} <span className="font-semibold text-gray-800 dark:text-gray-200">{report.rigNumber || '-'}</span>
              {report.fieldDistrict && <> · {report.fieldDistrict}</>}
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 pt-1">
              <span className="inline-flex items-center gap-1.5"><Calendar size={14} />{t('reports.view.reportDate')} {formatDateDMY(report.reportDate)}</span>
              <span className="hidden sm:inline text-gray-300 dark:text-gray-600">|</span>
              <span className="hidden sm:inline">{t('reports.view.created')} {formatDateTime(report.createdAt)}</span>
              {report.updatedAt && report.updatedAt !== report.createdAt && (
                <><span className="hidden sm:inline text-gray-300 dark:text-gray-600">|</span>
                <span className="hidden sm:inline">{t('reports.view.edited')} {formatDateTime(report.updatedAt)}</span></>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 md:text-right shrink-0">
            <UserIcon size={14} className="text-gray-400" />
            <span>{t('reports.view.createdBy')}{' '}
              <span className="font-medium text-gray-700 dark:text-gray-300">{creatorName ?? '...'}</span>
            </span>
          </div>
        </div>

        {/* Tabs + action buttons */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-1">
            {([{ key: 'report', label: t('reports.view.tabReport') }, { key: 'review', label: t('reports.view.tabReview') }] as const).map((tab) => (
              <button key={tab.key} onClick={() => setViewTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b transition-colors cursor-pointer ${
                  viewTab === tab.key
                    ? 'border-primary-500! text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}>{tab.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 pb-1">
            {canEdit() && <Button variant="outline" size="sm" onClick={() => navigate(`/reports/edit/${id}`)} icon={<Edit size={14} />}>{t('actions.edit')}</Button>}
            {canSubmit() && <Button variant="primary" size="sm" onClick={handleSubmit} disabled={actionLoading} loading={actionLoading} icon={<Send size={14} />}>{t('actions.send')}</Button>}
            {canApprove() && (<>
              <Button variant="success" size="sm" onClick={handleApprove} icon={<CheckCircle size={14} />}>{t('actions.approve')}</Button>
              <Button variant="danger" size="sm" onClick={handleReject} icon={<XCircle size={14} />}>{t('actions.reject')}</Button>
            </>)}
          </div>
        </div>

        {/* ── TAB: REPORTE ── */}
        {viewTab === 'report' && (<>
          <Card><div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('reports.view.generalData')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <DataField label={t('reports.view.apiNumber')} value={report.apiNumber} />
              <DataField label={t('reports.view.contract')} value={report.contract} />
              <DataField label={t('reports.view.contractor')} value={report.contractor} />
              <DataField label={t('reports.view.operator')} value={report.operator} />
              <DataField label={t('reports.view.supervisor24h')} value={report.supervisor24h} />
            </div>
          </div></Card>

          {crewShifts.length > 0 && <Card><div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('reports.view.crewByShift')}</h3>
            <SectionCarousel slides={crewShifts.map((shift) => ({
              label: `${t(`reports.shiftLabels.${shift.shift}`)} (${shift.shiftStart || '?'} - ${shift.shiftEnd || '?'})`,
              content: <CrewShiftTable shift={shift} />,
            }))} />
          </div></Card>}

          {timeDistributions.length > 0 && <Card><div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('reports.view.timeDistribution')}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded">
                <thead className="bg-gray-50 dark:bg-gray-800"><tr>
                  <TH align="left">{t('reports.view.code')}</TH><TH>{t('reports.view.morningHrs')}</TH><TH>{t('reports.view.afternoonHrs')}</TH><TH>{t('reports.view.nightHrs')}</TH><TH>{t('reports.view.total')}</TH>
                </tr></thead>
                <tbody className="bg-gray-50 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {timeDistributions.map((td, idx) => (
                    <tr key={idx}>
                      <TD align="left">{td.operationCode?.name || td.operationCode?.code || td.operationCodeId}</TD>
                      <TD>{td.hoursShift1}</TD><TD>{td.hoursShift2}</TD><TD>{td.hoursShift3}</TD>
                      <TD className="font-medium">{Number((td.hoursShift1 + td.hoursShift2 + td.hoursShift3).toFixed(1))}h</TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div></Card>}

          {bitRecords.length > 0 && <Card><div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('reports.view.bitRecords')}</h3>
            <SectionCarousel slides={bitRecords.map((bit, idx) => ({
              label: t('reports.view.bitNumber', { number: idx + 1 }),
              content: <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <DataField label={t('reports.view.size')} value={bit.size} /><DataField label={t('reports.view.brand')} value={bit.brand} />
                <DataField label={t('reports.view.type')} value={bit.bitType} /><DataField label={t('reports.view.serial')} value={bit.serialNumber} />
                <DataField label={t('reports.view.jets')} value={bit.jets} /><DataField label={t('reports.view.tfa')} value={bit.tfa} />
                <DataField label={t('reports.view.depthIn')} value={bit.depthIn} /><DataField label={t('reports.view.depthOut')} value={bit.depthOut} />
                <DataField label={t('reports.view.footage')} value={bit.footage} /><DataField label={t('reports.view.hoursTotal')} value={bit.hoursTotal?.toString()} />
              </div>,
            }))} />
          </div></Card>}

          {mudRecords.length > 0 && <Card><div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('reports.view.mudProperties')}</h3>
            <SectionCarousel slides={groupMudRecordsByShift(mudRecords)} />
          </div></Card>}

          {mudAdditives.length > 0 && <Card><div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('reports.view.mudAdditives')}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded">
                <thead className="bg-gray-50 dark:bg-gray-800"><tr>
                  <TH align="left">{t('reports.view.shift')}</TH><TH align="left">{t('reports.view.additiveType')}</TH><TH align="left">{t('reports.view.quantity')}</TH>
                </tr></thead>
                <tbody className="bg-gray-50 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {mudAdditives.map((a, idx) => <tr key={idx}>
                    <TD align="left">{a.shift ? t(`reports.shiftLabels.${a.shift}`) : '-'}</TD>
                    <TD align="left">{a.additiveType || '-'}</TD>
                    <TD align="left">{a.quantity || '-'}</TD>
                  </tr>)}
                </tbody>
              </table>
            </div>
          </div></Card>}

          {drillingParams.length > 0 && <Card><div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('reports.view.drillingParams')}</h3>
            <SectionCarousel slides={drillingParams.map((param, idx) => ({
              label: `${param.shift ? t(`reports.shiftLabels.${param.shift}`) : `#${idx + 1}`}${param.depthFrom && param.depthTo ? ` (${param.depthFrom}–${param.depthTo} ft)` : ''}`,
              content: <div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                  <DataField label={t('reports.view.rpm')} value={param.rotaryRpm} /><DataField label={t('reports.view.bitWeight')} value={param.bitWeight} />
                  <DataField label={t('reports.view.pressure')} value={param.pumpPressure} /><DataField label={t('reports.view.gpm')} value={param.totalGpm} />
                  <DataField label={t('reports.view.pumpNumber')} value={param.pumpNumber} /><DataField label={t('reports.view.pumpLiner')} value={param.pumpLiner} />
                  <DataField label={t('reports.view.spm')} value={param.pumpSpm} /><DataField label={t('reports.view.method')} value={param.methodUsed} />
                </div>
                {param.lithologyNotes && <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('reports.view.lithologyNotes')}</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{param.lithologyNotes}</p>
                </div>}
              </div>,
            }))} />
          </div></Card>}

          {deviationHistory.length > 0 && <Card><div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('reports.view.deviationHistory')}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded">
                <thead className="bg-gray-50 dark:bg-gray-800"><tr>
                  <TH align="left">{t('reports.view.depth')}</TH><TH align="left">{t('reports.view.deviation')}</TH>
                  <TH align="left">{t('reports.view.direction')}</TH><TH align="left">{t('reports.view.tvo')}</TH><TH align="left">{t('reports.view.horizontalDisplacement')}</TH>
                </tr></thead>
                <tbody className="bg-gray-50 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {deviationHistory.map((dev, idx) => <tr key={idx}>
                    <TD align="left">{dev.depth || '-'}</TD><TD align="left">{dev.deviation || '-'}</TD>
                    <TD align="left">{dev.direction || '-'}</TD><TD align="left">{dev.tvo || '-'}</TD>
                    <TD align="left">{dev.horizontalDisplacement || '-'}</TD>
                  </tr>)}
                </tbody>
              </table>
            </div>
          </div></Card>}

          {operationsLog.length > 0 && <Card><div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('reports.view.operationsLog')}</h3>
            <SectionCarousel slides={operationsLog.map((op, idx) => ({
              label: `${op.shift ? t(`reports.shiftLabels.${op.shift}`) : ''} #${idx + 1}`,
              content: <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  {op.operationCode && <span className="font-medium text-gray-900 dark:text-gray-100">{op.operationCode}</span>}
                  {op.timeFrom && op.timeTo && <span>{op.timeFrom} - {op.timeTo}</span>}
                  {op.duration && <span>{t('reports.view.duration')} {op.duration}</span>}
                </div>
                {op.details && <p className="text-sm text-gray-700 dark:text-gray-300">{op.details}</p>}
              </div>,
            }))} />
          </div></Card>}

          {drillStringComponents.length > 0 && <Card><div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('reports.view.drillString')}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded">
                <thead className="bg-gray-50 dark:bg-gray-800"><tr>
                  <TH align="left">{t('reports.view.entryNumber')}</TH><TH align="left">{t('reports.view.pieceName')}</TH><TH>{t('reports.view.length')}</TH>
                </tr></thead>
                <tbody className="bg-gray-50 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {drillStringComponents.map((comp) => <tr key={comp.id}>
                    <TD align="left">{comp.entryNumber}</TD>
                    <TD align="left">{comp.pieceName}</TD>
                    <TD>{comp.length != null ? comp.length : '-'}</TD>
                  </tr>)}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-800"><tr>
                  <TD align="left" className="font-semibold">{t('reports.view.total')}</TD>
                  <TD align="left" className="font-semibold">{t('reports.view.totalPieces', { count: drillStringComponents.length })}</TD>
                  <TD className="font-semibold">{drillStringComponents.reduce((s, c) => s + (c.length || 0), 0).toFixed(2)} ft</TD>
                </tr></tfoot>
              </table>
            </div>
          </div></Card>}
        </>)}

        {/* ── TAB: REVISIÓN ── */}
        {viewTab === 'review' && <div className="space-y-6">
          {report.status === 'rejected' && report.rejectionReason && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <XCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">{t('reports.view.rejectionReason')}</p>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1 whitespace-pre-wrap">{report.rejectionReason}</p>
              </div>
            </div>
          )}
          <Card><div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('reports.view.reportStatus')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <DataField label={t('reports.view.currentStatus')} value={
                report.status === 'draft' ? t('reports.view.statusDraft') :
                report.status === 'submitted' ? t('reports.view.statusSubmitted') :
                report.status === 'approved' ? t('reports.view.statusApproved') :
                report.status === 'rejected' ? t('reports.view.statusRejected') : report.status
              } />
              {report.submittedAt && <DataField label={t('reports.view.submittedDate')} value={formatDateTime(report.submittedAt)} />}
              {report.approvedAt && <DataField label={t('reports.view.approvedDate')} value={formatDateTime(report.approvedAt)} />}
              {report.rejectedAt && <DataField label={t('reports.view.rejectedDate')} value={formatDateTime(report.rejectedAt)} />}
            </div>
          </div></Card>
          <Card><div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('reports.view.reviewHistory')}</h3>
            <ReviewTimeline reportId={report.id} refreshKey={reviewRefreshKey} />
          </div></Card>
        </div>}

      </div>
    </MainLayout>
  );
}

// ── Helper components ──────────────────────────────────────────────────────

function DataField({ label, value }: { label: string; value?: string | null }) {
  return <div>
    <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
    <p className="text-base font-medium text-gray-900 dark:text-gray-100">{value || '-'}</p>
  </div>;
}

function CrewShiftTable({ shift }: { shift: CrewShift }) {
  const { t } = useTranslation();
  if (!shift.members || shift.members.length === 0)
    return <p className="text-sm text-gray-500">{t('reports.view.noMembers')}</p>;
  return <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded">
      <thead className="bg-gray-50 dark:bg-gray-800"><tr>
        <TH align="left">{t('reports.view.position')}</TH><TH align="left">{t('reports.view.ci')}</TH><TH align="left">{t('reports.view.name')}</TH><TH align="left">{t('reports.view.hours')}</TH>
      </tr></thead>
      <tbody className="bg-gray-50 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
        {shift.members.map((m, i) => <tr key={i}>
          <TD align="left">{m.position}</TD>
          <TD align="left">{m.personnelCi || m.ci || '-'}</TD>
          <TD align="left">{m.personnelName || m.name || '-'}</TD>
          <TD align="left">{m.hours || '-'}</TD>
        </tr>)}
      </tbody>
    </table>
  </div>;
}

function TH({ children, align = 'center' }: { children: React.ReactNode; align?: 'left' | 'center' }) {
  return <th className={`px-4 py-2 text-${align} text-xs font-medium text-gray-500 dark:text-gray-400 uppercase`}>{children}</th>;
}

function TD({ children, align = 'center', className = '' }: { children: React.ReactNode; align?: 'left' | 'center'; className?: string }) {
  return <td className={`px-4 py-2 text-sm text-gray-900 dark:text-gray-100 text-${align} ${className}`}>{children}</td>;
}

function groupMudRecordsByShift(records: MudRecord[]) {
  const ORDER: Array<MudRecord['shift']> = ['morning', 'afternoon', 'night'];
  const grouped = new Map<string, MudRecord[]>();
  for (const r of records) {
    const key = r.shift || 'unknown';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  }
  const slides: Array<{ label: string; content: React.ReactNode }> = [];
  for (const shift of ORDER) {
    const items = grouped.get(shift!);
    if (!items?.length) continue;
    slides.push({ label: i18n.t(`reports.shiftLabels.${shift}`) as string, content: <MudRecordsTable records={items} /> });
    grouped.delete(shift!);
  }
  for (const [key, items] of grouped) {
    slides.push({ label: key === 'unknown' ? i18n.t('reports.view.noShift') : key, content: <MudRecordsTable records={items} /> });
  }
  return slides;
}

function MudRecordsTable({ records }: { records: MudRecord[] }) {
  const { t } = useTranslation();
  return <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded">
      <thead className="bg-gray-50 dark:bg-gray-800"><tr>
        <TH align="left">{t('reports.view.hour')}</TH>
        <TH>{t('reports.view.weight')}</TH><TH>{t('reports.view.viscosity')}</TH><TH>{t('reports.view.pvp')}</TH>
        <TH>{t('reports.view.gels')}</TH><TH>{t('reports.view.filtrate')}</TH><TH>{t('reports.view.ph')}</TH><TH>{t('reports.view.solids')}</TH>
      </tr></thead>
      <tbody className="bg-gray-50 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
        {records.map((mud, idx) => <tr key={idx}>
          <TD align="left">{mud.hour || '-'}</TD>
          <TD>{mud.weight || '-'}</TD><TD>{mud.viscosity || '-'}</TD>
          <TD>{mud.pvp || '-'}</TD><TD>{mud.gels || '-'}</TD>
          <TD>{mud.filtrate || '-'}</TD><TD>{mud.ph || '-'}</TD>
          <TD>{mud.solids || '-'}</TD>
        </tr>)}
      </tbody>
    </table>
  </div>;
}
