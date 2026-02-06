import { useState, useEffect } from 'react';
import { Button, Input, Select } from '../ui';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { usersApi } from '../../lib/api';
import type { User, UserRole } from '../../types/user';

interface UserFormData {
  username: string;
  password: string;
  fullName: string;
  ci: string;
  role: UserRole;
}

export function UsersManagement() {
  const { sessionToken } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    password: '',
    fullName: '',
    ci: '',
    role: 'operator',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    if (!sessionToken) return;

    setLoading(true);
    try {
      const data = await usersApi.list(sessionToken);
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!sessionToken) return;

    if (!formData.username || !formData.password) {
      alert('Usuario y contraseña son requeridos');
      return;
    }

    try {
      await usersApi.create(sessionToken, formData);
      alert('Usuario creado exitosamente');
      setShowCreateForm(false);
      setFormData({
        username: '',
        password: '',
        fullName: '',
        ci: '',
        role: 'operator',
      });
      loadUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Error al crear usuario: ' + error);
    }
  };

  const handleUpdate = async (userId: string) => {
    if (!sessionToken) return;

    try {
      const updateData = {
        fullName: formData.fullName,
        ci: formData.ci,
        role: formData.role,
      };
      await usersApi.update(sessionToken, userId, updateData);
      alert('Usuario actualizado exitosamente');
      setEditingId(null);
      loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error al actualizar usuario');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!sessionToken) return;

    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;

    try {
      await usersApi.delete(sessionToken, userId);
      alert('Usuario eliminado exitosamente');
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error al eliminar usuario');
    }
  };

  const startEdit = (user: User) => {
    setEditingId(user.id);
    setFormData({
      username: user.username,
      password: '',
      fullName: user.fullName || '',
      ci: user.ci || '',
      role: user.role,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const getRoleBadge = (role: UserRole) => {
    const badges = {
      admin: 'bg-purple-100 text-purple-800',
      supervisor: 'bg-blue-100 text-blue-800',
      operator: 'bg-green-100 text-green-800',
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

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Cargando usuarios...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Create Form */}
      {showCreateForm ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-gray-50 dark:bg-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Crear Nuevo Usuario</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              label="Usuario *"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="username"
            />
            <Input
              label="Contraseña *"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="********"
            />
            <Input
              label="Nombre Completo"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Juan Pérez"
            />
            <Input
              label="Cédula (CI)"
              type="text"
              value={formData.ci}
              onChange={(e) => setFormData({ ...formData, ci: e.target.value })}
              placeholder="12345678"
            />
            <Select
              label="Rol *"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
            >
              <option value="operator">Operador</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Administrador</option>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleCreate} icon={<Save size={16} />}>
              Crear Usuario
            </Button>
            <Button variant="outline" onClick={() => setShowCreateForm(false)} icon={<X size={16} />}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={() => setShowCreateForm(true)}
            icon={<Plus size={16} />}
          >
            Nuevo Usuario
          </Button>
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Usuario</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">CI</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rol</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                {editingId === user.id ? (
                  <>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100">{user.username}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Input
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <Input
                        type="text"
                        value={formData.ci}
                        onChange={(e) => setFormData({ ...formData, ci: e.target.value })}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <Select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                      >
                        <option value="operator">Operador</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="admin">Administrador</option>
                      </Select>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleUpdate(user.id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Save size={18} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.username}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100">{user.fullName || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100">{user.ci || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => startEdit(user)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No hay usuarios registrados
        </div>
      )}
    </div>
  );
}
