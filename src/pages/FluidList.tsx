import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout';
import { Button, Card, Input, Select, PaginationControls } from '../components/ui';
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useModal } from '../store/modalStore';
import ConfirmDeleteModal from '../components/modals/ConfirmDelete';
import { fluidsApi, rigsApi } from '../lib/api';
import { toast } from '../lib/toast';
import { backgroundPush } from '../lib/syncHelper';
import { syncEvents } from '../lib/syncEvents';
import { formatDateDMY } from '../lib/dateUtils';
import type { FluidReportListItem, FluidReportFilters } from '../types/fluid';
import type { RigWithArea } from '../types';
import { useTranslation } from 'react-i18next';

// ── Debounce hook ────────────────────────────────────────────────────────────
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ── Filter shape ─────────────────────────────────────────────────────────────
interface Filters {
  wellNumber: string;
  rigId: string;
  dateFrom: string;
  dateTo: string;
}

const EMPTY_FILTERS: Filters = {
  wellNumber: '',
  rigId: '',
  dateFrom: '',
  dateTo: '',
};

export default function FluidList() {
  const navigate = useNavigate();
  const { sessionToken } = useAuthStore();
  const { openModal } = useModal();
  const { t } = useTranslation();

  const [items, setItems] = useState<FluidReportListItem[]>([]);
  const [rigs, setRigs] = useState<RigWithArea[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS });
  const debouncedFilters = useDebouncedValue(filters, 200);

  const [syncVersion, setSyncVersion] = useState(0);

  const [filtersVersion, setFiltersVersion] = useState(0);
  useEffect(() => {
    setFiltersVersion((v) => v + 1);
    setCurrentPage(1);
  }, [
    debouncedFilters.wellNumber,
    debouncedFilters.rigId,
    debouncedFilters.dateFrom,
    debouncedFilters.dateTo,
  ]);

  // ── Fetch data ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (sessionToken) loadItems();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken, currentPage, pageSize, filtersVersion, syncVersion]);

  useEffect(() => {
    if (sessionToken) loadRigs();
  }, [sessionToken]);

  useEffect(() => {
    const unsubscribe = syncEvents.subscribe(() => setSyncVersion((v) => v + 1));
    return unsubscribe;
  }, []);

  const loadItems = async () => {
    if (!sessionToken) { setLoading(false); return; }
    setLoading(true);
    try {
      const apiFilters: FluidReportFilters = {
        page: currentPage,
        pageSize,
        wellNumber: debouncedFilters.wellNumber || undefined,
        rigId: debouncedFilters.rigId || undefined,
        dateFrom: debouncedFilters.dateFrom || undefined,
        dateTo: debouncedFilters.dateTo || undefined,
      };
      const response = await fluidsApi.list(sessionToken, apiFilters);
      setItems(response.data);
      setTotalItems(response.total);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error('Error loading fluid reports:', error);
      toast.error(t('fluids.list.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const loadRigs = async () => {
    if (!sessionToken) return;
    try {
      const data = await rigsApi.listAccessible(sessionToken, false);
      setRigs(data);
    } catch (error) {
      console.error('Error loading rigs:', error);
    }
  };

  const handleClearFilters = () => setFilters({ ...EMPTY_FILTERS });

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handleDelete = (item: FluidReportListItem) => {
    const onConfirm = async () => {
      if (!sessionToken) return;
      try {
        await fluidsApi.delete(sessionToken, item.id);
        toast.success(t('fluids.list.deleted'));
        backgroundPush(sessionToken);
        if (items.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        } else {
          loadItems();
        }
      } catch (error) {
        console.error('Error deleting fluid report:', error);
        toast.error(t('fluids.list.errorDeleting'));
        throw error;
      }
    };

    openModal(
      <ConfirmDeleteModal
        message={t('fluids.list.confirmDelete')}
        itemName={`Reporte #${item.reportNumber} - ${item.reportDate ? formatDateDMY(item.reportDate) : '-'}`}
        onConfirm={onConfirm}
      />,
      { title: t('fluids.list.deleteTitle'), size: 'sm', showCloseButton: true },
    );
  };

  return (
    <MainLayout
      title={t('fluids.list.title')}
      subtitle={t('fluids.list.subtitle')}
      headerActions={
        <Button
          variant="primary"
          onClick={() => navigate('/fluids/new')}
          icon={<Plus size={16} />}
        >
          {t('fluids.list.newReport')}
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('reports.list.filters')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                label={t('fluids.list.filterWell')}
                value={filters.wellNumber}
                onChange={(e) => setFilters((f) => ({ ...f, wellNumber: e.target.value }))}
                placeholder={t('fluids.list.filterWellPlaceholder')}
              />
              <Select
                label={t('fluids.list.filterRig')}
                value={filters.rigId}
                onChange={(e) => setFilters((f) => ({ ...f, rigId: e.target.value }))}
              >
                <option value="">{t('fluids.list.filterAll')}</option>
                {rigs.map((rig) => (
                  <option key={rig.id} value={rig.id}>{rig.name}</option>
                ))}
              </Select>
              <Input
                label={t('fluids.list.filterFrom')}
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              />
              <Input
                label={t('fluids.list.filterTo')}
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClearFilters}>
                {t('reports.list.clearFilters')}
              </Button>
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card>
          {loading ? (
            <div className="p-8 text-center text-gray-500">{t('fluids.list.loading')}</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 mb-4">{t('fluids.list.empty')}</p>
              <Button variant="primary" onClick={() => navigate('/fluids/new')} icon={<Plus size={16} />}>
                {t('fluids.list.createFirst')}
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('fluids.list.colReportNumber')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('fluids.list.colWell')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('fluids.list.colRig')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('fluids.list.colDate')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('fluids.list.colFluidType')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('fluids.list.colPhase')}</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('reports.list.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-50 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-100 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">#{item.reportNumber || '-'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-gray-100">{item.wellNumber || '-'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-gray-100">{item.rigNumber || '-'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-gray-100">{item.reportDate ? formatDateDMY(item.reportDate) : '-'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-gray-100">{item.fluidType || '-'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-gray-100">{item.wellPhase || '-'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => navigate(`/fluids/view/${item.id}`)}
                              className="p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
                              title={t('fluids.list.viewDetail')}
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => navigate(`/fluids/edit/${item.id}`)}
                              className="p-1 text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 cursor-pointer"
                              title={t('fluids.list.edit')}
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
                              title={t('fluids.list.delete')}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                itemLabel={t('fluids.list.paginationLabel')}
                pageSizeOptions={[5, 10, 25, 50]}
                onPageChange={setCurrentPage}
                onPageSizeChange={handlePageSizeChange}
              />
            </>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
