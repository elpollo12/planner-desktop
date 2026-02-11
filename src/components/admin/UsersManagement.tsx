import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Edit, Plus, Search, Trash2 } from 'lucide-react';
import { usersApi, rigsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useModal } from '@/store/modalStore';
import type { UserRole, UserWithRigs } from '@/types/user';
import type { Rig } from '@/types/rig';
import UsersForm from './forms/UsersForm';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table } from '@/components/ui/Table';
import { Card } from '@/components/ui/Card';

export function UsersManagement() {
  const { sessionToken } = useAuthStore();
  const { openModal, closeModal } = useModal();
  const [users, setUsers] = useState<UserWithRigs[]>([]);
  const [rigs, setRigs] = useState<Rig[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
      const [usersData, rigsData] = await Promise.all([
        usersApi.list(sessionToken),
        rigsApi.list(false),
      ]);
      setUsers(usersData as UserWithRigs[]);
      setRigs(rigsData);
    } catch (error) {
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal para crear
  const handleCreate = () => {
    openModal(
      <UsersForm 
        rigs={rigs}
        onSubmit={async (data) => {
          try {
            await usersApi.create(sessionToken!, {
              username: data.username!,
              password: data.password!,
              fullName: data.fullName,
              ci: data.ci || undefined,
              role: data.role,
              hasAllRigs: data.hasAllRigs,
              assignedRigIds: data.hasAllRigs ? [] : data.assignedRigIds,
            });
            toast.success('Usuario creado exitosamente');
            closeModal();
            loadData();
          } catch (error: any) {
            toast.error(error.message || 'Error al crear el usuario');
          }
        }}
      />,
      {
        title: 'Crear Nuevo Usuario',
        size: 'lg',
        showCloseButton: true,
      }
    );
  };

  // Abrir modal para editar
  const handleEdit = (user: UserWithRigs) => {
    openModal(
      <UsersForm 
        user={user}
        rigs={rigs}
        isEditing={true}
        onSubmit={async (data) => {
          try {
            await usersApi.update(sessionToken!, user.id, {
              fullName: data.fullName,
              ci: data.ci || undefined,
              role: data.role,
              hasAllRigs: data.hasAllRigs,
              assignedRigIds: data.hasAllRigs ? [] : data.assignedRigIds,
            });
            toast.success('Usuario actualizado exitosamente');
            closeModal();
            loadData();
          } catch (error: any) {
            toast.error(error.message || 'Error al actualizar el usuario');
          }
        }}
      />,
      {
        title: `Editar Usuario: ${user.username}`,
        size: 'lg',
        showCloseButton: true,
      }
    );
  };

  // Eliminar usuario con confirmación
  const handleDelete = (user: UserWithRigs) => {
    openModal(
      <div className="space-y-3">
        <p className="text-gray-700">
          ¿Estás seguro de eliminar el usuario <strong className="text-gray-900">"{user.username}"</strong>?
        </p>
        {user.fullName && (
          <p className="text-sm text-gray-600">
            Nombre: {user.fullName}
          </p>
        )}
        <p className="text-sm text-gray-500">
          Esta acción no se puede deshacer. El usuario perderá acceso al sistema inmediatamente.
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
            await usersApi.delete(sessionToken!, user.id);
            toast.success('Usuario eliminado exitosamente');
            loadData();
          } catch (error: any) {
            toast.error(error.message || 'Error al eliminar el usuario');
          }
        },
      }
    );
  };

  // Filtrar usuarios
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.fullName && user.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.ci && user.ci.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesSearch;
  });

  // Funciones helper para mostrar datos
  const getRoleBadge = (role: UserRole) => {
    const badges = {
      admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      supervisor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      operator: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    };

    const labels = {
      admin: 'Administrador',
      supervisor: 'Supervisor',
      operator: 'Operador',
    };

    return (
      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${badges[role]}`}>
        {labels[role]}
      </span>
    );
  };

  const getRigAccessBadge = (user: UserWithRigs) => {
    if (user.role === 'admin') {
      return <span className="text-xs text-purple-600 dark:text-purple-400">Todos (Admin)</span>;
    }
    if (user.hasAllRigs) {
      return <span className="text-xs text-green-600 dark:text-green-400">Todos los taladros</span>;
    }
    const count = user.assignedRigIds?.length || 0;
    if (count === 0) {
      return <span className="text-xs text-red-600 dark:text-red-400">Sin acceso</span>;
    }
    return <span className="text-xs text-blue-600 dark:text-blue-400">{count} taladro(s)</span>;
  };

  // Columnas de la tabla
  const columns = [
    { 
      key: 'username', 
      header: 'Usuario',
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
      header: 'Nombre Completo',
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
      header: 'Cédula',
      render: (user: UserWithRigs) => (
        <span className="text-gray-700 dark:text-gray-300">{user.ci || '-'}</span>
      )
    },
    { 
      key: 'role', 
      header: 'Rol',
      render: (user: UserWithRigs) => getRoleBadge(user.role)
    },
    { 
      key: 'access', 
      header: 'Acceso a Taladros',
      render: (user: UserWithRigs) => getRigAccessBadge(user)
    },
    { 
      key: 'actions', 
      header: 'Acciones',
      width: '120px',
      render: (user: UserWithRigs) => (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleEdit(user)}
            title="Editar"
            icon={<Edit className="w-4 h-4" />}
            className=""
          >
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(user)}
            title="Eliminar"
            icon={<Trash2 className="w-4 h-4"/>}
            className=""
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestión de Usuarios</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Administra los usuarios y sus permisos en el sistema
          </p>
        </div>
        <Button 
          variant="primary" 
          onClick={handleCreate}
          icon={<Plus className="w-4 h-4" />}
        >
          Nuevo Usuario
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
                placeholder="Buscar por usuario, nombre o cédula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
              />
            </div>
          </div>

          <div></div> {/* Espacio vacío para mantener diseño */}
        </div>
      </Card>

      {/* Tabla */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Cargando usuarios...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm
                ? 'No se encontraron usuarios con los filtros aplicados'
                : 'No hay usuarios registrados'}
            </p>
            {!searchTerm && (
              <Button 
                variant="primary" 
                onClick={handleCreate} 
                className="mt-4"
                icon={<Plus className="w-4 h-4" />}
              >
                Crear Primer Usuario
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