import { useState } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { Input, Select, Button } from '../ui';
import { Plus, Trash2 } from 'lucide-react';
import type { CompleteReportData } from '../../schemas';
import { SHIFT_LABELS } from '../../types/report';

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

type ShiftType = 'morning' | 'afternoon' | 'night';

export function CrewSection() {
  const [activeShift, setActiveShift] = useState<ShiftType>('morning');
  
  const {
    register,
    control,
  } = useFormContext<CompleteReportData>();

  const shiftIndex = activeShift === 'morning' ? 0 : activeShift === 'afternoon' ? 1 : 2;

  const { fields, append, remove } = useFieldArray({
    control,
    name: `crew.shifts.${shiftIndex}.members` as any,
  });

  const addMember = () => {
    append({
      position: '',
      ci: '',
      name: '',
      hours: undefined,
    });
  };

  const shifts: ShiftType[] = ['morning', 'afternoon', 'night'];

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Cuadrilla por Turno
      </h3>

      {/* Shift Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-4">
          {shifts.map((shift) => (
            <button
              key={shift}
              type="button"
              onClick={() => setActiveShift(shift)}
              className={`
                px-4 py-2 font-medium text-sm border-b-2 transition-colors
                ${
                  activeShift === shift
                    ? 'border-[#1E3A5F] text-[#1E3A5F]'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }
              `}
            >
              {SHIFT_LABELS[shift]}
            </button>
          ))}
        </nav>
      </div>

      {/* Shift Times */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Input
          label="Hora Inicio"
          type="time"
          {...register(`crew.shifts.${shiftIndex}.shiftStart` as any)}
        />
        <Input
          label="Hora Fin"
          type="time"
          {...register(`crew.shifts.${shiftIndex}.shiftEnd` as any)}
        />
      </div>

      {/* Members Table */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700">
            Miembros de la Cuadrilla
          </h4>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addMember}
            icon={<Plus size={16} />}
          >
            Agregar Miembro
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Posición
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  CI
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nombre
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Horas
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fields.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-500 text-sm">
                    No hay miembros en este turno. Haz clic en "Agregar Miembro" para comenzar.
                  </td>
                </tr>
              ) : (
                fields.map((field, index) => (
                  <tr key={field.id}>
                    <td className="px-3 py-2">
                      <Select
                        {...register(`crew.shifts.${shiftIndex}.members.${index}.position` as any)}
                        options={CREW_POSITIONS.map(pos => ({ value: pos, label: pos }))}
                        placeholder="Seleccionar..."
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        {...register(`crew.shifts.${shiftIndex}.members.${index}.ci` as any)}
                        placeholder="CI"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        {...register(`crew.shifts.${shiftIndex}.members.${index}.name` as any)}
                        placeholder="Nombre completo"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        {...register(`crew.shifts.${shiftIndex}.members.${index}.hours` as any, {
                          valueAsNumber: true,
                        })}
                        placeholder="8"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Nota:</strong> Registra todos los miembros de la cuadrilla para cada turno.
          Las horas trabajadas son opcionales pero recomendadas para reportes completos.
        </p>
      </div>
    </div>
  );
}
