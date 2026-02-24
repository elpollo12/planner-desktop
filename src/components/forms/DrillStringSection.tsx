import { useFormContext, useFieldArray } from 'react-hook-form';
import { Button, Input } from '../ui';
import { Plus, Trash2 } from 'lucide-react';
import type { CompleteReportData } from '../../schemas';

export function DrillStringSection() {
  const { register, control, watch } = useFormContext<CompleteReportData>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'drillString.components',
  });

  const components = watch('drillString.components') || [];

  const addComponent = () => {
    append({ pieceName: '', length: undefined });
  };

  const totalPieces = components.length;
  const totalLength = components.reduce(
    (sum, c) => sum + (typeof c.length === 'number' ? c.length : 0),
    0,
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Sarta de Perforación
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Registro de las piezas que componen la sarta
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addComponent}
          icon={<Plus size={16} />}
        >
          Agregar Pieza
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <p className="text-gray-500 mb-3">No se han registrado piezas de sarta</p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={addComponent}
            icon={<Plus size={16} />}
          >
            Agregar Primera Pieza
          </Button>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-16">
                    N°
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Nombre de Pieza
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-40">
                    Longitud (ft)
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-20">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-50 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {fields.map((field, index) => (
                  <tr key={field.id}>
                    <td className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                      {index + 1}
                    </td>
                    <td className="px-4 py-1">
                      <Input
                        {...register(`drillString.components.${index}.pieceName`)}
                        placeholder="Ej: Drill Pipe, HWDP, Drill Collar..."
                        className="py-1.5!"
                      />
                    </td>
                    <td className="px-4 py-1">
                      <Input
                        type="number"
                        step="0.01"
                        {...register(`drillString.components.${index}.length`, {
                          valueAsNumber: true,
                        })}
                        placeholder="0.00"
                        className="py-1.5!"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="Eliminar pieza"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-800 border-t-2 border-gray-300 dark:border-gray-600">
                <tr>
                  <td className="px-4 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100" />
                  <td className="px-4 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Total: {totalPieces} pieza{totalPieces !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {totalLength.toFixed(2)} ft
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
