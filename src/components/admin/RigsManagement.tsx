import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Plus, Pencil, Trash2, Search, Filter } from 'lucide-react';
import { rigsApi, areasApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { RigWithArea, Area, CreateRigInput, UpdateRigInput } from '@/types/rig';
import RigFormModal from './RigFormModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table } from '@/components/ui/Table';
import { Card } from '@/components/ui/Card';

export default function RigsManagement() {
  const user = useAuthStore((state) => state.user);
  const [rigs, setRigs] = useState<RigWithArea[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArea, setFilterArea] = useState<string>('');
  const [modalState, setModalState] = useState({
    isOpen: false,
    rig: null as RigWithArea | null,
  });

  // Cargar taladros y áreas
  useEffect(() => {
    loadData();
  }, [includeInactive]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rigsData, areasData] = await Promise.all([
        rigsApi.list(includeInactive),
        areasApi.list(true), // Cargar todas las áreas para el selector
      ]);
      setRigs(rigsData);
      setAreas(areasData);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal para crear
  const handleCreate = () => {
    setModalState({ isOpen: true, rig: null });
  };

  // Abrir modal para editar
  const handleEdit = (rig: RigWithArea) => {
    setModalState({ isOpen: true, rig });
  };

  // Cerrar modal
  const handleCloseModal = () => {
    setModalState({ isOpen: false, rig: null });
  };

  // Guardar (crear o actualizar)
  const handleSubmit = async (data: CreateRigInput | UpdateRigInput) => {
    try {
      if (modalState.rig) {
        // Actualizar
        await rigsApi.update(modalState.rig.id, user!.id, data);
        toast.success('Taladro actualizado exitosamente');
      } else {
        // Crear
        await rigsApi.create(user!.id, data as CreateRigInput);
        toast.success('Taladro creado exitosamente');
      }
      handleCloseModal();
      loadData();
    } catch (error) {
      console.error('Error guardando taladro:', error);
      toast.error('Error al guardar el taladro');
    }
  };

  // Eliminar taladro
  const handleDelete = async (rig: RigWithArea) => {
    if (!confirm(`¿Estás seguro de eliminar el taladro "${rig.name}"?`)) {
      return;
    }

    try {
      await rigsApi.delete(rig.id);
      toast.success('Taladro eliminado exitosamente');
      loadData();
    } catch (error) {
      console.error('Error eliminando taladro:', error);
      toast.error('Error al eliminar el taladro');
    }
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

  // Columnas de la tabla
  const columns = [
    { key: 'name', header: 'Nombre' },
    { key: 'operator', header: 'Operador' },
    { key: 'power', header: 'Potencia' },
    { key: 'area', header: 'Área' },
    { key: 'status', header: 'Estado' },
    { key: 'actions', header: 'Acciones' },
  ];

  // Renderizar filas de la tabla
  const renderRow = (rig: RigWithArea) => ({
    name: rig.name,
    operator: rig.operator,
    power: rig.power,
    area: rig.areaName ? (
      <div className="text-sm">
        <div className="font-medium">{rig.areaName}</div>
        <div className="text-gray-500">
          {rig.areaCountry}, {rig.areaState}
        </div>
      </div>
    ) : (
      <span className="text-gray-400 italic">Sin área asignada</span>
    ),
    status: (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${
          rig.active
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
        }`}
      >
        {rig.active ? 'Activo' : 'Inactivo'}
      </span>
    ),
    actions: (
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
    ),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Taladros</h2>
          <p className="text-sm text-gray-600 mt-1">
            Administra los taladros petroleros y sus áreas de operación
          </p>
        </div>
        <Button variant="primary" onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
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
              <Button variant="primary" onClick={handleCreate} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Crear Primer Taladro
              </Button>
            )}
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={filteredRigs.map(renderRow)}
            />
            <div className="mt-4 text-sm text-gray-600">
              Mostrando {filteredRigs.length} de {rigs.length} taladros
            </div>
          </>
        )}
      </Card>

      {/* Modal de formulario */}
      <RigFormModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        rig={modalState.rig}
        areas={areas}
      />
    </div>
  );
}
