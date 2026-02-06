import { useEffect, useState } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { Button, Input, Select } from '../ui';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import type { CompleteReportData } from '../../schemas';
import { useAuthStore } from '../../store/authStore';
import { operationCodesApi } from '../../lib/api';
import type { OperationCode } from '../../types/report';

export function TimeDistributionSection() {
  const { sessionToken } = useAuthStore();
  const [operationCodes, setOperationCodes] = useState<OperationCode[]>([]);
  const [loading, setLoading] = useState(true);
  
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = useFormContext<CompleteReportData>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'timeDistribution.distributions',
  });

  // Load operation codes
  useEffect(() => {
    const loadOperationCodes = async () => {
      if (!sessionToken) {
        setLoading(false);
        return;
      }

      try {
        const codes = await operationCodesApi.list(sessionToken, true);
        setOperationCodes(codes);
      } catch (error) {
        console.error('Error loading operation codes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOperationCodes();
  }, [sessionToken]);

  const addDistribution = () => {
    append({
      operationCodeId: '',
      hoursShift1: 0,
      hoursShift2: 0,
      hoursShift3: 0,
    });
  };

  // Calculate totals for each shift
  const distributions = watch('timeDistribution.distributions') || [];
  const shift1Total = distributions.reduce((sum, d) => sum + (d.hoursShift1 || 0), 0);
  const shift2Total = distributions.reduce((sum, d) => sum + (d.hoursShift2 || 0), 0);
  const shift3Total = distributions.reduce((sum, d) => sum + (d.hoursShift3 || 0), 0);

  const shift1Valid = shift1Total === 24;
  const shift2Valid = shift2Total === 24;
  const shift3Valid = shift3Total === 24;

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Cargando códigos de operación...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Distribución de Tiempo por Operación
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Cada turno debe sumar exactamente 24 horas
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addDistribution}
          icon={<Plus size={16} />}
        >
          Agregar Operación
        </Button>
      </div>

      {/* Totals Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className={`p-4 rounded-lg border-2 ${shift1Valid ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
          <p className="text-sm font-medium text-gray-700">Turno Mañana</p>
          <p className={`text-2xl font-bold ${shift1Valid ? 'text-green-700' : 'text-yellow-700'}`}>
            {shift1Total.toFixed(1)} / 24h
          </p>
        </div>
        <div className={`p-4 rounded-lg border-2 ${shift2Valid ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
          <p className="text-sm font-medium text-gray-700">Turno Tarde</p>
          <p className={`text-2xl font-bold ${shift2Valid ? 'text-green-700' : 'text-yellow-700'}`}>
            {shift2Total.toFixed(1)} / 24h
          </p>
        </div>
        <div className={`p-4 rounded-lg border-2 ${shift3Valid ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
          <p className="text-sm font-medium text-gray-700">Turno Noche</p>
          <p className={`text-2xl font-bold ${shift3Valid ? 'text-green-700' : 'text-yellow-700'}`}>
            {shift3Total.toFixed(1)} / 24h
          </p>
        </div>
      </div>

      {/* Table */}
      {fields.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <AlertCircle className="mx-auto mb-3 text-gray-400" size={48} />
          <p className="text-gray-500 mb-3">No hay operaciones registradas</p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={addDistribution}
            icon={<Plus size={16} />}
          >
            Agregar Primera Operación
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Código de Operación
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Mañana (hrs)
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tarde (hrs)
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Noche (hrs)
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {fields.map((field, index) => {
                const row = distributions[index] || {};
                const rowTotal = (row.hoursShift1 || 0) + (row.hoursShift2 || 0) + (row.hoursShift3 || 0);
                
                return (
                  <tr key={field.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">
                      <Select
                        {...register(`timeDistribution.distributions.${index}.operationCodeId`)}
                        error={errors.timeDistribution?.distributions?.[index]?.operationCodeId?.message}
                        className="w-full min-w-[250px]"
                      >
                        <option value="">Seleccionar operación...</option>
                        {operationCodes.map((code) => (
                          <option key={code.id} value={code.id}>
                            {code.code} - {code.name}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        {...register(`timeDistribution.distributions.${index}.hoursShift1`, {
                          valueAsNumber: true,
                        })}
                        error={errors.timeDistribution?.distributions?.[index]?.hoursShift1?.message}
                        className="w-full max-w-[100px] mx-auto text-center"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        {...register(`timeDistribution.distributions.${index}.hoursShift2`, {
                          valueAsNumber: true,
                        })}
                        error={errors.timeDistribution?.distributions?.[index]?.hoursShift2?.message}
                        className="w-full max-w-[100px] mx-auto text-center"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        {...register(`timeDistribution.distributions.${index}.hoursShift3`, {
                          valueAsNumber: true,
                        })}
                        error={errors.timeDistribution?.distributions?.[index]?.hoursShift3?.message}
                        className="w-full max-w-[100px] mx-auto text-center"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{rowTotal.toFixed(1)}h</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => remove(index)}
                        icon={<Trash2 size={16} />}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-800 font-bold">
              <tr>
                <td className="px-4 py-3 text-right">TOTALES:</td>
                <td className="px-4 py-3 text-center">
                  <span className={shift1Valid ? 'text-green-700' : 'text-red-600'}>
                    {shift1Total.toFixed(1)}h
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={shift2Valid ? 'text-green-700' : 'text-red-600'}>
                    {shift2Total.toFixed(1)}h
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={shift3Valid ? 'text-green-700' : 'text-red-600'}>
                    {shift3Total.toFixed(1)}h
                  </span>
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Warning if totals don't match */}
      {(!shift1Valid || !shift2Valid || !shift3Valid) && fields.length > 0 && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="text-yellow-600 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-medium text-yellow-800">Advertencia: Horas incompletas</p>
            <p className="text-sm text-yellow-700 mt-1">
              Cada turno debe sumar exactamente 24 horas. Actualmente:
              {!shift1Valid && ` Mañana: ${shift1Total}h`}
              {!shift2Valid && ` Tarde: ${shift2Total}h`}
              {!shift3Valid && ` Noche: ${shift3Total}h`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
