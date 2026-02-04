import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { areasApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { Area, CreateAreaInput, UpdateAreaInput } from '@/types/rig';
import AreaFormModal from './AreaFormModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table } from '@/components/ui/Table';
import { Card } from '@/components/ui/Card';

export default function AreasManagement() {
  const user = useAuthStore((state) => state.user);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalState, setModalState] = useState({
    isOpen: false,
    area: null as Area | null,
  });

  // Cargar áreas
  useEffect(() => {
    loadAreas();
  }, [includeInactive]);

  const loadAreas = async () => {
    setLoading(true);
    try {
      const data = await areasApi.list(includeInactive);
      setAreas(data);
    } catch (error) {
      console.error('Error cargando áreas:', error);
      toast.error('Error al cargar las áreas');
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal para crear
  const handleCreate = () => {
    setModalState({ isOpen: true, area: null });
  };

  // Abrir modal para editar
  const handleEdit = (area: Area) => {
    setModalState({ isOpen: true, area });
  };

  // Cerrar modal
  const handleCloseModal = () => {
    setModalState({ isOpen: false, area: null });
  };

  // Guardar (crear o actualizar)
  const handleSubmit = async (data: CreateAreaInput | UpdateAreaInput) => {
    try {
      if (modalState.area) {
        // Actualizar
        await areasApi.update(modalState.area.id, user!.id, data);
        toast.success('Área actualizada exitosamente');
      } else {
        // Crear
        await areasApi.create(user!.id, data as CreateAreaInput);
        toast.success('Área creada exitosamente');
      }
      handleCloseModal();
      loadAreas();
    } catch (error) {
      console.error('Error guardando área:', error);
      toast.error('Error al guardar el área');
    }
  };

  // Eliminar área
  const handleDelete = async (area: Area) => {
    if (!confirm(`¿Estás seguro de eliminar el área "${area.name}"?`)) {
      return;
    }

    try {
      await areasApi.delete(area.id);
      toast.success('Área eliminada exitosamente');
      loadAreas();
    } catch (error) {
      console.error('Error eliminando área:', error);
      toast.error('Error al eliminar el área');
    }
  };

  // Filtrar áreas
  const filteredAreas = areas.filter((area) => {
    const matchesSearch =
      area.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      area.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      area.state.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Columnas de la tabla
  const columns = [
    { key: 'name', header: 'Nombre' },
    { key: 'country', header: 'País' },
    { key: 'state', header: 'Estado/Provincia' },
    { key: 'status', header: 'Estado' },
    { key: 'actions', header: 'Acciones' },
  ];

  // Renderizar filas de la tabla
  const renderRow = (area: Area) => ({
    name: <span className="font-medium">{area.name}</span>,
    country: area.country,
    state: area.state,
    status: (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${
          area.active
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
        }`}
      >
        {area.active ? 'Activa' : 'Inactiva'}
      </span>
    ),
    actions: (
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleEdit(area)}
          title="Editar"
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={() => handleDelete(area)}
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
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Áreas</h2>
          <p className="text-sm text-gray-600 mt-1">
            Administra las áreas geográficas donde operan los taladros
          </p>
        </div>
        <Button variant="primary" onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Crear Área
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Búsqueda */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="search"
                type="text"
                placeholder="Buscar por nombre, país o estado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Espacio vacío para mantener diseño simétrico */}
          <div></div>
        </div>

        {/* Checkbox incluir inactivas */}
        <div className="mt-4 flex items-center">
          <input
            type="checkbox"
            id="includeInactive"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="includeInactive" className="ml-2 text-sm text-gray-700">
            Incluir áreas inactivas
          </label>
        </div>
      </Card>

      {/* Tabla */}
      <Card>
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Cargando áreas...</p>
          </div>
        ) : filteredAreas.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchTerm
                ? 'No se encontraron áreas con los filtros aplicados'
                : 'No hay áreas registradas'}
            </p>
            {!searchTerm && (
              <Button variant="primary" onClick={handleCreate} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Crear Primera Área
              </Button>
            )}
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={filteredAreas.map(renderRow)}
            />
            <div className="mt-4 text-sm text-gray-600">
              Mostrando {filteredAreas.length} de {areas.length} áreas
            </div>
          </>
        )}
      </Card>

      {/* Modal de formulario */}
      <AreaFormModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        area={modalState.area}
      />
    </div>
  );
}
