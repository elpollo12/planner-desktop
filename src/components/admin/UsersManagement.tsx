import { useState, useEffect } from 'react';
import { Button, Input, Select } from '../ui';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { usersApi, rigsApi } from '../../lib/api';
import type { UserRole, UserWithRigs } from '../../types/user';
import type { Rig } from '../../types/rig';

interface UserFormData {
  username: string;
  password: string;
  fullName: string;
  ci: string;
  role: UserRole;
  hasAllRigs: boolean;
  assignedRigIds: string[];
}

const initialFormData: UserFormData = {
  username: '',
  password: '',
  fullName: '',
  ci: '',
  role: 'operator',
  hasAllRigs: false,
  assignedRigIds: [],
};

export function UsersManagement() {
  const { sessionToken } = useAuthStore();
  const [users, setUsers] = useState<UserWithRigs[]>([]);
  const [rigs, setRigs] = useState<Rig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);

  useEffect(() => {
    if (sessionToken) {
      loadUsers();
      loadRigs();
    } else {
      setLoading(false);
    }
  }, [sessionToken]);

  const loadUsers = async () => {
    if (!sessionToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await usersApi.list(sessionToken);
      setUsers(data as UserWithRigs[]);
    } catch (error) {
      console.error('[UsersManagement] Error loading users:', error);
      alert(`Error al cargar usuarios: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const loadRigs = async () => {
    try {
      const data = await rigsApi.list(false);
      setRigs(data);
    } catch (error) {
      console.error('Error loading rigs:', error);
    }
  };

  const handleCreate = async () => {
    if (!sessionToken) return;

    if (!formData.username || !formData.password) {
      alert('Usuario y contraseña son requeridos');
      return;
    }

    try {
      await usersApi.create(sessionToken, {
        username: formData.username,
        password: formData.password,
        fullName: formData.fullName,
        ci: formData.ci || undefined,
        role: formData.role,
        hasAllRigs: formData.hasAllRigs,
        assignedRigIds: formData.hasAllRigs ? [] : formData.assignedRigIds,
      });
      alert('Usuario creado exitosamente');
      setShowCreateForm(false);
      setFormData(initialFormData);
      loadUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Error al crear usuario: ' + error);
    }
  };

  const handleUpdate = async (userId: string) => {
    if (!sessionToken) return;

    try {
      await usersApi.update(sessionToken, userId, {
        fullName: formData.fullName,
        ci: formData.ci || undefined,
        role: formData.role,
        hasAllRigs: formData.hasAllRigs,
        assignedRigIds: formData.hasAllRigs ? [] : formData.assignedRigIds,
      });
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

  const startEdit = (user: UserWithRigs) => {
    setEditingId(user.id);
    setFormData({
      username: user.username,
      password: '',
      fullName: user.fullName || '',
      ci: user.ci || '',
      role: user.role,
      hasAllRigs: user.hasAllRigs,
      assignedRigIds: user.assignedRigIds || [],
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData(initialFormData);
  };

  const toggleRigSelection = (rigId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedRigIds: prev.assignedRigIds.includes(rigId)
        ? prev.assignedRigIds.filter(id => id !== rigId)
        : [...prev.assignedRigIds, rigId],
    }));
  };

  const selectAllRigs = () => {
    setFormData(prev => ({
      ...prev,
      assignedRigIds: rigs.map(r => r.id),
    }));
  };

  const deselectAllRigs = () => {
    setFormData(prev => ({
      ...prev,
      assignedRigIds: [],
    }));
  };

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

  // Rig selection component
  const RigSelector = () => (
    <div className="col-span-2 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Acceso a Taladros
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.hasAllRigs}
            onChange={(e) => setFormData({ ...formData, hasAllRigs: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Acceso a todos los taladros</span>
        </label>
      </div>

      {!formData.hasAllRigs && (
        <>
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={selectAllRigs}
              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              Seleccionar todos
            </button>
            <span className="text-gray-400">|</span>
            <button
              type="button"
              onClick={deselectAllRigs}
              className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400"
            >
              Deseleccionar todos
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {rigs.map((rig) => (
              <label
                key={rig.id}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                  formData.assignedRigIds.includes(rig.id)
                    ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-300 dark:border-primary-700'
                    : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.assignedRigIds.includes(rig.id)}
                  onChange={() => toggleRigSelection(rig.id)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
                  {rig.name}
                </span>
              </label>
            ))}
          </div>

          {rigs.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No hay taladros registrados
            </p>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {formData.assignedRigIds.length} taladro(s) seleccionado(s)
          </p>
        </>
      )}
    </div>
  );

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

            <RigSelector />
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleCreate} icon={<Save size={16} />}>
              Crear Usuario
            </Button>
            <Button variant="outline" onClick={() => { setShowCreateForm(false); setFormData(initialFormData); }} icon={<X size={16} />}>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acceso</th>
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
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.hasAllRigs}
                            onChange={(e) => setFormData({ ...formData, hasAllRigs: e.target.checked })}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-xs">Todos</span>
                        </label>
                        {!formData.hasAllRigs && (
                          <button
                            onClick={() => {
                              // Show a modal or expand to show rig selection
                              // For simplicity, using alert for now
                              alert(`Seleccionados: ${formData.assignedRigIds.length} taladros.\nUsa el formulario de creación para cambiar la selección completa.`);
                            }}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {formData.assignedRigIds.length} seleccionados
                          </button>
                        )}
                      </div>
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
                    <td className="px-6 py-4">
                      {getRigAccessBadge(user)}
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
