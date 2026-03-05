import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Material } from '@/types/logistics';

interface MaterialFormProps {
  material?: Material;
  onSubmit: (data: { name: string; unit: string; description?: string; active?: boolean }) => Promise<void>;
  onCancel: () => void;
}

export default function MaterialForm({ material, onSubmit, onCancel }: MaterialFormProps) {
  const [name, setName] = useState(material?.name ?? '');
  const [unit, setUnit] = useState(material?.unit ?? '');
  const [description, setDescription] = useState(material?.description ?? '');
  const [active, setActive] = useState(material?.active ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'El nombre es requerido';
    if (!unit.trim()) e.unit = 'La unidad es requerida';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        unit: unit.trim(),
        description: description.trim() || undefined,
        ...(material ? { active } : {}),
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
          placeholder="Ej: Cemento, Barita, Soda Cáustica"
          error={errors.name}
          disabled={submitting}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Unidad de medida <span className="text-red-500">*</span>
        </label>
        <Input
          value={unit}
          onChange={e => { setUnit(e.target.value); setErrors(prev => ({ ...prev, unit: '' })); }}
          placeholder="Ej: kg, sacos, lt, m³"
          error={errors.unit}
          disabled={submitting}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Descripción <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Descripción o notas adicionales..."
          rows={3}
          disabled={submitting}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-none"
        />
      </div>

      {material && (
        <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-700/50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Estado</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {active ? 'Activo — disponible para movimientos' : 'Inactivo — no aparece en formularios'}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={e => setActive(e.target.checked)}
              disabled={submitting}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:bg-gray-600" />
          </label>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        <Button variant="outline" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Guardando...' : material ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </div>
  );
}
