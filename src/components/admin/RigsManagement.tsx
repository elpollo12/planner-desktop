import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Plus, Pencil, Trash2, Search, Filter } from 'lucide-react';
import { rigsApi, areasApi, operatorsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useModal } from '@/store/modalStore';
import { backgroundPush } from '@/lib/syncHelper';
import { syncEvents } from '@/lib/syncEvents';
import type { RigWithArea, Area } from '@/types/rig';
import type { Operator } from '@/types/operator';
import RigForm from './forms/RigForm';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table } from '@/components/ui/Table';
import { Card } from '@/components/ui/Card';

export default function RigsManagement() {
  const { user, sessionToken } = useAuthStore();
  const { openModal, closeModal } = useModal();
  const [rigs, setRigs] = useState<RigWithArea[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArea, setFilterArea] = useState<string>('');

  // Cargar taladros y áreas
  useEffect(() => {
    loadData();
  }, [includeInactive]);

  // Listen for sync events and reload rigs when new data arrives
  useEffect(() => {
    const unsubscribe = syncEvents.subscribe(() => {
      console.log('[RigsManagement] Sync event received, reloading rigs...');
      loadData();
    });

    return unsubscribe;
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rigsData, areasData, operatorsData] = await Promise.all([
        rigsApi.list(includeInactive),
        areasApi.list(true), // Cargar todas las áreas para el selector
        sessionToken ? operatorsApi.list(sessionToken, true) : Promise.resolve([]),
      ]);
      setRigs(rigsData);
      setAreas(areasData);
      setOperators(operatorsData);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal para crear
  const handleCreate = () => {
    openModal(
      <RigForm
        areas={areas}
        operators={operators}
        onSubmit={async (data) => {
          try {
            await rigsApi.create(user!.id, data);
            toast.success('Taladro creado exitosamente');

            // Push changes to cloud in background
            if (sessionToken) {
              backgroundPush(sessionToken);
            }

            closeModal();
            loadData();
          } catch (error) {
            console.error('Error creando taladro:', error);
            toast.error('Error al crear el taladro');
          }
        }}
      />,
      {
        title: 'Crear Nuevo Taladro',
        size: 'md',
        showCloseButton: true,
      }
    );
  };

  // Abrir modal para editar
  const handleEdit = (rig: RigWithArea) => {
    openModal(
      <RigForm
        rig={rig}
        areas={areas}
        operators={operators}
        onSubmit={async (data) => {
          try {
            await rigsApi.update(rig.id, user!.id, data);
            toast.success('Taladro actualizado exitosamente');

            // Push changes to cloud in background
            if (sessionToken) {
              backgroundPush(sessionToken);
            }

            closeModal();
            loadData();
          } catch (error) {
            console.error('Error actualizando taladro:', error);
            toast.error('Error al actualizar el taladro');
          }
        }}
      />,
      {
        title: 'Editar Taladro',
        size: 'md',
        showCloseButton: true,
      }
    );
  };

  // Eliminar taladro con confirmación
  const handleDelete = (rig: RigWithArea) => {
    openModal(
      <div className="space-y-3">
        <p className="text-gray-700">
          ¿Estás seguro de eliminar el taladro <strong className="text-gray-900">"{rig.name}"</strong>?
        </p>
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
          <p><strong>Operador:</strong> {rig.operator}</p>
          <p><strong>Potencia:</strong> {rig.power}</p>
          {rig.areaName && <p><strong>Área:</strong> {rig.areaName}</p>}
        </div>
        <p className="text-sm text-gray-500">
          Esta acción no se puede deshacer.
        </p>
      </div>,
      {
        title: 'Confirmar Eliminación',
        size: 'md',
        showConfirmButton: true,
        showCancelButton: true,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        onConfirm: async () => {
          try {
            await rigsApi.delete(rig.id);
            toast.success('Taladro eliminado exitosamente');

            // Push deletion to cloud in background
            if (sessionToken) {
              backgroundPush(sessionToken);
            }

            loadData();
          } catch (error) {
            console.error('Error eliminando taladro:', error);
            toast.error('Error al eliminar el taladro');
          }
        },
      }
    );
  };

  // Filtrar taladros
  const filteredRigs = rigs.filter((rig) => {
    const matchesSearch =
      rig.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rig.operator.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rig.areaName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const matchesArea = !filterArea || rig.areaId === filterArea;

    return matchesSearch && matchesArea;
  });

  // Preparar opciones para el filtro de área
  const areaFilterOptions = [
    { value: '', label: 'Todas las áreas' },
    ...areas
      .filter((area) => area.active)
      .map((area) => ({
        value: area.id,
        label: area.name,
      })),
  ];

  // Columnas de la tabla con función render
  const columns = [
    { 
      key: 'name', 
      header: 'Nombre',
      render: (rig: RigWithArea) => <span className="font-medium">{rig.name}</span>
    },
    { 
      key: 'operator', 
      header: 'Operador',
      render: (rig: RigWithArea) => rig.operator
    },
    { 
      key: 'power', 
      header: 'Potencia',
      render: (rig: RigWithArea) => rig.power
    },
    { 
      key: 'area', 
      header: 'Área',
      render: (rig: RigWithArea) => rig.areaName ? (
        <div className="text-sm">
          <div className="font-medium">{rig.areaName}</div>
          <div className="text-gray-500">
            {rig.areaCountry}, {rig.areaState}
          </div>
        </div>
      ) : (
        <span className="text-gray-400 italic">Sin área asignada</span>
      )
    },
    { 
      key: 'status', 
      header: 'Estado',
      render: (rig: RigWithArea) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            rig.active
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {rig.active ? 'Activo' : 'Inactivo'}
        </span>
      )
    },
    { 
      key: 'actions', 
      header: 'Acciones',
      render: (rig: RigWithArea) => (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleEdit(rig)}
            title="Editar"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(rig)}
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestión de Taladros</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Administra los taladros petroleros y sus áreas de operación
          </p>
        </div>
        <Button variant="primary" 
          onClick={handleCreate}
          icon={<Plus/>}
        >
          Crear Taladro
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Búsqueda */}
          <div className="md:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="search"
                type="text"
                placeholder="Buscar por nombre, operador o área..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filtro por área */}
          <div>
            <label htmlFor="filterArea" className="block text-sm font-medium text-gray-700 mb-1">
              Filtrar por Área
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Select
                id="filterArea"
                value={filterArea}
                onChange={(e) => setFilterArea(e.target.value)}
                options={areaFilterOptions}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Checkbox incluir inactivos */}
        <div className="mt-4 flex items-center">
          <input
            type="checkbox"
            id="includeInactive"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="includeInactive" className="ml-2 text-sm text-gray-700">
            Incluir taladros inactivos
          </label>
        </div>
      </Card>

      {/* Tabla */}
      <Card>
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Cargando taladros...</p>
          </div>
        ) : filteredRigs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchTerm || filterArea
                ? 'No se encontraron taladros con los filtros aplicados'
                : 'No hay taladros registrados'}
            </p>
            {!searchTerm && !filterArea && (
              <Button 
                variant="primary" 
                onClick={handleCreate} 
                className="mt-4" 
                icon={<Plus className="w-4 h-4 mr-2" />}
              >
                Crear Primer Taladro
              </Button>
            )}
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={filteredRigs}
            />
            <div className="mt-4 text-sm text-gray-600">
              Mostrando {filteredRigs.length} de {rigs.length} taladros
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
