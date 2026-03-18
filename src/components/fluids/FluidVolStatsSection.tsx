import { useTranslation } from 'react-i18next';
import { Input } from '../ui';

// All vol_stats fields with their display labels, grouped by section
export interface VolStatsState {
  // Volúmenes del pozo
  volCapSarta: string;
  volDespSarta: string;
  volRevestidor: string;
  volHoyoDesnudo: string;
  volPozoSinTuberia: string;
  volPozoConTuberia: string;
  volSistemaActivo: string;
  volSistemaReserva: string;
  volSistemaContingencia: string;
  volHoyoAbandonado: string;
  // Volúmenes agregados
  volAguaAgregadoHoy: string;
  volAguaAgregadoAcum: string;
  volProductosHoy: string;
  volProductosAcum: string;
  volAceiteAcum: string;
  volRecibidoHoy: string;
  volRecibidoAcum: string;
  volProcesadoHoy: string;
  volProcesadoAcum: string;
  volManejadoHoy: string;
  volTotalAgregadoHoy: string;
  volTotalAgregadoAcum: string;
  volTransferidoFuera: string;
  // Pérdidas
  volPerdidoEcs: string;
  volPerdidoEcsAcum: string;
  volPerdidoHumectacion: string;
  volPerdidoHumectacionAcum: string;
  volPerdidoFormacionHoy: string;
  volPerdidoFormacionAcum: string;
  volPerdidoPermeabilidad: string;
  volPerdidoPermeabilidadAcum: string;
  volDescartado: string;
  volEntrampado: string;
  volPerdidoSuperficie: string;
  volPerdidoSuperficieAcum: string;
  volOtrasPerdidas: string;
  volTotalPerdidoHoy: string;
  volTotalPerdidoAcum: string;
  // Balance
  volInicialDiario: string;
  volFinalDiario: string;
}

export const EMPTY_VOL_STATS: VolStatsState = {
  volCapSarta: '', volDespSarta: '', volRevestidor: '', volHoyoDesnudo: '',
  volPozoSinTuberia: '', volPozoConTuberia: '',
  volSistemaActivo: '', volSistemaReserva: '', volSistemaContingencia: '', volHoyoAbandonado: '',
  volAguaAgregadoHoy: '', volAguaAgregadoAcum: '',
  volProductosHoy: '', volProductosAcum: '', volAceiteAcum: '',
  volRecibidoHoy: '', volRecibidoAcum: '', volProcesadoHoy: '', volProcesadoAcum: '',
  volManejadoHoy: '', volTotalAgregadoHoy: '', volTotalAgregadoAcum: '', volTransferidoFuera: '',
  volPerdidoEcs: '', volPerdidoEcsAcum: '',
  volPerdidoHumectacion: '', volPerdidoHumectacionAcum: '',
  volPerdidoFormacionHoy: '', volPerdidoFormacionAcum: '',
  volPerdidoPermeabilidad: '', volPerdidoPermeabilidadAcum: '',
  volDescartado: '', volEntrampado: '',
  volPerdidoSuperficie: '', volPerdidoSuperficieAcum: '',
  volOtrasPerdidas: '', volTotalPerdidoHoy: '', volTotalPerdidoAcum: '',
  volInicialDiario: '', volFinalDiario: '',
};

// Field groups for rendering — labels use i18n keys, resolved at render time
const FIELD_GROUPS: Array<{
  titleKey: string;
  color: string;
  fields: Array<{ key: keyof VolStatsState; labelKey: string }>;
}> = [
  {
    titleKey: 'fluids.volStats.wellVolumes',
    color: 'blue',
    fields: [
      { key: 'volCapSarta', labelKey: 'fluids.volStats.capSarta' },
      { key: 'volDespSarta', labelKey: 'fluids.volStats.despSarta' },
      { key: 'volRevestidor', labelKey: 'fluids.volStats.casing' },
      { key: 'volHoyoDesnudo', labelKey: 'fluids.volStats.openHole' },
      { key: 'volPozoSinTuberia', labelKey: 'fluids.volStats.wellNoPipe' },
      { key: 'volPozoConTuberia', labelKey: 'fluids.volStats.wellWithPipe' },
      { key: 'volSistemaActivo', labelKey: 'fluids.volStats.activeSystem' },
      { key: 'volSistemaReserva', labelKey: 'fluids.volStats.reserveSystem' },
      { key: 'volSistemaContingencia', labelKey: 'fluids.volStats.contingency' },
      { key: 'volHoyoAbandonado', labelKey: 'fluids.volStats.abandonedHole' },
    ],
  },
  {
    titleKey: 'fluids.volStats.addedVolumes',
    color: 'green',
    fields: [
      { key: 'volAguaAgregadoHoy', labelKey: 'fluids.volStats.waterToday' },
      { key: 'volAguaAgregadoAcum', labelKey: 'fluids.volStats.waterAccum' },
      { key: 'volProductosHoy', labelKey: 'fluids.volStats.productsToday' },
      { key: 'volProductosAcum', labelKey: 'fluids.volStats.productsAccum' },
      { key: 'volAceiteAcum', labelKey: 'fluids.volStats.oilAccum' },
      { key: 'volRecibidoHoy', labelKey: 'fluids.volStats.receivedToday' },
      { key: 'volRecibidoAcum', labelKey: 'fluids.volStats.receivedAccum' },
      { key: 'volProcesadoHoy', labelKey: 'fluids.volStats.processedToday' },
      { key: 'volProcesadoAcum', labelKey: 'fluids.volStats.processedAccum' },
      { key: 'volManejadoHoy', labelKey: 'fluids.volStats.handledToday' },
      { key: 'volTotalAgregadoHoy', labelKey: 'fluids.volStats.totalAddedToday' },
      { key: 'volTotalAgregadoAcum', labelKey: 'fluids.volStats.totalAddedAccum' },
      { key: 'volTransferidoFuera', labelKey: 'fluids.volStats.transferredOut' },
    ],
  },
  {
    titleKey: 'fluids.volStats.losses',
    color: 'red',
    fields: [
      { key: 'volPerdidoEcs', labelKey: 'fluids.volStats.ecsToday' },
      { key: 'volPerdidoEcsAcum', labelKey: 'fluids.volStats.ecsAccum' },
      { key: 'volPerdidoHumectacion', labelKey: 'fluids.volStats.wettingToday' },
      { key: 'volPerdidoHumectacionAcum', labelKey: 'fluids.volStats.wettingAccum' },
      { key: 'volPerdidoFormacionHoy', labelKey: 'fluids.volStats.formationToday' },
      { key: 'volPerdidoFormacionAcum', labelKey: 'fluids.volStats.formationAccum' },
      { key: 'volPerdidoPermeabilidad', labelKey: 'fluids.volStats.permeabilityToday' },
      { key: 'volPerdidoPermeabilidadAcum', labelKey: 'fluids.volStats.permeabilityAccum' },
      { key: 'volDescartado', labelKey: 'fluids.volStats.discarded' },
      { key: 'volEntrampado', labelKey: 'fluids.volStats.trapped' },
      { key: 'volPerdidoSuperficie', labelKey: 'fluids.volStats.surfaceToday' },
      { key: 'volPerdidoSuperficieAcum', labelKey: 'fluids.volStats.surfaceAccum' },
      { key: 'volOtrasPerdidas', labelKey: 'fluids.volStats.otherLosses' },
      { key: 'volTotalPerdidoHoy', labelKey: 'fluids.volStats.totalLostToday' },
      { key: 'volTotalPerdidoAcum', labelKey: 'fluids.volStats.totalLostAccum' },
    ],
  },
  {
    titleKey: 'fluids.volStats.dailyBalance',
    color: 'purple',
    fields: [
      { key: 'volInicialDiario', labelKey: 'fluids.volStats.dailyInitial' },
      { key: 'volFinalDiario', labelKey: 'fluids.volStats.dailyFinal' },
    ],
  },
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/10', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-400' },
  green: { bg: 'bg-green-50 dark:bg-green-900/10', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-400' },
  red: { bg: 'bg-red-50 dark:bg-red-900/10', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-400' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-900/10', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-400' },
};

interface FluidVolStatsSectionProps {
  data: VolStatsState;
  onChange: (data: VolStatsState) => void;
  disabled?: boolean;
}

export function FluidVolStatsSection({ data, onChange, disabled }: FluidVolStatsSectionProps) {
  const { t } = useTranslation();

  const updateField = (key: keyof VolStatsState, value: string) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <div className="space-y-6">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
        {t('fluids.volStats.title')}
      </h4>

      {FIELD_GROUPS.map((group) => {
        const colors = COLOR_MAP[group.color] || COLOR_MAP.blue;
        return (
          <div key={group.titleKey} className={`rounded-lg border ${colors.border} ${colors.bg} p-4`}>
            <h5 className={`text-sm font-semibold ${colors.text} mb-3`}>
              {t(group.titleKey)}
            </h5>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {group.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {t(field.labelKey)}
                  </label>
                  <Input
                    value={data[field.key]}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    disabled={disabled}
                    className="text-center text-sm !py-1"
                    placeholder={t('fluids.volStats.unitBls')}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
