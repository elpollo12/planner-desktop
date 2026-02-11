import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { operationCodesApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useModal } from '@/store/modalStore';
import type { OperationCode } from '@/types/report';
import OperationCodeForm from './forms/OperationCodeForm';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table } from '@/components/ui/Table';
import { Card } from '@/components/ui/Card';

export function OperationCodesManagement() {
  const { sessionToken } = useAuthStore();
  const { openModal, closeModal } = useModal();
  const [codes, setCodes] = useState<OperationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Cargar códigos
  useEffect(() => {
    if (sessionToken) {
      loadCodes();
    }
  }, [sessionToken, includeInactive]);

  const loadCodes = async () => {
    if (!sessionToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await operationCodesApi.list(sessionToken, !includeInactive);
      setCodes(data);
    } catch (error) {
      console.error('Error cargando códigos:', error);
      toast.error('Error al cargar los códigos de operación');
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal para crear
  const handleCreate = () => {
    openModal(
      <OperationCodeForm 
        onSubmit={async (data) => {
          try {
            await operationCodesApi.create(sessionToken!, data);
            toast.success('Código creado exitosamente');
            closeModal();
            loadCodes();
          } catch (error: any) {
            console.error('Error creando código:', error);
            toast.error(error.message || 'Error al crear el código');
          }
        }}
      />,
      {
        title: 'Crear Nuevo Código',
        size: 'md',
        showCloseButton: true,
      }
    );
  };

  // Abrir modal para editar
  const handleEdit = (code: OperationCode) => {
    openModal(
      <OperationCodeForm 
        code={code}
        onSubmit={async (data) => {
          try {
            await operationCodesApi.update(sessionToken!, code.id, data);
            toast.success('Código actualizado exitosamente');
            closeModal();
            loadCodes();
          } catch (error: any) {
            console.error('Error actualizando código:', error);
            toast.error(error.message || 'Error al actualizar el código');
          }
        }}
      />,
      {
        title: `Editar Código: ${code.code}`,
        size: 'md',
        showCloseButton: true,
      }
    );
  };

  // Eliminar código con confirmación
  const handleDelete = (code: OperationCode) => {
    openModal(
      <div className="space-y-3">
        <p className="text-gray-700">
          ¿Estás seguro de eliminar el código <strong className="text-gray-900">"{code.code} - {code.name}"</strong>?
        </p>
        <p className="text-sm text-gray-500">
          Esta acción no se puede deshacer. Los reportes que usen este código quedarán sin código asignado.
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
            await operationCodesApi.delete(sessionToken!, code.id);
            toast.success('Código eliminado exitosamente');
            loadCodes();
          } catch (error: any) {
            console.error('Error eliminando código:', error);
            toast.error(error.message || 'Error al eliminar el código');
          }
        },
      }
    );
  };

  // Filtrar códigos
  const filteredCodes = codes.filter((code) => {
    const matchesSearch =
      code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (code.category && code.category.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesSearch;
  });

  // Columnas de la tabla
  const columns = [
    { 
      key: 'code', 
      header: 'Código',
      render: (code: OperationCode) => (
        <div>
          <span className="font-medium text-gray-900 dark:text-gray-100">{code.code}</span>
        </div>
      )
    },
    { 
      key: 'name', 
      header: 'Nombre',
      render: (code: OperationCode) => (
        <span className="text-gray-700 dark:text-gray-300">{code.name}</span>
      )
    },
    { 
      key: 'category', 
      header: 'Categoría',
      render: (code: OperationCode) => (
        <span className="text-gray-600 dark:text-gray-400">{code.category || '-'}</span>
      )
    },
    { 
      key: 'sortOrder', 
      header: 'Orden',
      render: (code: OperationCode) => (
        <span className="text-center block text-gray-700 dark:text-gray-300">{code.sortOrder}</span>
      )
    },
    { 
      key: 'status', 
      header: 'Estado',
      render: (code: OperationCode) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            code.active
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
          }`}
        >
          {code.active ? 'Activo' : 'Inactivo'}
        </span>
      )
    },
    { 
      key: 'actions', 
      header: 'Acciones',
      render: (code: OperationCode) => (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleEdit(code)}
            title="Editar"
            className="h-8 w-8 p-0"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(code)}
            title="Eliminar"
            className="h-8 w-8 p-0"
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Códigos de Operación</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Administra los códigos de operación para reportes de taladros
          </p>
        </div>
        <Button 
          variant="primary" 
          onClick={handleCreate}
          icon={<Plus className="w-4 h-4" />}
        >
          Nuevo Código
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Búsqueda */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="search"
                type="text"
                placeholder="Buscar por código, nombre o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
              />
            </div>
          </div>

          <div></div> {/* Espacio vacío para mantener diseño */}
        </div>

        {/* Checkbox incluir inactivos */}
        <div className="mt-4 flex items-center">
          <input
            type="checkbox"
            id="includeInactive"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
          />
          <label htmlFor="includeInactive" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Incluir códigos inactivos
          </label>
        </div>
      </Card>

      {/* Tabla */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Cargando códigos...</p>
          </div>
        ) : filteredCodes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm
                ? 'No se encontraron códigos con los filtros aplicados'
                : 'No hay códigos registrados'}
            </p>
            {!searchTerm && (
              <Button 
                variant="primary" 
                onClick={handleCreate} 
                className="mt-4"
                icon={<Plus className="w-4 h-4" />}
              >
                Crear Primer Código
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table
                columns={columns}
                data={filteredCodes}
                className="min-w-full"
              />
            </div>
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Mostrando {filteredCodes.length} de {codes.length} códigos
            </div>
          </>
        )}
      </Card>
    </div>
  );
}