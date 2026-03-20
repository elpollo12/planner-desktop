import { useTranslation } from 'react-i18next';
import { Input } from '../ui';

export interface FluidPropsRow {
  sampleHour: string;
  sampleSource: string;
  temperatureF: string;
  depthMd: string;
  depthTvd: string;
  density: string;
  marshViscosity: string;
  rpm600: string;
  rpm300: string;
  rpm200: string;
  rpm100: string;
  rpm6: string;
  rpm3: string;
  pv: string;
  yp: string;
  gel10s: string;
  gel10m: string;
  gel30m: string;
  apiFiltrate: string;
  filterCake: string;
  sandContent: string;
  solidsRetort: string;
  oilRetort: string;
  waterRetort: string;
  ph: string;
  alkalinityPm: string;
  alkalinityPf: string;
  alkalinityMf: string;
  calciumPpm: string;
  chloridesPpm: string;
  mbt: string;
  brookfieldVisc: string;
  lubricityCoef: string;
}

export const EMPTY_PROPS_ROW: FluidPropsRow = {
  sampleHour: '', sampleSource: '', temperatureF: '', depthMd: '', depthTvd: '',
  density: '', marshViscosity: '',
  rpm600: '', rpm300: '', rpm200: '', rpm100: '', rpm6: '', rpm3: '',
  pv: '', yp: '', gel10s: '', gel10m: '', gel30m: '',
  apiFiltrate: '', filterCake: '',
  sandContent: '', solidsRetort: '', oilRetort: '', waterRetort: '',
  ph: '', alkalinityPm: '', alkalinityPf: '', alkalinityMf: '',
  calciumPpm: '', chloridesPpm: '', mbt: '', brookfieldVisc: '', lubricityCoef: '',
};

// Field definitions grouped by section — labels use i18n keys, resolved at render time
const FIELD_GROUPS: Array<{ labelKey: string; fields: Array<{ key: keyof FluidPropsRow; label?: string; labelKey?: string; unit?: string }> }> = [
  {
    labelKey: 'fluids.props.groupSample',
    fields: [
      { key: 'sampleHour', labelKey: 'fluids.props.hour' },
      { key: 'sampleSource', labelKey: 'fluids.props.source' },
      { key: 'temperatureF', labelKey: 'fluids.props.temperature', unit: '°F' },
      { key: 'depthMd', labelKey: 'fluids.props.depthMd', unit: 'ft' },
      { key: 'depthTvd', labelKey: 'fluids.props.depthTvd', unit: 'ft' },
    ],
  },
  {
    labelKey: 'fluids.props.groupRheology',
    fields: [
      { key: 'density', labelKey: 'fluids.props.density', unit: 'lpg' },
      { key: 'marshViscosity', labelKey: 'fluids.props.marshVisc', unit: 's' },
      { key: 'rpm600', label: 'L600' },
      { key: 'rpm300', label: 'L300' },
      { key: 'rpm200', label: 'L200' },
      { key: 'rpm100', label: 'L100' },
      { key: 'rpm6', label: 'L6' },
      { key: 'rpm3', label: 'L3' },
      { key: 'pv', label: 'VP', unit: 'cP' },
      { key: 'yp', label: 'YP', unit: 'lb/100ft²' },
      { key: 'gel10s', label: 'Gel 10s' },
      { key: 'gel10m', label: 'Gel 10m' },
      { key: 'gel30m', label: 'Gel 30m' },
    ],
  },
  {
    labelKey: 'fluids.props.groupFiltration',
    fields: [
      { key: 'apiFiltrate', labelKey: 'fluids.props.apiFilter', unit: 'ml' },
      { key: 'filterCake', labelKey: 'fluids.props.filterCake', unit: 'mm' },
      { key: 'sandContent', labelKey: 'fluids.props.sandPct' },
      { key: 'solidsRetort', labelKey: 'fluids.props.solidsPct' },
      { key: 'oilRetort', labelKey: 'fluids.props.oilPct' },
      { key: 'waterRetort', labelKey: 'fluids.props.waterPct' },
    ],
  },
  {
    labelKey: 'fluids.props.groupChemistry',
    fields: [
      { key: 'ph', label: 'pH' },
      { key: 'alkalinityPm', label: 'Pm' },
      { key: 'alkalinityPf', label: 'Pf' },
      { key: 'alkalinityMf', label: 'Mf' },
      { key: 'calciumPpm', label: 'Ca²⁺', unit: 'ppm' },
      { key: 'chloridesPpm', label: 'Cl⁻', unit: 'ppm' },
      { key: 'mbt', label: 'MBT' },
      { key: 'brookfieldVisc', label: 'Brookfield' },
      { key: 'lubricityCoef', labelKey: 'fluids.props.lubCoef' },
    ],
  },
];

const SHIFT_LABEL_KEYS = ['fluids.props.shift1', 'fluids.props.shift2', 'fluids.props.shift3'];

interface FluidPropsTableProps {
  rows: FluidPropsRow[];
  onChange: (rows: FluidPropsRow[]) => void;
  disabled?: boolean;
}

export function FluidPropsTable({ rows, onChange, disabled }: FluidPropsTableProps) {
  const { t } = useTranslation();

  const updateCell = (shiftIdx: number, key: keyof FluidPropsRow, value: string) => {
    const updated = rows.map((r, i) => i === shiftIdx ? { ...r, [key]: value } : r);
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      {FIELD_GROUPS.map((group) => (
        <div key={group.labelKey}>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
            {t(group.labelKey)}
          </h4>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-40">
                    {t('fluids.props.property')}
                  </th>
                  {SHIFT_LABEL_KEYS.map((key, idx) => (
                    <th key={idx} className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {t(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {group.fields.map((field) => (
                  <tr key={field.key} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {field.labelKey ? t(field.labelKey) : field.label}
                      {field.unit && <span className="text-xs text-gray-400 ml-1">({field.unit})</span>}
                    </td>
                    {rows.map((row, shiftIdx) => (
                      <td key={shiftIdx} className="px-2 py-1">
                        <Input
                          value={row[field.key]}
                          onChange={(e) => updateCell(shiftIdx, field.key, e.target.value)}
                          disabled={disabled}
                          className="text-center text-sm !py-1"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
