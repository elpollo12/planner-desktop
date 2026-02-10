import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input, Select } from '../../../ui';
import type { CompleteReportData } from '../../../../schemas';
import { useOperatorsStore } from '@/store/operatorsStore';
import { useAuthStore } from '@/store/authStore';
import { areasApi, rigsApi, usersApi } from '@/lib/api';
import type { Area, Rig } from '@/types/rig';

export function HeaderSection() {
  const {
    register,
    formState: { errors },
  } = useFormContext<CompleteReportData>();

  const { sessionToken, user } = useAuthStore();
  const { operators, loadOperators } = useOperatorsStore();
  const [areas, setAreas] = useState<Area[]>([]);
  const [rigs, setRigs] = useState<Rig[]>([]);
  const [accessibleRigs, setAccessibleRigs] = useState<Rig[]>([]);

  // Load operators, areas and rigs on mount
  useEffect(() => {
    if (sessionToken && operators.length === 0) {
      loadOperators(sessionToken, true);
    }
    // Load areas
    areasApi.list(false).then(setAreas).catch(console.error);
    // Load all rigs
    rigsApi.list(false).then(setRigs).catch(console.error);
  }, [sessionToken, operators.length, loadOperators]);

  // Filter rigs based on user access
  useEffect(() => {
    const loadAccessibleRigs = async () => {
      if (!sessionToken || !user) return;

      try {
        // Get user with rig assignments
        const userData: any = await usersApi.get(sessionToken, user.id);

        // Admin or hasAllRigs = all rigs
        if (user.role === 'admin' || userData.hasAllRigs) {
          setAccessibleRigs(rigs);
        } else {
          // Filter rigs by assigned IDs
          const assignedIds = userData.assignedRigIds || [];
          const filtered = rigs.filter(rig => assignedIds.includes(rig.id));
          setAccessibleRigs(filtered);
        }
      } catch (error) {
        console.error('Error loading accessible rigs:', error);
        setAccessibleRigs([]);
      }
    };

    if (rigs.length > 0 && user) {
      loadAccessibleRigs();
    }
  }, [rigs, sessionToken, user]);

  const operatorOptions = [
    { value: '', label: 'Selecciona un operador' },
    ...operators.map((op) => ({
      value: op.name,
      label: op.name,
    })),
  ];

  const contractorOptions = [
    { value: '', label: 'Selecciona un contratista' },
    ...operators.map((op) => ({
      value: op.name,
      label: op.name,
    })),
  ];

  const areaOptions = [
    { value: '', label: 'Selecciona un campo/distrito' },
    ...areas.map((area) => ({
      value: area.name,
      label: `${area.name} (${area.state})`,
    })),
  ];

  const rigOptions = [
    { value: '', label: 'Selecciona un taladro' },
    ...accessibleRigs.map((rig) => ({
      value: rig.name,
      label: rig.name,
    })),
  ];

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
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

        {/* Well Name */}
        <Input
          label="Nombre del Pozo"
          {...register('header.wellNumber')}
          error={errors.header?.wellNumber?.message}
          placeholder="Ej: Pozo Norte-1"
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
        <Select
          label="Contratista"
          {...register('header.contractor')}
          options={contractorOptions}
          error={errors.header?.contractor?.message}
        />

        {/* Operator */}
        <Select
          label="Operador"
          {...register('header.operator')}
          options={operatorOptions}
          error={errors.header?.operator?.message}
        />

        {/* Field/District */}
        <Select
          label="Campo o Distrito"
          {...register('header.fieldDistrict')}
          options={areaOptions}
          error={errors.header?.fieldDistrict?.message}
        />

        {/* Rig Number */}
        <Select
          label="TAL N°"
          {...register('header.rigNumber')}
          options={rigOptions}
          error={errors.header?.rigNumber?.message}
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
