import { useState, useEffect } from 'react';
import { Button, Input } from '../ui';
import { Plus, Edit, Trash2, Save, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { operationCodesApi } from '../../lib/api';
import type { OperationCode } from '../../types/report';

export function OperationCodesManagement() {
  const { sessionToken } = useAuthStore();
  const [codes, setCodes] = useState<OperationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '',
    sortOrder: 0,
    active: true,
  });

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    if (!sessionToken) return;

    setLoading(true);
    try {
      const data = await operationCodesApi.list(sessionToken, false); // Include inactive
      setCodes(data);
    } catch (error) {
      console.error('Error loading codes:', error);
      alert('Error al cargar códigos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!sessionToken) return;

    if (!formData.code || !formData.name) {
      alert('Código y nombre son requeridos');
      return;
    }

    try {
      await operationCodesApi.create(sessionToken, formData);
      alert('Código creado exitosamente');
      setShowCreateForm(false);
      setFormData({
        code: '',
        name: '',
        category: '',
        sortOrder: 0,
        active: true,
      });
      loadCodes();
    } catch (error) {
      console.error('Error creating code:', error);
      alert('Error al crear código');
    }
  };

  const handleUpdate = async (codeId: string) => {
    if (!sessionToken) return;

    try {
      await operationCodesApi.update(sessionToken, codeId, formData);
      alert('Código actualizado exitosamente');
      setEditingId(null);
      loadCodes();
    } catch (error) {
      console.error('Error updating code:', error);
      alert('Error al actualizar código');
    }
  };

  const handleDelete = async (codeId: string) => {
    if (!sessionToken) return;

    if (!confirm('¿Estás seguro de eliminar este código?')) return;

    try {
      await operationCodesApi.delete(sessionToken, codeId);
      alert('Código eliminado exitosamente');
      loadCodes();
    } catch (error) {
      console.error('Error deleting code:', error);
      alert('Error al eliminar código');
    }
  };

  const startEdit = (code: OperationCode) => {
    setEditingId(code.id);
    setFormData({
      code: code.code,
      name: code.name,
      category: code.category || '',
      sortOrder: code.sortOrder,
      active: code.active,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Cargando códigos...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Create Form */}
      {showCreateForm ? (
        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Crear Nuevo Código</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              label="Código *"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="DR"
            />
            <Input
              label="Nombre *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Perforando"
            />
            <Input
              label="Categoría"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Operación"
            />
            <Input
              label="Orden"
              type="number"
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleCreate} icon={<Save size={16} />}>
              Crear Código
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
            Nuevo Código
          </Button>
        </div>
      )}

      {/* Codes Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Código</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Categoría</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Orden</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Estado</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {codes.map((code) => (
              <tr key={code.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                {editingId === code.id ? (
                  <>
                    <td className="px-6 py-4">
                      <Input
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <Input
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <Input
                        type="number"
                        value={formData.sortOrder}
                        onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                        className="text-center"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setFormData({ ...formData, active: !formData.active })}
                        className={`${formData.active ? 'text-green-600' : 'text-gray-400'}`}
                      >
                        {formData.active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleUpdate(code.id)}
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
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{code.code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100">{code.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100">{code.category || '-'}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-900 dark:text-gray-100">{code.sortOrder}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {code.active ? (
                        <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => startEdit(code)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(code.id)}
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

      {codes.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No hay códigos registrados
        </div>
      )}
    </div>
  );
}
