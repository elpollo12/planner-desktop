import { useTranslation } from 'react-i18next';
import { Button, Input, Select } from '../ui';
import { Plus, Trash2 } from 'lucide-react';

export interface TankRow {
  name: string;
  systemStatus: string; // 'active' | 'reserve' | 'contingency'
  volumeBls: string;
  lpg: string;
  fluidType: string;
}

export const EMPTY_TANK_ROW: TankRow = {
  name: '', systemStatus: 'active', volumeBls: '', lpg: '', fluidType: '',
};

const SYSTEM_OPTIONS = [
  { value: 'active', labelKey: 'fluids.tanks.active' },
  { value: 'reserve', labelKey: 'fluids.tanks.reserve' },
  { value: 'contingency', labelKey: 'fluids.tanks.contingency' },
];

interface FluidTanksTableProps {
  rows: TankRow[];
  onChange: (rows: TankRow[]) => void;
  disabled?: boolean;
}

export function FluidTanksTable({ rows, onChange, disabled }: FluidTanksTableProps) {
  const { t } = useTranslation();

  const addRow = () => {
    const num = rows.length + 1;
    onChange([...rows, { ...EMPTY_TANK_ROW, name: `TK-${num}` }]);
  };

  const removeRow = (idx: number) => {
    onChange(rows.filter((_, i) => i !== idx));
  };

  const updateCell = (idx: number, key: keyof TankRow, value: string) => {
    onChange(rows.map((r, i) => i === idx ? { ...r, [key]: value } : r));
  };

  // Totals by system status
  const totals = rows.reduce(
    (acc, r) => {
      const vol = parseFloat(r.volumeBls) || 0;
      if (r.systemStatus === 'active') acc.active += vol;
      else if (r.systemStatus === 'reserve') acc.reserve += vol;
      else if (r.systemStatus === 'contingency') acc.contingency += vol;
      acc.total += vol;
      return acc;
    },
    { active: 0, reserve: 0, contingency: 0, total: 0 },
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          {t('fluids.tanks.title')}
        </h4>
        {!disabled && (
          <Button type="button" variant="secondary" size="sm" onClick={addRow} icon={<Plus size={14} />}>
            {t('fluids.tanks.addTank')}
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <p className="text-gray-500 text-sm mb-2">{t('fluids.tanks.empty')}</p>
          {!disabled && (
            <Button type="button" variant="primary" size="sm" onClick={addRow} icon={<Plus size={14} />}>
              {t('fluids.tanks.addFirst')}
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.tanks.name')}</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.tanks.system')}</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.tanks.volumeBls')}</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.tanks.lpg')}</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.tanks.fluidType')}</th>
                {!disabled && <th className="px-3 py-2 w-10" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-2 py-1">
                    <Input value={row.name} onChange={(e) => updateCell(idx, 'name', e.target.value)} disabled={disabled} className="text-sm !py-1" />
                  </td>
                  <td className="px-2 py-1">
                    <Select
                      value={row.systemStatus}
                      onChange={(e) => updateCell(idx, 'systemStatus', e.target.value)}
                      disabled={disabled}
                      className="text-sm !py-1"
                    >
                      {SYSTEM_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-2 py-1">
                    <Input value={row.volumeBls} onChange={(e) => updateCell(idx, 'volumeBls', e.target.value)} disabled={disabled} className="text-center text-sm !py-1 w-24" />
                  </td>
                  <td className="px-2 py-1">
                    <Input value={row.lpg} onChange={(e) => updateCell(idx, 'lpg', e.target.value)} disabled={disabled} className="text-center text-sm !py-1 w-20" />
                  </td>
                  <td className="px-2 py-1">
                    <Input value={row.fluidType} onChange={(e) => updateCell(idx, 'fluidType', e.target.value)} disabled={disabled} className="text-sm !py-1" />
                  </td>
                  {!disabled && (
                    <td className="px-2 py-1 text-center">
                      <button type="button" onClick={() => removeRow(idx)} className="p-1 text-red-500 hover:text-red-700 cursor-pointer">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {/* Totals footer */}
            <tfoot className="bg-gray-100 dark:bg-gray-800 font-semibold text-sm">
              <tr>
                <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300" colSpan={2}>
                  {t('fluids.tanks.totals')}
                </td>
                <td className="px-3 py-2 text-center text-gray-900 dark:text-gray-100">
                  {totals.total.toFixed(1)}
                </td>
                <td colSpan={disabled ? 2 : 3} className="px-3 py-2">
                  <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400">
                    <span>{t('fluids.tanks.totalActive')} <strong className="text-green-600">{totals.active.toFixed(1)}</strong></span>
                    <span>{t('fluids.tanks.totalReserve')} <strong className="text-blue-600">{totals.reserve.toFixed(1)}</strong></span>
                    <span>{t('fluids.tanks.totalContingency')} <strong className="text-amber-600">{totals.contingency.toFixed(1)}</strong></span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
