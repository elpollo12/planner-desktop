import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui';
import { Table } from '../ui/Table';
import { Plus, Pencil } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useModal } from '../../store/modalStore';
import { fluidProductsApi } from '../../lib/api';
import { toast } from '../../lib/toast';
import { backgroundPush } from '../../lib/syncHelper';
import FluidProductForm from './forms/FluidProductForm';
import type { FluidProduct } from '../../types/fluid';

export default function FluidProductCatalog() {
  const { t } = useTranslation();
  const { sessionToken } = useAuthStore();
  const { openModal, closeModal } = useModal();
  const [products, setProducts] = useState<FluidProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionToken) load();
  }, [sessionToken]);

  const load = async () => {
    if (!sessionToken) return;
    setLoading(true);
    try {
      setProducts(await fluidProductsApi.listAll(sessionToken));
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error(t('fluids.catalog.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    openModal(
      <FluidProductForm
        onSubmit={async (data) => {
          await fluidProductsApi.create(sessionToken!, data);
          toast.success(t('fluids.catalog.created'));
          closeModal();
          load();
          backgroundPush(sessionToken!);
        }}
        onCancel={closeModal}
      />,
      { title: t('fluids.catalog.newProduct'), size: 'md', showCloseButton: true },
    );
  };

  const handleEdit = (p: FluidProduct) => {
    openModal(
      <FluidProductForm
        product={p}
        onSubmit={async (data) => {
          await fluidProductsApi.update(sessionToken!, p.id, data);
          toast.success(t('fluids.catalog.updated'));
          closeModal();
          load();
          backgroundPush(sessionToken!);
        }}
        onCancel={closeModal}
      />,
      { title: t('fluids.catalog.editProduct', { code: p.code, name: p.name }), size: 'md', showCloseButton: true },
    );
  };

  const handleToggleActive = async (p: FluidProduct) => {
    if (!sessionToken) return;
    try {
      await fluidProductsApi.update(sessionToken, p.id, { active: !p.active });
      toast.success(p.active ? t('fluids.catalog.deactivated') : t('fluids.catalog.activated'));
      backgroundPush(sessionToken);
      load();
    } catch (error) {
      console.error('Error toggling product:', error);
      toast.error(t('fluids.catalog.errorToggle'));
    }
  };

  const columns = [
    {
      key: 'code',
      header: t('fluids.catalog.colCode'),
      render: (p: FluidProduct) => (
        <span className="font-medium text-primary-600 dark:text-primary-400">{p.code}</span>
      ),
    },
    {
      key: 'name',
      header: t('fluids.catalog.colName'),
      render: (p: FluidProduct) => <span>{p.name}</span>,
    },
    {
      key: 'ge',
      header: t('fluids.catalog.colGe'),
      render: (p: FluidProduct) => (
        <span className="text-gray-600 dark:text-gray-400">{p.ge ?? '—'}</span>
      ),
    },
    {
      key: 'package',
      header: t('fluids.catalog.colPackage'),
      render: (p: FluidProduct) => (
        <span className="text-gray-600 dark:text-gray-400">{p.package || '—'}</span>
      ),
    },
    {
      key: 'weightLbs',
      header: t('fluids.catalog.colWeight'),
      render: (p: FluidProduct) => (
        <span className="text-gray-600 dark:text-gray-400">{p.weightLbs ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: t('fluids.catalog.colStatus'),
      render: (p: FluidProduct) => (
        <button
          type="button"
          onClick={() => handleToggleActive(p)}
          className={`inline-block px-2 py-0.5 rounded text-xs font-medium cursor-pointer ${
            p.active
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200'
          }`}
        >
          {p.active ? t('fluids.catalog.active') : t('fluids.catalog.inactive')}
        </button>
      ),
    },
    {
      key: 'actions',
      header: t('fluids.catalog.colActions'),
      render: (p: FluidProduct) => (
        <Button variant="secondary" size="sm" onClick={() => handleEdit(p)} title={t('fluids.catalog.edit')}>
          <Pencil size={14} />
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={handleCreate}>
          {t('fluids.catalog.addProduct')}
        </Button>
      </div>

      {products.length === 0 ? (
        <p className="text-center py-6 text-sm text-gray-400 dark:text-gray-500">
          {t('fluids.catalog.empty')}
        </p>
      ) : (
        <Table columns={columns} data={products} pagination pageSize={5} pageSizeOptions={[5, 10, 15]} hoverable striped />
      )}
    </div>
  );
}
