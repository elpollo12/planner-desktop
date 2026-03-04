import { useState, useEffect, useCallback } from 'react';
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
      toast.error('Error al cargar los taladros');
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
          toast.success(`Taladro "${newRig.name}" creado exitosamente`);
          pushInBackground();
          loadData();
          return newRig.id;
        }}
      />,
      {
        title: 'Crear Nuevo Taladro',
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
      toast.error('Error al cargar el taladro');
      return;
    }

    openModal(
      <RigUpdateForm
        rig={rigFull}
        onSubmit={async (data) => {
          await rigsApi.update(rig.id, user!.id, data);
          toast.success('Taladro actualizado exitosamente');
          pushInBackground();
          loadData();
        }}
        onContractorsChanged={async () => {
          // replaceAll ya fue ejecutado dentro de TabContractors
          pushInBackground();
        }}
      />,
      {
        title: 'Editar Taladro',
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
          ¿Estás seguro de eliminar el taladro{' '}
          <strong className="text-gray-900 dark:text-gray-100">"{rig.name}"</strong>?
        </p>
        <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg space-y-1">
          {rig.operatorName && <p><strong>Operador:</strong> {rig.operatorName}</p>}
          <p><strong>Potencia:</strong> {rig.power}</p>
          {rig.areaName && <p><strong>Área:</strong> {rig.areaName}</p>}
        </div>
        <p className="text-sm text-red-500">Esta acción no se puede deshacer.</p>
      </div>,
      {
        title: 'Confirmar Eliminación',
        size: 'md',
        showConfirmButton: true,
        showCancelButton: true,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        onConfirm: async () => {
          await rigsApi.delete(rig.id);
          toast.success('Taladro eliminado');
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
    { value: '', label: 'Todas las áreas' },
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
      header: 'Nombre',
      render: (rig: RigWithArea) => (
        <span className="font-semibold text-gray-900 dark:text-gray-100">{rig.name}</span>
      ),
    },
    {
      key: 'operator',
      header: 'Operador',
      render: (rig: RigWithArea) => {
        const name = rig.operatorName ?? rig.operator;
        return name ? (
          <div className="flex items-center gap-1.5 text-sm">
            <Building2 size={13} className="text-blue-500 shrink-0" />
            <span className="text-gray-700 dark:text-gray-300">{name}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-400 italic">Sin asignar</span>
        );
      },
    },
    {
      key: 'power',
      header: 'Potencia',
      render: (rig: RigWithArea) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{rig.power}</span>
      ),
    },
    {
      key: 'area',
      header: 'Área',
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
          <span className="text-xs text-gray-400 italic">Sin área</span>
        ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (rig: RigWithArea) => (
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
            rig.active
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
          }`}
        >
          {rig.active ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (rig: RigWithArea) => (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleEdit(rig)} title="Editar">
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(rig)} title="Eliminar">
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
            Gestión de Taladros
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Administra los taladros, sus operadores, contratistas y cuadrilla
          </p>
        </div>
        <Button variant="primary" onClick={handleCreate} icon={<Plus />}>
          Crear Taladro
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Nombre, operador o área..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Filtrar por Área
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
            Incluir taladros inactivos
          </label>
        </div>
      </Card>

      {/* Tabla */}
      <Card>
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Cargando taladros...</p>
          </div>
        ) : filteredRigs.length === 0 ? (
          <div className="text-center py-12">
            <HardHat className="mx-auto w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm || filterArea
                ? 'No se encontraron taladros con los filtros aplicados'
                : 'No hay taladros registrados'}
            </p>
            {!searchTerm && !filterArea && (
              <Button variant="primary" onClick={handleCreate} className="mt-4" icon={<Plus className="w-4 h-4" />}>
                Crear Primer Taladro
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
