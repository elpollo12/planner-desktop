import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { CrewPosition } from '@/types/crewPosition';

interface CrewPositionFormProps {
  position?: CrewPosition;
  onSubmit: (data: { name: string; sortOrder?: number }) => Promise<void>;
  onCancel: () => void;
}

export default function CrewPositionForm({ position, onSubmit, onCancel }: CrewPositionFormProps) {
  const [name, setName] = useState(position?.name ?? '');
  const [sortOrder, setSortOrder] = useState(position?.sortOrder !== undefined ? String(position.sortOrder) : '');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'El nombre es requerido';
    if (sortOrder !== '' && isNaN(parseInt(sortOrder))) e.sortOrder = 'Debe ser un número entero';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSubmitting(true);
    try {
      const parsed = parseInt(sortOrder);
      await onSubmit({
        name: name.trim(),
        sortOrder: isNaN(parsed) ? undefined : parsed,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Nombre <span className="text-red-500">*</span>
        </label>
        <Input
          value={name}
          onChange={e => { setName(e.target.value); setErrors(prev => ({ ...prev, name: '' })); }}
          placeholder="Ej: Encuellador, Mecánico, Soldador"
          error={errors.name}
          disabled={submitting || position?.isDefault}
        />
        {position?.isDefault && (
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            Las posiciones predeterminadas no pueden renombrarse.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Orden de visualización <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <Input
          type="number"
          value={sortOrder}
          onChange={e => { setSortOrder(e.target.value); setErrors(prev => ({ ...prev, sortOrder: '' })); }}
          placeholder="0"
          error={errors.sortOrder}
          disabled={submitting}
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Controla el orden en que aparece en los formularios. Menor número = aparece primero.
        </p>
      </div>

      {position?.isDefault && (
        <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-3 py-2.5">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Esta es una posición predeterminada del sistema. Solo puede modificarse el orden de visualización.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        <Button variant="outline" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Guardando...' : position ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </div>
  );
}
