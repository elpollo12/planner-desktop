import { useEffect, useRef, useState } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { AlertTriangle } from 'lucide-react';
import { Input, DateInput, Select } from '../ui';
import { Button } from '../ui';
import type { CompleteReportData } from '../../schemas';
import { useCompaniesStore } from '@/store/companiesStore';
import { useAuthStore } from '@/store/authStore';
import { useModal } from '@/store/modalStore';
import { areasApi, rigsApi, rigPersonnelApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import type { Area, Rig, RigPersonnel } from '@/types/rig';

// Empty section defaults used when resetting after rig change
const EMPTY_SECTIONS = {
  crew: {
    shifts: [
      { shift: 'morning' as const, shiftStart: '06:00', shiftEnd: '14:00', members: [] },
      { shift: 'afternoon' as const, shiftStart: '14:00', shiftEnd: '22:00', members: [] },
      { shift: 'night' as const, shiftStart: '22:00', shiftEnd: '06:00', members: [] },
    ],
  },
  timeDistribution: { distributions: [] },
  bitRecords: { records: [] },
  mudRecords: { records: [], additives: [] },
  lithology: { drillingParameters: [], deviationHistory: [] },
  observations: { operations: [] },
  drillString: {},
};

interface HeaderSectionProps {
  isEditMode?: boolean;
}

export function HeaderSection({ isEditMode = false }: HeaderSectionProps) {
  const {
    register,
    control,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useFormContext<CompleteReportData>();

  const { sessionToken } = useAuthStore();
  const { openModal, closeModal } = useModal();
  const { companies, loadCompanies, operators, contractors } = useCompaniesStore();
  const [areas, setAreas] = useState<Area[]>([]);
  const [accessibleRigs, setAccessibleRigs] = useState<Rig[]>([]);
  const [supervisors, setSupervisors] = useState<RigPersonnel[]>([]);

  // Track the confirmed rig to detect actual changes in edit mode
  const confirmedRigRef = useRef<string>('');

  // Load companies, areas and rigs on mount
  useEffect(() => {
    if (sessionToken && companies.length === 0) {
      loadCompanies(sessionToken, true);
    }
    areasApi.list(false).then(setAreas).catch(console.error);
    if (sessionToken) {
      rigsApi.listAccessible(sessionToken, false)
        .then(setAccessibleRigs)
        .catch(console.error);
    }
  }, [sessionToken, companies.length, loadCompanies]);

  // Load supervisors when the selected rig changes
  const rigNumber = watch('header.rigNumber');
  useEffect(() => {
    if (!rigNumber) {
      setSupervisors([]);
      return;
    }
    const rig = accessibleRigs.find((r) => r.name === rigNumber);
    if (!rig) {
      setSupervisors([]);
      return;
    }
    rigPersonnelApi.list(rig.id, false)
      .then((personnel) =>
        setSupervisors(personnel.filter((p) => p.defaultPosition === 'Supervisor' && p.active))
      )
      .catch(console.error);
  }, [rigNumber, accessibleRigs]);

  // Set initial confirmed rig ref once the form has data
  useEffect(() => {
    if (isEditMode && !confirmedRigRef.current) {
      const currentRig = getValues('header.rigNumber');
      if (currentRig) confirmedRigRef.current = currentRig;
    }
  }, [isEditMode, getValues]);

  /**
   * Handle rig change in edit mode: warn user that sections will be cleared
   */
  const handleEditModeRigChange = (newRigName: string) => {
    const previousRig = confirmedRigRef.current;

    // Same rig or empty selection — just set it
    if (!newRigName || newRigName === previousRig) {
      setValue('header.rigNumber', newRigName);
      return;
    }

    openModal(
      <div className="space-y-4">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-500" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-gray-700 dark:text-gray-300">
            Estás cambiando el taladro de <strong>{previousRig}</strong> a <strong>{newRigName}</strong>.
          </p>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Esto eliminará todos los datos de las secciones (cuadrilla, distribución de tiempo, mechas, lodo, etc.) ya que son específicos del taladro. Los datos del encabezado se mantendrán.
          </p>
        </div>
        <div className="flex gap-3 justify-end pt-4">
          <Button
            variant="outline"
            onClick={() => {
              // Revert: keep previous rig
              setValue('header.rigNumber', previousRig);
              closeModal();
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            className="bg-amber-600 hover:bg-amber-700 focus:ring-amber-500"
            onClick={() => {
              // Confirm: apply new rig and clear sections
              const currentHeader = getValues('header');
              reset({
                header: { ...currentHeader, rigNumber: newRigName },
                ...EMPTY_SECTIONS,
              });
              confirmedRigRef.current = newRigName;
              closeModal();
              toast.info(`Taladro cambiado a ${newRigName}. Las secciones fueron reiniciadas.`);
            }}
          >
            Cambiar taladro
          </Button>
        </div>
      </div>,
      {
        title: '¿Cambiar de taladro?',
        size: 'sm',
        showCloseButton: false,
        closeOnOutsideClick: false,
        closeOnEsc: false,
      }
    );
  };

  const operatorOptions = [
    { value: '', label: 'Selecciona un operador' },
    ...operators().map((op) => ({ value: op.name, label: op.name })),
  ];

  const contractorOptions = [
    { value: '', label: 'Selecciona un contratista' },
    ...contractors().map((c) => ({ value: c.name, label: c.name })),
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
        <Input
          label="Número de Reporte"
          type="number"
          {...register('header.reportNumber', { valueAsNumber: true })}
          error={errors.header?.reportNumber?.message}
          required
        />

        <Controller
          name="header.reportDate"
          control={control}
          render={({ field }) => (
            <DateInput
              label="Fecha del Reporte"
              value={field.value}
              onChange={field.onChange}
              error={errors.header?.reportDate?.message}
              required
            />
          )}
        />

        <Input
          label="Nombre del Pozo"
          {...register('header.wellNumber')}
          error={errors.header?.wellNumber?.message}
          placeholder="Ej: Pozo Norte-1"
        />

        <Input
          label="API Number"
          {...register('header.apiNumber')}
          error={errors.header?.apiNumber?.message}
          placeholder="Ej: 42-123-45678"
        />

        <Input
          label="Contrato"
          {...register('header.contract')}
          error={errors.header?.contract?.message}
        />

        <Controller
          name="header.contractor"
          control={control}
          render={({ field }) => (
            <Select
              label="Contratista"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
              options={contractorOptions}
              error={errors.header?.contractor?.message}
              required
            />
          )}
        />

        <Controller
          name="header.operator"
          control={control}
          render={({ field }) => (
            <Select
              label="Operador"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
              options={operatorOptions}
              error={errors.header?.operator?.message}
            />
          )}
        />

        <Controller
          name="header.fieldDistrict"
          control={control}
          render={({ field }) => (
            <Select
              label="Campo o Distrito"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
              options={areaOptions}
              error={errors.header?.fieldDistrict?.message}
              required
            />
          )}
        />

        {/* Rig selector: controlled in edit mode to intercept changes */}
        {isEditMode ? (
          <Controller
            name="header.rigNumber"
            control={control}
            render={({ field }) => (
              <Select
                label="TAL N°"
                value={field.value}
                onChange={(e) => handleEditModeRigChange(e.target.value)}
                options={rigOptions}
                error={errors.header?.rigNumber?.message}
              />
            )}
          />
        ) : (
          <Input
            label="Taladro"
            value={control._formValues?.header?.rigNumber || ''}
            disabled
          />
        )}

        <Controller
          name="header.supervisor24h"
          control={control}
          render={({ field }) =>
            supervisors.length > 0 ? (
              <Select
                label="Supervisor 24h"
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
                options={[
                  { value: '', label: 'Selecciona un supervisor' },
                  ...supervisors.map((s) => ({ value: s.name, label: s.name })),
                ]}
                error={errors.header?.supervisor24h?.message}
                required
              />
            ) : (
              <Input
                label="Supervisor 24h"
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
                placeholder={rigNumber ? 'Sin supervisores registrados' : 'Selecciona un taladro primero'}
                error={errors.header?.supervisor24h?.message}
                required
              />
            )
          }
        />
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Nota:</strong> Los campos marcados con asterisco (*) son obligatorios.
          El resto de campos son opcionales pero recomendados para un reporte completo.
        </p>
      </div>
    </div>
  );
}
