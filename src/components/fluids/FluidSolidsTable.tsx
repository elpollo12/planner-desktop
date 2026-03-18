import { useTranslation } from 'react-i18next';
import { Button, Input } from '../ui';
import { Plus, Trash2 } from 'lucide-react';

export interface FluidSolidsRow {
  equipment: string;
  designMesh: string;
  hoursToday: string;
  hoursAccumulated: string;
}

export const EMPTY_SOLIDS_ROW: FluidSolidsRow = {
  equipment: '', designMesh: '', hoursToday: '', hoursAccumulated: '',
};

const DEFAULT_EQUIPMENT = [
  'Shaker 1', 'Shaker 2', 'Shaker 3', 'Shaker 4',
  '3 en 1', 'Desa./Desi.', 'Centrífuga',
];

interface FluidSolidsTableProps {
  rows: FluidSolidsRow[];
  onChange: (rows: FluidSolidsRow[]) => void;
  disabled?: boolean;
}

export function FluidSolidsTable({ rows, onChange, disabled }: FluidSolidsTableProps) {
  const { t } = useTranslation();

  const addRow = () => {
    const usedEquipment = rows.map((r) => r.equipment);
    const nextEquipment = DEFAULT_EQUIPMENT.find((e) => !usedEquipment.includes(e)) || '';
    onChange([...rows, { ...EMPTY_SOLIDS_ROW, equipment: nextEquipment }]);
  };

  const removeRow = (idx: number) => {
    onChange(rows.filter((_, i) => i !== idx));
  };

  const updateCell = (idx: number, key: keyof FluidSolidsRow, value: string) => {
    onChange(rows.map((r, i) => i === idx ? { ...r, [key]: value } : r));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          {t('fluids.solids.title')}
        </h4>
        {!disabled && (
          <Button type="button" variant="secondary" size="sm" onClick={addRow} icon={<Plus size={14} />}>
            {t('fluids.solids.addEquipment')}
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <p className="text-gray-500 text-sm mb-2">{t('fluids.solids.empty')}</p>
          {!disabled && (
            <Button type="button" variant="primary" size="sm" onClick={addRow} icon={<Plus size={14} />}>
              {t('fluids.solids.addFirst')}
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.solids.equipment')}</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.solids.meshDesign')}</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.solids.hrsToday')}</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.solids.hrsAccum')}</th>
                {!disabled && <th className="px-3 py-2 w-12" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {rows.map((row, idx) => (
                <tr key={idx}>
                  <td className="px-2 py-1">
                    <Input
                      value={row.equipment}
                      onChange={(e) => updateCell(idx, 'equipment', e.target.value)}
                      disabled={disabled}
                      className="text-sm !py-1"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      value={row.designMesh}
                      onChange={(e) => updateCell(idx, 'designMesh', e.target.value)}
                      disabled={disabled}
                      className="text-center text-sm !py-1"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      value={row.hoursToday}
                      onChange={(e) => updateCell(idx, 'hoursToday', e.target.value)}
                      disabled={disabled}
                      className="text-center text-sm !py-1"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      value={row.hoursAccumulated}
                      onChange={(e) => updateCell(idx, 'hoursAccumulated', e.target.value)}
                      disabled={disabled}
                      className="text-center text-sm !py-1"
                    />
                  </td>
                  {!disabled && (
                    <td className="px-2 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
