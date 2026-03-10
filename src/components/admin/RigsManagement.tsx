import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Plus, Pencil, Trash2, Search, Filter, Building2, HardHat } from 'lucide-react';
import { rigsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useModal } from '@/store/modalStore';
import { backgroundPush } from '@/lib/syncHelper';
import { syncEvents } from '@/lib/syncEvents';
import type { RigWithArea, RigFull } from '@/types/rig';
import RigCreateForm from './forms/RigCreateForm';
import RigUpdateForm from './forms/RigUpdateForm';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table } from '@/components/ui/Table';
import { Card } from '@/components/ui/Card';

export default function RigsManagement() {
  const { t } = useTranslation();
  const { user, sessionToken } = useAuthStore();
  const { openModal } = useModal();

  const [rigs, setRigs] = useState<RigWithArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [syncVersion, setSyncVersion] = useState(0);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rigsApi.list(includeInactive);
      setRigs(data);
    } catch {
      toast.error(t('admin.rigs.loadRigsError'));
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => { loadData(); }, [loadData, syncVersion]);

  useEffect(() => {
    const unsub = syncEvents.subscribe(() => setSyncVersion((v) => v + 1));
    return unsub;
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const pushInBackground = () => {
    if (sessionToken) backgroundPush(sessionToken);
  };

  // ── Load full rig (with contractors) for edit wizard ─────────────────────

  const loadRigFull = async (rigId: string): Promise<RigFull> => {
    return rigsApi.getFull(rigId);
  };

  // ── Create ────────────────────────────────────────────────────────────────

  const handleCreate = () => {
    openModal(
      <RigCreateForm
        onSubmit={async (data) => {
          const newRig = await rigsApi.create(user!.id, data);
          toast.success(t('admin.rigs.created', { name: newRig.name }));
          pushInBackground();
          loadData();
          return newRig.id;
        }}
      />,
      {
        title: t('admin.rigs.createTitle'),
        size: 'lg',
        showCloseButton: true,
        onClose: () => loadData(),
      }
    );
  };

  // ── Edit ──────────────────────────────────────────────────────────────────

  const handleEdit = async (rig: RigWithArea) => {
    let rigFull: RigFull;
    try {
      rigFull = await loadRigFull(rig.id);
    } catch {
      toast.error(t('admin.rigs.loadError'));
      return;
    }

    openModal(
      <RigUpdateForm
        rig={rigFull}
        onSubmit={async (data) => {
          await rigsApi.update(rig.id, user!.id, data);
          toast.success(t('admin.rigs.updated'));
          pushInBackground();
          loadData();
        }}
        onContractorsChanged={async () => {
          // replaceAll ya fue ejecutado dentro de TabContractors
          pushInBackground();
        }}
      />,
      {
        title: t('admin.rigs.editTitle'),
        size: 'lg',
        showCloseButton: true,
        onClose: () => loadData(),
      }
    );
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = (rig: RigWithArea) => {
    openModal(
      <div className="space-y-3">
        <p className="text-gray-700 dark:text-gray-300">
          {t('admin.rigs.confirmDelete', { name: rig.name })}
        </p>
        <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg space-y-1">
          {rig.operatorName && <p><strong>{t('admin.rigs.operator')}:</strong> {rig.operatorName}</p>}
          <p><strong>{t('admin.rigs.power')}:</strong> {rig.power}</p>
          {rig.areaName && <p><strong>{t('admin.rigs.area')}:</strong> {rig.areaName}</p>}
        </div>
        <p className="text-sm text-red-500">{t('admin.rigs.deleteWarning')}</p>
      </div>,
      {
        title: t('admin.rigs.confirmDeletion'),
        size: 'md',
        showConfirmButton: true,
        showCancelButton: true,
        confirmText: t('admin.rigs.delete'),
        cancelText: t('admin.rigs.cancel'),
        onConfirm: async () => {
          await rigsApi.delete(rig.id);
          toast.success(t('admin.rigs.deleted'));
          pushInBackground();
          loadData();
        },
      }
    );
  };

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filteredRigs = rigs.filter((rig) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      rig.name.toLowerCase().includes(q) ||
      (rig.operatorName?.toLowerCase().includes(q) ?? false) ||
      (rig.operator?.toLowerCase().includes(q) ?? false) ||
      (rig.areaName?.toLowerCase().includes(q) ?? false);
    const matchesArea = !filterArea || rig.areaId === filterArea;
    return matchesSearch && matchesArea;
  });

  // Unique areas from loaded rigs for the filter dropdown
  const areaOptions = [
    { value: '', label: t('admin.rigs.allAreas') },
    ...Array.from(
      new Map(
        rigs
          .filter((r) => r.areaId && r.areaName)
          .map((r) => [r.areaId!, { value: r.areaId!, label: r.areaName! }])
      ).values()
    ),
  ];

  // ── Table columns ─────────────────────────────────────────────────────────

  const columns = [
    {
      key: 'name',
      header: t('admin.rigs.name'),
      render: (rig: RigWithArea) => (
        <span className="font-semibold text-gray-900 dark:text-gray-100">{rig.name}</span>
      ),
    },
    {
      key: 'operator',
      header: t('admin.rigs.operator'),
      render: (rig: RigWithArea) => {
        const name = rig.operatorName ?? rig.operator;
        return name ? (
          <div className="flex items-center gap-1.5 text-sm">
            <Building2 size={13} className="text-blue-500 shrink-0" />
            <span className="text-gray-700 dark:text-gray-300">{name}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-400 italic">{t('admin.rigs.unassigned')}</span>
        );
      },
    },
    {
      key: 'power',
      header: t('admin.rigs.power'),
      render: (rig: RigWithArea) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{rig.power}</span>
      ),
    },
    {
      key: 'area',
      header: t('admin.rigs.area'),
      render: (rig: RigWithArea) =>
        rig.areaName ? (
          <div className="text-sm">
            <div className="font-medium text-gray-800 dark:text-gray-200">{rig.areaName}</div>
            {rig.areaCountry && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {rig.areaCountry}, {rig.areaState}
              </div>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400 italic">{t('admin.rigs.noArea')}</span>
        ),
    },
    {
      key: 'status',
      header: t('admin.rigs.status'),
      render: (rig: RigWithArea) => (
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
            rig.active
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
          }`}
        >
          {rig.active ? t('admin.rigs.active') : t('admin.rigs.inactive')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('admin.rigs.actions'),
      render: (rig: RigWithArea) => (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleEdit(rig)} title={t('admin.rigs.edit')}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(rig)} title={t('admin.rigs.delete')}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('admin.rigs.title')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('admin.rigs.subtitle')}
          </p>
        </div>
        <Button variant="primary" onClick={handleCreate} icon={<Plus />}>
          {t('admin.rigs.create')}
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('admin.rigs.search')}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder={t('admin.rigs.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('admin.rigs.filterByArea')}
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Select
                value={filterArea}
                onChange={(e) => setFilterArea(e.target.value)}
                options={areaOptions}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            id="includeInactive"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="h-4 w-4 text-primary-600 border-gray-300 rounded"
          />
          <label htmlFor="includeInactive" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            {t('admin.rigs.includeInactive')}
          </label>
        </div>
      </Card>

      {/* Tabla */}
      <Card>
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('admin.rigs.loading')}</p>
          </div>
        ) : filteredRigs.length === 0 ? (
          <div className="text-center py-12">
            <HardHat className="mx-auto w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm || filterArea
                ? t('admin.rigs.noResults')
                : t('admin.rigs.noRigs')}
            </p>
            {!searchTerm && !filterArea && (
              <Button variant="primary" onClick={handleCreate} className="mt-4" icon={<Plus className="w-4 h-4" />}>
                {t('admin.rigs.createFirst')}
              </Button>
            )}
          </div>
        ) : (
          <Table
            columns={columns}
            data={filteredRigs}
            pagination
            pageSize={10}
            pageSizeOptions={[5, 10, 20, 50]}
            hoverable
            striped
          />
        )}
      </Card>
    </div>
  );
}
