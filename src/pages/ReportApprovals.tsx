import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout';
import { Button, Card, Select, ReportStatusBadge } from '../components/ui';
import {
  Eye,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useModal } from '../store/modalStore';
import { reportsApi, rigsApi, usersApi } from '../lib/api';
import ApproveReportModal from '../components/modals/ApproveReportModal';
import RejectReportModal from '../components/modals/RejectReportModal';
import { toast } from '../lib/toast';
import { backgroundPush } from '../lib/syncHelper';
import { syncEvents } from '../lib/syncEvents';
import { formatDateDMY } from '../lib/dateUtils';
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

  // ── Load on mount & tab/page change ────────────────────────────────────
  useEffect(() => {
    if (sessionToken) {
      loadReports();
    }
  }, [sessionToken, activeTab, currentPage, historyStatus, filterRig]);

  useEffect(() => {
    if (sessionToken) loadRigs();
  }, [sessionToken]);

  // Always keep pending count updated
  useEffect(() => {
    if (sessionToken) loadPendingCount();
  }, [sessionToken]);

  // Sync event listener
  useEffect(() => {
    const unsub = syncEvents.subscribe(() => {
      loadReports();
      loadPendingCount();
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
        // History without status filter — fetch approved + rejected in parallel
        const [approvedRes, rejectedRes] = await Promise.all([
          reportsApi.list(sessionToken, { status: 'approved', rigNumber: filterRig || undefined }, 1, 1000),
          reportsApi.list(sessionToken, { status: 'rejected', rigNumber: filterRig || undefined }, 1, 1000),
        ]);

        // Merge, sort by most recent first, then paginate client-side
        const all = [...approvedRes.reports, ...rejectedRes.reports]
          .sort((a, b) => {
            const dateA = a.updatedAt || a.createdAt || '';
            const dateB = b.updatedAt || b.createdAt || '';
            return dateB.localeCompare(dateA);
          });

        const total = all.length;
        const totalPgs = Math.ceil(total / pageSize) || 1;
        const start = (currentPage - 1) * pageSize;
        const paged = all.slice(start, start + pageSize);

        setReports(paged);
        setTotalReports(total);
        setTotalPages(totalPgs);
        resolveCreatorNames(paged);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Error al cargar reportes');
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
          newNames[uid] = 'Desconocido';
          changed = true;
        }
      }),
    );

    if (changed) setCreatorNames(newNames);
  };

  // ── Actions ────────────────────────────────────────────────────────────

  const handleApprove = (report: Report) => {
    const label = `DDR #${report.reportNumber} · ${report.wellNumber || 'Sin pozo'} · ${report.rigNumber || 'Sin taladro'}`;
    openModal(
      <ApproveReportModal
        reportLabel={label}
        onConfirm={async (_comment) => {
          await reportsApi.approve(sessionToken!, report.id);
          closeModal();
          toast.success('Reporte aprobado exitosamente');
          backgroundPush(sessionToken!);
          loadReports();
          loadPendingCount();
        }}
      />,
      { title: 'Aprobar Reporte', size: 'md' },
    );
  };

  const handleReject = (report: Report) => {
    const label = `DDR #${report.reportNumber} · ${report.wellNumber || 'Sin pozo'} · ${report.rigNumber || 'Sin taladro'}`;
    openModal(
      <RejectReportModal
        reportLabel={label}
        onConfirm={async (reason) => {
          await reportsApi.reject(sessionToken!, report.id, reason);
          closeModal();
          toast.success('Reporte rechazado');
          backgroundPush(sessionToken!);
          loadReports();
          loadPendingCount();
        }}
      />,
      { title: 'Rechazar Reporte', size: 'md' },
    );
  };

  // ── Helpers ────────────────────────────────────────────────────────────

  const formatDateTime = (isoStr: string | null | undefined): string => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '-';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${mins}`;
    } catch {
      return '-';
    }
  };

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'pending', label: 'Pendientes' },
    { key: 'history', label: 'Historial' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <MainLayout
      title="Aprobaciones"
      subtitle="Gestión de revisión y aprobación de reportes DDR"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* ── Tabs ──────────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
            <div className="p-4 flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Filter size={16} />
                <span>Filtros</span>
              </div>
              <div className="w-48">
                <Select
                  value={historyStatus}
                  onChange={(e) => setHistoryStatus(e.target.value)}
                  placeholder="Todos los estados"
                  options={[
                    { value: '', label: 'Todos' },
                    { value: 'approved', label: 'Aprobados' },
                    { value: 'rejected', label: 'Rechazados' },
                  ]}
                />
              </div>
              <div className="w-48">
                <Select
                  value={filterRig}
                  onChange={(e) => setFilterRig(e.target.value)}
                  placeholder="Todos los taladros"
                  options={[
                    { value: '', label: 'Todos los taladros' },
                    ...rigs.map((r) => ({ value: r.name, label: r.name })),
                  ]}
                />
              </div>
              {(historyStatus || filterRig) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setHistoryStatus('');
                    setFilterRig('');
                  }}
                  icon={<XCircle size={14} />}
                >
                  Limpiar
                </Button>
              )}
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
                  ? 'No hay reportes pendientes de aprobación'
                  : 'No se encontraron reportes en el historial'}
              </p>
              {activeTab === 'pending' && (
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Los reportes enviados por los operadores aparecerán aquí.
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
                        <span>Taladro: <span className="font-medium text-gray-800 dark:text-gray-200">{report.rigNumber}</span></span>
                      )}
                      {report.wellNumber && (
                        <span>Pozo: <span className="font-medium text-gray-800 dark:text-gray-200">{report.wellNumber}</span></span>
                      )}
                      <span>Fecha: {formatDateDMY(report.reportDate)}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                      <span>Creado por: {creatorNames[report.createdBy || ''] || report.createdBy || '-'}</span>
                      {report.submittedAt && (
                        <span>Enviado: {formatDateTime(report.submittedAt)}</span>
                      )}
                      {report.approvedAt && (
                        <span>Aprobado: {formatDateTime(report.approvedAt)}</span>
                      )}
                      {report.rejectedAt && (
                        <span>Rechazado: {formatDateTime(report.rejectedAt)}</span>
                      )}
                    </div>

                    {/* Show rejection reason inline for history */}
                    {report.status === 'rejected' && report.rejectionReason && (
                      <div className="mt-1 px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-300">
                        <span className="font-medium">Motivo:</span> {report.rejectionReason}
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/reports/view/${report.id}`)}
                      icon={<Eye size={14} />}
                    >
                      Ver
                    </Button>
                    {activeTab === 'pending' && report.status === 'submitted' && (
                      <>
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleApprove(report)}
                          icon={<CheckCircle size={14} />}
                        >
                          Aprobar
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleReject(report)}
                          icon={<XCircle size={14} />}
                        >
                          Rechazar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── Pagination ────────────────────────────────────────────── */}
        {!loading && totalPages > 1 && (() => {
          const startItem = (currentPage - 1) * pageSize + 1;
          const endItem = Math.min(currentPage * pageSize, totalReports);

          const getPageNumbers = () => {
            const pages: (number | string)[] = [];
            const maxVisible = 5;
            if (totalPages <= maxVisible) {
              for (let i = 1; i <= totalPages; i++) pages.push(i);
            } else if (currentPage <= 3) {
              for (let i = 1; i <= 4; i++) pages.push(i);
              pages.push('...', totalPages);
            } else if (currentPage >= totalPages - 2) {
              pages.push(1, '...');
              for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
            } else {
              pages.push(1, '...');
              for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
              pages.push('...', totalPages);
            }
            return pages;
          };

          return (
            <div className="border-t border-gray-200 dark:border-gray-700 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Mostrando <span className="font-medium">{startItem}</span> - <span className="font-medium">{endItem}</span> de{' '}
                  <span className="font-medium">{totalReports}</span> reportes
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, index) => (
                      <button
                        key={index}
                        onClick={() => typeof page === 'number' && setCurrentPage(page)}
                        disabled={page === '...'}
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          page === currentPage
                            ? 'bg-blue-600 text-white'
                            : page === '...'
                              ? 'cursor-default text-gray-400'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </MainLayout>
  );
}
