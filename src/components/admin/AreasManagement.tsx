import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      toast.error(t('admin.areas.loadError'));
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
            toast.success(t('admin.areas.created'));
            closeModal();
            loadAreas();
            if (sessionToken) backgroundPush(sessionToken);
          } catch (error) {
            console.error('Error creando área:', error);
            toast.error(t('admin.areas.createError'));
          }
        }}
      />,
      {
        title: t('admin.areas.createTitle'),
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
            toast.success(t('admin.areas.updated'));
            closeModal();
            loadAreas();
            if (sessionToken) backgroundPush(sessionToken);
          } catch (error) {
            console.error('Error actualizando área:', error);
            toast.error(t('admin.areas.updateError'));
          }
        }}
      />,
      {
        title: t('admin.areas.editTitle'),
        size: 'md',
        showCloseButton: true,
      }
    );
  };

  // Eliminar área con confirmación
  const handleDelete = (area: Area) => {
    openModal(
      <div className="space-y-3">
        <p className="text-gray-700 dark:text-gray-300">
          {t('admin.areas.confirmDelete')} <strong className="text-gray-900 dark:text-gray-100">"{area.name}"</strong>?
        </p>
        <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2.5 space-y-1">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">⚠ {t('admin.areas.deleteImpact')}</p>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {t('admin.areas.deleteImpactMsg')}
          </p>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('admin.areas.deleteWarning')}
        </p>
      </div>,
      {
        title: t('admin.areas.confirmDeletion'),
        size: 'sm',
        showConfirmButton: true,
        showCancelButton: true,
        confirmText: t('admin.forms.delete'),
        cancelText: t('admin.forms.cancel'),
        onConfirm: async () => {
          try {
            await areasApi.delete(area.id);
            toast.success(t('admin.areas.deleted'));
            loadAreas();
            if (sessionToken) backgroundPush(sessionToken);
          } catch (error) {
            console.error('Error eliminando área:', error);
            toast.error(t('admin.areas.deleteError'));
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
      header: t('admin.areas.name'),
      render: (area: Area) => <span className="font-medium">{area.name}</span>
    },
    {
      key: 'country',
      header: t('admin.areas.country'),
      render: (area: Area) => area.country
    },
    {
      key: 'state',
      header: t('admin.areas.stateProvince'),
      render: (area: Area) => area.state
    },
    {
      key: 'status',
      header: t('admin.areas.status'),
      render: (area: Area) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            area.active
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {area.active ? t('admin.areas.active') : t('admin.areas.inactive')}
        </span>
      )
    },
    {
      key: 'actions',
      header: t('admin.areas.actions'),
      render: (area: Area) => (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleEdit(area)}
            title={t('admin.forms.edit')}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(area)}
            title={t('admin.forms.delete')}
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('admin.areas.title')}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('admin.areas.subtitle')}
          </p>
        </div>
        <Button variant="primary"
          onClick={handleCreate}
          icon={ <Plus />}
          >
          {t('admin.areas.create')}
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Búsqueda */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.areas.search')}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="search"
                type="text"
                placeholder={t('admin.areas.searchPlaceholder')}
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
            {t('admin.areas.includeInactive')}
          </label>
        </div>
      </Card>

      {/* Tabla */}
      <Card>
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">{t('admin.areas.loading')}</p>
          </div>
        ) : filteredAreas.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchTerm
                ? t('admin.areas.noResults')
                : t('admin.areas.noAreas')}
            </p>
            {!searchTerm && (
              <Button variant="primary" 
                onClick={handleCreate} 
                className="mt-4"
                icon={ <Plus />}
              >
                {t('admin.areas.createFirst')}
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
