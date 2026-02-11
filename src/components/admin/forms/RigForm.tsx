import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { RigWithArea, CreateRigInput, Area, RigPersonnel, CreateRigPersonnelInput } from '@/types/rig';
import type { Operator } from '@/types/operator';
import { createRigSchema } from '@/schemas/rigSchemas';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { rigPersonnelApi } from '@/lib/api';
import { Plus, Trash2, UserCheck, UserX } from 'lucide-react';

const CREW_POSITIONS = [
  'Perforador',
  'Encuellador',
  'Cuñero',
  'Arenillero',
  'Mecánico',
  'Soldador',
  'Operador Montacargas',
  'Obrero',
  'Supervisor',
  'Otro',
];

interface RigFormProps {
  onSubmit: (data: CreateRigInput) => Promise<string | void>;
  rig?: RigWithArea | null;
  areas: Area[];
  operators: Operator[];
}

export default function RigForm({ onSubmit, rig, areas, operators }: RigFormProps) {
  const [savedRigId, setSavedRigId] = useState<string | null>(rig?.id || null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<CreateRigInput>({
    resolver: zodResolver(createRigSchema),
    defaultValues: rig || {
      name: '',
      operator: '',
      power: '',
      areaId: undefined,
      active: true,
    },
  });

  const activeValue = watch('active');
  const handleFormSubmit = async (data: CreateRigInput) => {
    const submitData = {
      ...data,
      areaId: data.areaId === '' ? undefined : data.areaId,
    };
    const result = await onSubmit(submitData);
    if (typeof result === 'string') {
      setSavedRigId(result);
    }
  };

  const areaOptions = [
    { value: '', label: 'Sin área asignada' },
    ...areas
      .filter((area) => area.active)
      .map((area) => ({
        value: area.id,
        label: `${area.name} (${area.country}, ${area.state})`,
      })),
  ];

  const operatorOptions = [
    { value: '', label: 'Selecciona un operador' },
    ...operators
      .filter((op) => op.active)
      .map((op) => ({
        value: op.name,
        label: op.name,
      })),
  ];

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Fila 1: Nombre, Operador, Potencia */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Ej: TAL-001"
              error={errors.name?.message}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="operator" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Operador <span className="text-red-500">*</span>
            </label>
            <Select
              id="operator"
              {...register('operator')}
              options={operatorOptions}
              error={errors.operator?.message}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="power" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Potencia <span className="text-red-500">*</span>
            </label>
            <Input
              id="power"
              {...register('power')}
              placeholder="Ej: 2000 HP"
              error={errors.power?.message}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Fila 2: Área + Estado + Guardar */}
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label htmlFor="areaId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Área Geográfica
            </label>
            <Select
              id="areaId"
              {...register('areaId')}
              options={areaOptions}
              error={errors.areaId?.message}
              disabled={isSubmitting}
            />
          </div>

          <label htmlFor="active" className="flex items-center gap-2 pb-2 cursor-pointer">
            <input
              type="checkbox"
              id="active"
              {...register('active')}
              className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {activeValue ? 'Activo' : 'Inactivo'}
            </span>
          </label>

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </form>

      {/* Personnel Section */}
      {savedRigId ? (
        <RigPersonnelSection rigId={savedRigId} />
      ) : (
        <div className="border-t pt-6">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Guarda el taladro primero para poder agregar personal de cuadrilla.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Personnel Management Section
// ============================================================================

interface PersonnelRow {
  id?: string;
  name: string;
  ci: string;
  defaultPosition: string;
  active: boolean;
  isNew?: boolean;
  isEditing?: boolean;
}

function RigPersonnelSection({ rigId }: { rigId: string }) {
  const [personnel, setPersonnel] = useState<RigPersonnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRow, setNewRow] = useState<PersonnelRow | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<PersonnelRow>>({});
  const [saving, setSaving] = useState(false);

  const loadPersonnel = useCallback(async () => {
    try {
      const data = await rigPersonnelApi.list(rigId, true);
      setPersonnel(data);
    } catch (error) {
      console.error('Error loading personnel:', error);
    } finally {
      setLoading(false);
    }
  }, [rigId]);

  useEffect(() => {
    loadPersonnel();
  }, [loadPersonnel]);

  const handleAdd = async () => {
    if (!newRow || !newRow.name.trim() || !newRow.defaultPosition) return;

    setSaving(true);
    try {
      const input: CreateRigPersonnelInput = {
        name: newRow.name.trim(),
        ci: newRow.ci.trim() || undefined,
        defaultPosition: newRow.defaultPosition,
      };
      await rigPersonnelApi.create(rigId, input);
      setNewRow(null);
      await loadPersonnel();
    } catch (error) {
      console.error('Error adding personnel:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (person: RigPersonnel) => {
    setEditingId(person.id);
    setEditData({
      name: person.name,
      ci: person.ci || '',
      defaultPosition: person.defaultPosition,
      active: person.active,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editData.name?.trim() || !editData.defaultPosition) return;

    setSaving(true);
    try {
      await rigPersonnelApi.update(editingId, {
        name: editData.name?.trim(),
        ci: editData.ci?.trim() || undefined,
        defaultPosition: editData.defaultPosition,
        active: editData.active,
      });
      setEditingId(null);
      setEditData({});
      await loadPersonnel();
    } catch (error) {
      console.error('Error updating personnel:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      await rigPersonnelApi.delete(id);
      await loadPersonnel();
    } catch (error) {
      console.error('Error deleting personnel:', error);
    } finally {
      setSaving(false);
    }
  };

  const positionOptions = CREW_POSITIONS.map(pos => ({ value: pos, label: pos }));

  return (
    <div className="border-t pt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Personal de Cuadrilla
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Registra el personal asociado a este taladro. Se usará para asignar cuadrillas en los reportes.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setNewRow({ name: '', ci: '', defaultPosition: '', active: true, isNew: true })}
          disabled={!!newRow || saving}
          icon={<Plus size={16} />}
        >
          Agregar Personal
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Cargando personal...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Nombre
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  CI
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Posición
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Estado
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {/* New row for adding */}
              {newRow && (
                <tr className="bg-blue-50 dark:bg-blue-900/20">
                  <td className="px-3 py-2">
                    <Input
                      value={newRow.name}
                      onChange={(e) => setNewRow({ ...newRow, name: e.target.value })}
                      placeholder="Nombre completo"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={newRow.ci}
                      onChange={(e) => setNewRow({ ...newRow, ci: e.target.value })}
                      placeholder="CI"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={newRow.defaultPosition}
                      onChange={(e) => setNewRow({ ...newRow, defaultPosition: e.target.value })}
                      options={[{ value: '', label: 'Seleccionar...' }, ...positionOptions]}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="text-green-600 text-sm">Activo</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={handleAdd}
                        disabled={saving || !newRow.name.trim() || !newRow.defaultPosition}
                      >
                        {saving ? '...' : 'Guardar'}
                      </Button>
                      <button
                        type="button"
                        onClick={() => setNewRow(null)}
                        className="text-gray-500 hover:text-gray-700 p-1"
                      >
                        Cancelar
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Existing personnel rows */}
              {personnel.length === 0 && !newRow ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-500 text-sm">
                    No hay personal registrado. Haz clic en "Agregar Personal" para comenzar.
                  </td>
                </tr>
              ) : (
                personnel.map((person) => (
                  <tr key={person.id} className={!person.active ? 'opacity-50' : ''}>
                    {editingId === person.id ? (
                      <>
                        <td className="px-3 py-2">
                          <Input
                            value={editData.name || ''}
                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            value={editData.ci || ''}
                            onChange={(e) => setEditData({ ...editData, ci: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Select
                            value={editData.defaultPosition || ''}
                            onChange={(e) => setEditData({ ...editData, defaultPosition: e.target.value })}
                            options={[{ value: '', label: 'Seleccionar...' }, ...positionOptions]}
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => setEditData({ ...editData, active: !editData.active })}
                            className={`inline-flex items-center gap-1 text-sm ${editData.active ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {editData.active ? <UserCheck size={14} /> : <UserX size={14} />}
                            {editData.active ? 'Activo' : 'Inactivo'}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              onClick={handleSaveEdit}
                              disabled={saving}
                            >
                              {saving ? '...' : 'Guardar'}
                            </Button>
                            <button
                              type="button"
                              onClick={() => { setEditingId(null); setEditData({}); }}
                              className="text-gray-500 hover:text-gray-700 p-1 text-sm"
                            >
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                          {person.name}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                          {person.ci || '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                          {person.defaultPosition}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                            person.active
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {person.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(person)}
                              className="text-blue-600 hover:text-blue-800 text-sm transition-colors"
                              disabled={saving}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(person.id)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              disabled={saving}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-xs text-blue-800 dark:text-blue-300">
          <strong>Nota:</strong> El personal registrado aquí estará disponible para selección al crear reportes para este taladro.
          Solo el personal activo aparecerá en las opciones de cuadrilla.
        </p>
      </div>
    </div>
  );
}
