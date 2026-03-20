import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '../components/layout';
import { Button, Card, Select, ReportStatusBadge, PaginationControls } from '../components/ui';
import {
  Eye,
  CheckCircle,
  XCircle,
  Filter,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useModal } from '../store/modalStore';
import { PermissionGate } from '../components/guards/PermissionGate';
import { reportsApi, rigsApi, usersApi } from '../lib/api';
import ApproveReportModal from '../components/modals/ApproveReportModal';
import RejectReportModal from '../components/modals/RejectReportModal';
import { toast } from '../lib/toast';
import { backgroundPush } from '../lib/syncHelper';
import { syncEvents } from '../lib/syncEvents';
import { formatDateDMY, formatDateTime } from '../lib/dateUtils';
import type { Report, ReportStatus } from '../types/report';
import type { RigWithArea } from '../types';

type TabKey = 'pending' | 'history';

interface PaginatedReportsResponse {
  reports: Report[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export default function ReportApprovals() {
  const navigate = useNavigate();
  const { sessionToken } = useAuthStore();
  const { openModal, closeModal } = useModal();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [reports, setReports] = useState<Report[]>([]);
  const [rigs, setRigs] = useState<RigWithArea[]>([]);
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(3);
  const [totalReports, setTotalReports] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Pending count for tab badge
  const [pendingCount, setPendingCount] = useState(0);

  // History tab filter
  const [historyStatus, setHistoryStatus] = useState<string>('');
  const [filterRig, setFilterRig] = useState<string>('');

  // Sync-triggered refresh counter (avoids stale closures)
  const [syncVersion, setSyncVersion] = useState(0);

  // ── Load on mount & tab/page change ────────────────────────────────────
  useEffect(() => {
    if (sessionToken) {
      loadReports();
    }
  }, [sessionToken, activeTab, currentPage, historyStatus, filterRig, syncVersion]);

  useEffect(() => {
    if (sessionToken) loadRigs();
  }, [sessionToken]);

  // Always keep pending count updated
  useEffect(() => {
    if (sessionToken) loadPendingCount();
  }, [sessionToken, syncVersion]);

  // Sync event listener — bump version to trigger reload via useEffect
  useEffect(() => {
    const unsub = syncEvents.subscribe(() => {
      setSyncVersion((v) => v + 1);
    });
    return unsub;
  }, []);

  // Reset page on tab/filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, historyStatus, filterRig]);

  // ── API calls ──────────────────────────────────────────────────────────

  const loadReports = async () => {
    if (!sessionToken) return;
    setLoading(true);
    try {
      if (activeTab === 'pending') {
        // Single call — only submitted reports
        const response: PaginatedReportsResponse = await reportsApi.list(
          sessionToken,
          { status: 'submitted', rigNumber: filterRig || undefined },
          currentPage,
          pageSize,
        );
        setReports(response.reports);
        setTotalReports(response.total);
        setTotalPages(response.total_pages);
        resolveCreatorNames(response.reports);
      } else if (historyStatus) {
        // History with specific status filter — single call
        const response: PaginatedReportsResponse = await reportsApi.list(
          sessionToken,
          { status: historyStatus as ReportStatus, rigNumber: filterRig || undefined },
          currentPage,
          pageSize,
        );
        setReports(response.reports);
        setTotalReports(response.total);
        setTotalPages(response.total_pages);
        resolveCreatorNames(response.reports);
      } else {
        // History without status filter — server-side paginated with multiple statuses
        const response: PaginatedReportsResponse = await reportsApi.list(
          sessionToken,
          { statuses: ['approved', 'rejected'], rigNumber: filterRig || undefined },
          currentPage,
          pageSize,
        );
        setReports(response.reports);
        setTotalReports(response.total);
        setTotalPages(response.total_pages);
        resolveCreatorNames(response.reports);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error(t('reports.approvals.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const loadPendingCount = async () => {
    if (!sessionToken) return;
    try {
      const response: PaginatedReportsResponse = await reportsApi.list(
        sessionToken,
        { status: 'submitted' },
        1,
        1,
      );
      setPendingCount(response.total);
    } catch {
      // silent
    }
  };

  const loadRigs = async () => {
    if (!sessionToken) return;
    try {
      const data = await rigsApi.listAccessible(sessionToken, false);
      setRigs(data);
    } catch {
      // silent
    }
  };

  const resolveCreatorNames = async (items: Report[]) => {
    if (!sessionToken) return;
    const ids = [...new Set(items.map((r) => r.createdBy).filter(Boolean))] as string[];
    const newNames: Record<string, string> = { ...creatorNames };
    let changed = false;

    await Promise.all(
      ids.map(async (uid) => {
        if (newNames[uid]) return;
        try {
          const u = await usersApi.get(sessionToken, uid);
          newNames[uid] = u.fullName || u.username;
          changed = true;
        } catch {
          newNames[uid] = t('reports.approvals.unknownUser');
          changed = true;
        }
      }),
    );

    if (changed) setCreatorNames(newNames);
  };

  // ── Actions ────────────────────────────────────────────────────────────

  const handleApprove = (report: Report) => {
    const label = `DDR #${report.reportNumber} · ${report.wellNumber || t('reports.view.noWell')} · ${report.rigNumber || t('reports.view.noRig')}`;
    openModal(
      <ApproveReportModal
        reportLabel={label}
        onConfirm={async (comment) => {
          await reportsApi.approve(sessionToken!, report.id, comment);
          closeModal();
          toast.success(t('reports.view.approvedSuccess'));
          backgroundPush(sessionToken!);
          loadReports();
          loadPendingCount();
        }}
      />,
      { title: t('reports.approvals.approveModalTitle'), size: 'md' },
    );
  };

  const handleReject = (report: Report) => {
    const label = `DDR #${report.reportNumber} · ${report.wellNumber || t('reports.view.noWell')} · ${report.rigNumber || t('reports.view.noRig')}`;
    openModal(
      <RejectReportModal
        reportLabel={label}
        onConfirm={async (reason) => {
          await reportsApi.reject(sessionToken!, report.id, reason);
          closeModal();
          toast.success(t('reports.view.rejectedSuccess'));
          backgroundPush(sessionToken!);
          loadReports();
          loadPendingCount();
        }}
      />,
      { title: t('reports.approvals.rejectModalTitle'), size: 'md' },
    );
  };

  // ── Helpers ────────────────────────────────────────────────────────────

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'pending', label: t('reports.approvals.pendingTab') },
    { key: 'history', label: t('reports.approvals.historyTab') },
  ];

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <MainLayout
      title={t('reports.approvals.title')}
      subtitle={t('reports.approvals.subtitle')}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* ── Tabs ──────────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 border border-primary-200 rounded-lg p-1 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === tab.key
                  ? 'bg-gray-50 dark:bg-gray-700 text-primary-500 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:cursor-pointer'
                }`}
            >
              {tab.label}
              {tab.key === 'pending' && pendingCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Filters (history tab only) ────────────────────────────── */}
        {activeTab === 'history' && (
          <Card>
            <div className=" flex-col flex-wrap items-end gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-40 mb-2">
                <Filter size={16} />
                <span>{t('reports.list.filters')}</span>
              </div>
              <div className='flex items-center gap-2 text-sm"'>
                <div className="w-48">
                  <Select
                    value={historyStatus}
                    onChange={(e) => setHistoryStatus(e.target.value)}
                    placeholder={t('reports.approvals.allStatuses')}
                    options={[
                      { value: '', label: t('reports.approvals.allStatuses') },
                      { value: 'approved', label: t('reports.approvals.approvedFilter') },
                      { value: 'rejected', label: t('reports.approvals.rejectedFilter') },
                    ]}
                  />
                </div>
                <div className="w-48">
                  <Select
                    value={filterRig}
                    onChange={(e) => setFilterRig(e.target.value)}
                    placeholder={t('reports.approvals.allRigs')}
                    options={[
                      { value: '', label: t('reports.approvals.allRigs') },
                      ...rigs.map((r) => ({ value: r.name, label: r.name })),
                    ]}
                  />
                </div>
              {(historyStatus || filterRig) && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setHistoryStatus('');
                    setFilterRig('');
                  }}
                  icon={<XCircle size={14} />}
                >
                  {t('reports.approvals.clearFilter')}
                </Button>
              )}
              </div>
            </div>
          </Card>
        )}

        {/* ── Loading ───────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
          </div>
        ) : reports.length === 0 ? (
          /* ── Empty state ─────────────────────────────────────────── */
          <Card>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle size={40} className="text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                {activeTab === 'pending'
                  ? t('reports.approvals.noPending')
                  : t('reports.approvals.noHistory')}
              </p>
              {activeTab === 'pending' && (
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  {t('reports.approvals.pendingHint')}
                </p>
              )}
            </div>
          </Card>
        ) : (
          /* ── Report cards ────────────────────────────────────────── */
          <div className="space-y-3">
            {reports.map((report) => (
              <Card key={report.id}>
                <div className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        DDR #{report.reportNumber}
                      </span>
                      <ReportStatusBadge status={report.status} size="sm" />
                    </div>

                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
                      {report.rigNumber && (
                        <span>{t('reports.approvals.rigLabel')} <span className="font-medium text-gray-800 dark:text-gray-200">{report.rigNumber}</span></span>
                      )}
                      {report.wellNumber && (
                        <span>{t('reports.approvals.wellLabel')} <span className="font-medium text-gray-800 dark:text-gray-200">{report.wellNumber}</span></span>
                      )}
                      <span>{t('reports.approvals.dateLabel')} {formatDateDMY(report.reportDate)}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                      <span>{t('reports.approvals.createdByLabel')} {creatorNames[report.createdBy || ''] || report.createdBy || '-'}</span>
                      {report.submittedAt && (
                        <span>{t('reports.approvals.submittedLabel')} {formatDateTime(report.submittedAt)}</span>
                      )}
                      {report.approvedAt && (
                        <span>{t('reports.approvals.approvedLabel')} {formatDateTime(report.approvedAt)}</span>
                      )}
                      {report.rejectedAt && (
                        <span>{t('reports.approvals.rejectedLabel')} {formatDateTime(report.rejectedAt)}</span>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/reports/view/${report.id}?from=approvals`)}
                      icon={<Eye size={14} />}
                    >
                      {t('actions.view')}
                    </Button>
                    {activeTab === 'pending' && report.status === 'submitted' && (
                      <PermissionGate minRole="supervisor">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleApprove(report)}
                          icon={<CheckCircle size={14} />}
                        >
                          {t('actions.approve')}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleReject(report)}
                          icon={<XCircle size={14} />}
                        >
                          {t('actions.reject')}
                        </Button>
                      </PermissionGate>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── Pagination ────────────────────────────────────────────── */}
        {!loading && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalReports}
            pageSize={pageSize}
            itemLabel={t('reports.list.itemLabel')}
            pageSizeOptions={false}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </MainLayout>
  );
}
