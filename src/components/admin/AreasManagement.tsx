import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { areasApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { backgroundPush } from '@/lib/syncHelper';
import { useModal } from '@/store/modalStore';
import type { Area } from '@/types/rig';
import AreaForm from './forms/AreaForm';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table } from '@/components/ui/Table';
import { Card } from '@/components/ui/Card';

export default function AreasManagement() {
  const user = useAuthStore((state) => state.user);
  const sessionToken = useAuthStore((state) => state.sessionToken);
  const { openModal, closeModal } = useModal();
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
    openModal(
      <AreaForm 
        onSubmit={async (data) => {
          try {
            await areasApi.create(user!.id, data);
            toast.success('Área creada exitosamente');
            closeModal();
            loadAreas();
            if (sessionToken) backgroundPush(sessionToken);
          } catch (error) {
            console.error('Error creando área:', error);
            toast.error('Error al crear el área');
          }
        }}
      />,
      {
        title: 'Crear Nueva Área',
        size: 'md',
        showCloseButton: true,
      }
    );
  };

  // Abrir modal para editar
  const handleEdit = (area: Area) => {
    openModal(
      <AreaForm 
        area={area}
        onSubmit={async (data) => {
          try {
            await areasApi.update(area.id, user!.id, data);
            toast.success('Área actualizada exitosamente');
            closeModal();
            loadAreas();
            if (sessionToken) backgroundPush(sessionToken);
          } catch (error) {
            console.error('Error actualizando área:', error);
            toast.error('Error al actualizar el área');
          }
        }}
      />,
      {
        title: 'Editar Área',
        size: 'md',
        showCloseButton: true,
      }
    );
  };

  // Eliminar área con confirmación
  const handleDelete = (area: Area) => {
    openModal(
      <div className="space-y-3">
        <p className="text-gray-700">
          ¿Estás seguro de eliminar el área <strong className="text-gray-900">"{area.name}"</strong>?
        </p>
        <p className="text-sm text-gray-500">
          Esta acción no se puede deshacer.
        </p>
      </div>,
      {
        title: 'Confirmar Eliminación',
        size: 'sm',
        showConfirmButton: true,
        showCancelButton: true,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        onConfirm: async () => {
          try {
            await areasApi.delete(area.id);
            toast.success('Área eliminada exitosamente');
            loadAreas();
            if (sessionToken) backgroundPush(sessionToken);
          } catch (error) {
            console.error('Error eliminando área:', error);
            toast.error('Error al eliminar el área');
          }
        },
      }
    );
  };

  // Filtrar áreas
  const filteredAreas = areas.filter((area) => {
    const matchesSearch =
      area.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      area.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      area.state.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Columnas de la tabla con función render
  const columns = [
    { 
      key: 'name', 
      header: 'Nombre',
      render: (area: Area) => <span className="font-medium">{area.name}</span>
    },
    { 
      key: 'country', 
      header: 'País',
      render: (area: Area) => area.country
    },
    { 
      key: 'state', 
      header: 'Estado/Provincia',
      render: (area: Area) => area.state
    },
    { 
      key: 'status', 
      header: 'Estado',
      render: (area: Area) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            area.active
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {area.active ? 'Activa' : 'Inactiva'}
        </span>
      )
    },
    { 
      key: 'actions', 
      header: 'Acciones',
      render: (area: Area) => (
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
      )
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestión de Áreas</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Administra las áreas geográficas donde operan los taladros
          </p>
        </div>
        <Button variant="primary" 
          onClick={handleCreate}
          icon={ <Plus />}
          >
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
              <Button variant="primary" 
                onClick={handleCreate} 
                className="mt-4"
                icon={ <Plus />}
              >
                Crear Primera Área
              </Button>
            )}
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={filteredAreas}
              pagination={true}
              pageSize={5}
              pageSizeOptions={[5, 10, 20, 50]}
              hoverable={true}
              striped={true}
            />
          </>
        )}
      </Card>
    </div>
  );
}
