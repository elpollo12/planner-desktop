import { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Button, Input } from '../ui';
import { Plus, Trash2 } from 'lucide-react';
import type { CompleteReportData } from '../../schemas';

const DRILL_STRING_FIELDS = [
  'size', 'weight', 'grade', 'connectionType',
  'stringNumber', 'headerLength', 'pumpBrand', 'pumpType',
] as const;

/** Check whether at least one drill-string field has a non-empty value */
function hasAnyValue(data: Record<string, unknown> | undefined): boolean {
  if (!data) return false;
  return DRILL_STRING_FIELDS.some((key) => {
    const v = data[key];
    return typeof v === 'string' && v.trim() !== '';
  });
}

export function DrillStringSection() {
  const { register, watch, setValue } = useFormContext<CompleteReportData>();
  const drillStringData = watch('drillString');

  // Active when the user explicitly enables the section or when data is already present (edit / snapshot)
  const [active, setActive] = useState(() => hasAnyValue(drillStringData));

  // Sync if data arrives later (e.g. report loader resets the form)
  useEffect(() => {
    if (hasAnyValue(drillStringData)) setActive(true);
  }, [drillStringData]);

  const handleActivate = () => setActive(true);

  const handleClear = () => {
    for (const key of DRILL_STRING_FIELDS) {
      setValue(`drillString.${key}`, '', { shouldDirty: true });
    }
    setActive(false);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Sarta de Perforación
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Datos de la tubería y equipo de bombeo utilizado
          </p>
        </div>

        {active && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleClear}
            icon={<Trash2 size={16} />}
            className="text-red-600"
          >
            Limpiar Sección
          </Button>
        )}
      </div>

      {!active ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <p className="text-gray-500 mb-3">No se han registrado datos de sarta</p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleActivate}
            icon={<Plus size={16} />}
          >
            Agregar Datos de Sarta
          </Button>
        </div>
      ) : (
        <>
          {/* Drill Pipe Data */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
              Tubería de Perforación
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                label="Tamaño"
                placeholder='Ej: 4 1/2"'
                {...register('drillString.size')}
              />
              <Input
                label="Peso (lb/ft)"
                placeholder="Ej: 16.60"
                {...register('drillString.weight')}
              />
              <Input
                label="Grado"
                placeholder="Ej: S-135"
                {...register('drillString.grade')}
              />
              <Input
                label="Tipo de Conexión"
                placeholder="Ej: NC50, IF"
                {...register('drillString.connectionType')}
              />
              <Input
                label="# de Sarta"
                placeholder="Ej: 1"
                {...register('drillString.stringNumber')}
              />
              <Input
                label="Longitud Encabezamiento"
                placeholder="Ej: 40 ft"
                {...register('drillString.headerLength')}
              />
            </div>
          </div>

          {/* Pump Data */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
              Bomba
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                label="Marca de Bomba"
                placeholder="Ej: Gardner Denver"
                {...register('drillString.pumpBrand')}
              />
              <Input
                label="Tipo de Bomba"
                placeholder="Ej: Triplex PZ-9"
                {...register('drillString.pumpType')}
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Nota:</strong> Estos datos se precargan automáticamente del último reporte del taladro.
              Actualice solo si hubo cambios en la configuración de la sarta o el equipo de bombeo.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
