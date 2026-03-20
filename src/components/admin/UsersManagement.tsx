import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Edit, Plus, Search } from 'lucide-react';
import { usersApi, rigsApi, modulePermissionsApi, companiesApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { backgroundPush } from '@/lib/syncHelper';
import { useModal } from '@/store/modalStore';
import type { UserRole, UserWithRigs } from '@/types/user';
import type { Rig } from '@/types/rig';
import type { Company } from '@/types/company';
import UserCreateForm from './forms/UserCreateForm';
import UserEditForm   from './forms/UserEditForm';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table } from '@/components/ui/Table';
import { Card } from '@/components/ui/Card';

export function UsersManagement() {
  const { t } = useTranslation();
  const { sessionToken, user: currentUser } = useAuthStore();
  const { openModal, closeModal } = useModal();
  const [users, setUsers] = useState<UserWithRigs[]>([]);
  const [rigs, setRigs] = useState<Rig[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  // Cargar usuarios y taladros
  useEffect(() => {
    if (sessionToken) {
      loadData();
    }
  }, [sessionToken]);

  const loadData = async () => {
    if (!sessionToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [usersData, rigsData, companiesData] = await Promise.all([
        usersApi.list(sessionToken),
        rigsApi.list(false),
        companiesApi.list(sessionToken),
      ]);
      setUsers(usersData as UserWithRigs[]);
      setRigs(rigsData);
      setCompanies(companiesData);
    } catch (error) {
      toast.error(t('admin.users.loadError'));
    } finally {
      setLoading(false);
    }
  };

  // Filtrar supervisores activos para el select
  const activeSupervisors = users.filter(u => u.role === 'supervisor' && u.active !== false);

  // Lookup map: company id → name
  const companiesMap: Record<string, string> = {};
  for (const c of companies) {
    companiesMap[c.id] = c.name;
  }

  // Abrir modal para crear
  const handleCreate = () => {
    openModal(
      <UserCreateForm
        rigs={rigs}
        supervisors={activeSupervisors}
        sessionToken={sessionToken!}
        onSubmit={async (data) => {
          try {
            const created = await usersApi.create(sessionToken!, {
              username:       data.username,
              password:       data.password,
              fullName:       data.fullName,
              ci:             data.ci || undefined,
              role:           data.role,
              companyId:      data.companyId || undefined,
              hasAllRigs:     data.hasAllRigs,
              assignedRigIds: data.hasAllRigs ? [] : data.assignedRigIds,
              supervisorId:   data.supervisorId,
            });
            if (data.modulePermissions && data.role !== 'admin' && created?.id) {
              await modulePermissionsApi.save(sessionToken!, created.id, data.modulePermissions);
            }
            toast.success(t('admin.users.created'));
            closeModal();
            loadData();
            backgroundPush(sessionToken!);
          } catch (error: any) {
            toast.error(error.message || t('admin.users.createError'));
          }
        }}
      />,
      {
        title: t('admin.users.createTitle'),
        size: 'lg',
        showCloseButton: true,
      }
    );
  };

  // Abrir modal para editar
  const handleEdit = (user: UserWithRigs) => {
    openModal(
      <UserEditForm
        user={user}
        rigs={rigs}
        supervisors={activeSupervisors}
        currentUserId={currentUser?.id}
        sessionToken={sessionToken!}
        onSubmit={async (data) => {
          try {
            await usersApi.update(sessionToken!, user.id, {
              fullName:       data.fullName,
              ci:             data.ci || undefined,
              role:           data.role,
              active:         data.active,
              companyId:      data.companyId || null,
              hasAllRigs:     data.hasAllRigs,
              assignedRigIds: data.hasAllRigs ? [] : data.assignedRigIds,
              supervisorId:   data.role === 'operator' ? (data.supervisorId || null) : null,
            });
          } catch (error: any) {
            toast.error(error.message || t('admin.users.updateError'));
            return;
          }
          if (data.modulePermissions && data.role !== 'admin') {
            try {
              await modulePermissionsApi.save(sessionToken!, user.id, data.modulePermissions);
            } catch (error: any) {
              toast.error(t('admin.users.updatePartial', { error: error.message || error }));
              loadData();
              return;
            }
          }
          loadData();
          backgroundPush(sessionToken!);
        }}
      />,
      {
        title: t('admin.users.editTitle', { username: user.username }),
        size: 'lg',
        showCloseButton: true,
      }
    );
  };


  // Filtrar usuarios
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.fullName && user.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.ci && user.ci.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesActive = includeInactive || user.active !== false;

    return matchesSearch && matchesActive;
  });

  // Funciones helper para mostrar datos
  const getRoleBadge = (role: UserRole) => {
    const badges = {
      admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      supervisor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      operator: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    };

    const labels = {
      admin: t('admin.users.admin'),
      supervisor: t('admin.users.supervisorRole'),
      operator: t('admin.users.operator'),
    };

    return (
      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${badges[role]}`}>
        {labels[role]}
      </span>
    );
  };

  const getRigAccessBadge = (user: UserWithRigs) => {
    if (user.role === 'admin') {
      return <span className="text-xs text-purple-600 dark:text-purple-400">{t('admin.users.allAdmin')}</span>;
    }
    if (user.hasAllRigs) {
      return <span className="text-xs text-green-600 dark:text-green-400">{t('admin.users.allRigs')}</span>;
    }
    const count = user.assignedRigIds?.length || 0;
    if (count === 0) {
      return <span className="text-xs text-red-600 dark:text-red-400">{t('admin.users.noAccess')}</span>;
    }
    return <span className="text-xs text-blue-600 dark:text-blue-400">{t('admin.users.rigsCount', { count })}</span>;
  };

  // Columnas de la tabla
  const columns = [
    { 
      key: 'username',
      header: t('admin.users.user'),
      truncate: true,
      maxWidth: '150px',
      render: (user: UserWithRigs) => (
        <div className="truncate" title={user.username}>
          <span className="font-medium text-gray-900 dark:text-gray-100">{user.username}</span>
        </div>
      )
    },
    { 
      key: 'fullName',
      header: t('admin.users.fullName'),
      truncate: true,
      maxWidth: '200px',
      render: (user: UserWithRigs) => (
        <span className="text-gray-700 dark:text-gray-300 truncate block" title={user.fullName || '-'}>
          {user.fullName || '-'}
        </span>
      )
    },
    { 
      key: 'ci',
      header: t('admin.users.idCard'),
      render: (user: UserWithRigs) => (
        <span className="text-gray-700 dark:text-gray-300">{user.ci || '-'}</span>
      )
    },
    {
      key: 'role',
      header: t('admin.users.role'),
      render: (user: UserWithRigs) => getRoleBadge(user.role)
    },
    {
      key: 'company',
      header: t('admin.users.company'),
      render: (user: UserWithRigs) => (
        <span className="text-gray-700 dark:text-gray-300 text-sm">
          {user.companyId ? (companiesMap[user.companyId] || '\u2014') : '\u2014'}
        </span>
      )
    },
    {
      key: 'supervisor',
      header: t('admin.users.supervisor'),
      render: (user: UserWithRigs) => {
        if (user.role !== 'operator' || !user.supervisorId) {
          return <span className="text-gray-400">-</span>;
        }
        const supervisor = users.find(u => u.id === user.supervisorId);
        return (
          <span className="text-gray-700 dark:text-gray-300 text-sm">
            {supervisor ? (supervisor.fullName || supervisor.username) : '-'}
          </span>
        );
      }
    },
    {
      key: 'status',
      header: t('admin.users.status'),
      render: (user: UserWithRigs) => (
        <span
          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
            user.active !== false
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
          }`}
        >
          {user.active !== false ? t('admin.users.active') : t('admin.users.inactive')}
        </span>
      )
    },
    {
      key: 'access',
      header: t('admin.users.rigAccess'),
      render: (user: UserWithRigs) => getRigAccessBadge(user)
    },
    { 
      key: 'actions',
      header: t('admin.users.actions'),
      width: '80px',
      render: (user: UserWithRigs) => (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleEdit(user)}
            title={t('admin.users.edit')}
            icon={<Edit className="w-4 h-4" />}
          >
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('admin.users.title')}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('admin.users.subtitle')}
          </p>
        </div>
        <Button 
          variant="primary" 
          onClick={handleCreate}
          icon={<Plus className="w-4 h-4" />}
        >
          {t('admin.users.newUser')}
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Búsqueda */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('admin.users.search')}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="search"
                type="text"
                placeholder={t('admin.users.searchPlaceholder')}
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
            {t('admin.users.includeInactive')}
          </label>
        </div>
      </Card>

      {/* Tabla */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">{t('admin.users.loading')}</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm
                ? t('admin.users.noResults')
                : t('admin.users.noUsers')}
            </p>
            {!searchTerm && (
              <Button 
                variant="primary" 
                onClick={handleCreate} 
                className="mt-4"
                icon={<Plus className="w-4 h-4" />}
              >
                {t('admin.users.createFirst')}
              </Button>
            )}
          </div>
        ) : (
          <Table
            columns={columns}
            data={filteredUsers}
            pagination={true}
            pageSize={5}
            pageSizeOptions={[5, 10, 20, 50]}
            hoverable={true}
            striped={true}
          />
        )}
      </Card>
    </div>
  );
}