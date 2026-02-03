import { useFormContext } from 'react-hook-form';
import { Input } from '../ui';
import type { CompleteReportData } from '../../schemas';

export function HeaderSection() {
  const {
    register,
    formState: { errors },
  } = useFormContext<CompleteReportData>();

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Datos Generales del Reporte
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Report Number */}
        <Input
          label="Número de Reporte"
          type="number"
          {...register('header.reportNumber', { valueAsNumber: true })}
          error={errors.header?.reportNumber?.message}
          required
        />

        {/* Report Date */}
        <Input
          label="Fecha del Reporte"
          type="date"
          {...register('header.reportDate')}
          error={errors.header?.reportDate?.message}
          required
        />

        {/* Well Number */}
        <Input
          label="Número de Pozo"
          {...register('header.wellNumber')}
          error={errors.header?.wellNumber?.message}
          placeholder="Ej: Well-123"
        />

        {/* API Number */}
        <Input
          label="API Number"
          {...register('header.apiNumber')}
          error={errors.header?.apiNumber?.message}
          placeholder="Ej: 42-123-45678"
        />

        {/* Contract */}
        <Input
          label="Contrato"
          {...register('header.contract')}
          error={errors.header?.contract?.message}
        />

        {/* Contractor */}
        <Input
          label="Contratista"
          {...register('header.contractor')}
          error={errors.header?.contractor?.message}
        />

        {/* Operator */}
        <Input
          label="Operador"
          {...register('header.operator')}
          error={errors.header?.operator?.message}
        />

        {/* Field/District */}
        <Input
          label="Campo o Distrito"
          {...register('header.fieldDistrict')}
          error={errors.header?.fieldDistrict?.message}
        />

        {/* Municipality */}
        <Input
          label="Municipio"
          {...register('header.municipality')}
          error={errors.header?.municipality?.message}
        />

        {/* Rig Number */}
        <Input
          label="TAL N°"
          {...register('header.rigNumber')}
          error={errors.header?.rigNumber?.message}
          placeholder="Ej: TAL-05"
        />

        {/* Company */}
        <Input
          label="Compañía"
          {...register('header.company')}
          error={errors.header?.company?.message}
        />

        {/* Supervisor 24h */}
        <Input
          label="Supervisor 24h"
          {...register('header.supervisor24h')}
          error={errors.header?.supervisor24h?.message}
        />
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Nota:</strong> Los campos marcados con asterisco (*) son obligatorios.
          El resto de campos son opcionales pero recomendados para un reporte completo.
        </p>
      </div>
    </div>
  );
}
