import { useTranslation } from 'react-i18next';
import { Button, Input } from '../ui';
import { Plus, Trash2 } from 'lucide-react';

export interface ServiceRow {
  serviceName: string;
  hoursPerDay: string;
  quantity: string;
  daysToday: string;
  daysTotal: string;
  costBsf: string;
  costUsd: string;
  dailyCost: string;
  accumulatedCost: string;
}

export const EMPTY_SERVICE_ROW: ServiceRow = {
  serviceName: '', hoursPerDay: '', quantity: '',
  daysToday: '', daysTotal: '',
  costBsf: '', costUsd: '', dailyCost: '', accumulatedCost: '',
};

interface FluidServicesTableProps {
  rows: ServiceRow[];
  onChange: (rows: ServiceRow[]) => void;
  disabled?: boolean;
}

export function FluidServicesTable({ rows, onChange, disabled }: FluidServicesTableProps) {
  const { t } = useTranslation();

  const addRow = () => {
    onChange([...rows, { ...EMPTY_SERVICE_ROW }]);
  };

  const removeRow = (idx: number) => {
    onChange(rows.filter((_, i) => i !== idx));
  };

  const updateCell = (idx: number, key: keyof ServiceRow, value: string) => {
    onChange(rows.map((r, i) => i === idx ? { ...r, [key]: value } : r));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          {t('fluids.services.title')}
        </h4>
        {!disabled && (
          <Button type="button" variant="secondary" size="sm" onClick={addRow} icon={<Plus size={14} />}>
            {t('fluids.services.addService')}
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <p className="text-gray-500 text-sm mb-2">{t('fluids.services.empty')}</p>
          {!disabled && (
            <Button type="button" variant="primary" size="sm" onClick={addRow} icon={<Plus size={14} />}>
              {t('fluids.services.addFirst')}
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase min-w-[180px]">{t('fluids.services.service')}</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.services.hrsPerDay')}</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.services.quantity')}</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.services.daysToday')}</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.services.daysTotal')}</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.services.costBsf')}</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.services.costUsd')}</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.services.dailyCost')}</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.services.accumCost')}</th>
                {!disabled && <th className="px-2 py-2 w-10" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-1 py-1">
                    <Input value={row.serviceName} onChange={(e) => updateCell(idx, 'serviceName', e.target.value)} disabled={disabled} className="text-sm !py-1" placeholder={t('fluids.services.placeholder')} />
                  </td>
                  <td className="px-1 py-1">
                    <Input value={row.hoursPerDay} onChange={(e) => updateCell(idx, 'hoursPerDay', e.target.value)} disabled={disabled} className="text-center text-sm !py-1 w-20" />
                  </td>
                  <td className="px-1 py-1">
                    <Input value={row.quantity} onChange={(e) => updateCell(idx, 'quantity', e.target.value)} disabled={disabled} className="text-center text-sm !py-1 w-20" />
                  </td>
                  <td className="px-1 py-1">
                    <Input value={row.daysToday} onChange={(e) => updateCell(idx, 'daysToday', e.target.value)} disabled={disabled} className="text-center text-sm !py-1 w-20" />
                  </td>
                  <td className="px-1 py-1">
                    <Input value={row.daysTotal} onChange={(e) => updateCell(idx, 'daysTotal', e.target.value)} disabled={disabled} className="text-center text-sm !py-1 w-20" />
                  </td>
                  <td className="px-1 py-1">
                    <Input value={row.costBsf} onChange={(e) => updateCell(idx, 'costBsf', e.target.value)} disabled={disabled} className="text-center text-sm !py-1 w-24" />
                  </td>
                  <td className="px-1 py-1">
                    <Input value={row.costUsd} onChange={(e) => updateCell(idx, 'costUsd', e.target.value)} disabled={disabled} className="text-center text-sm !py-1 w-24" />
                  </td>
                  <td className="px-1 py-1">
                    <Input value={row.dailyCost} onChange={(e) => updateCell(idx, 'dailyCost', e.target.value)} disabled={disabled} className="text-center text-sm !py-1 w-24" />
                  </td>
                  <td className="px-1 py-1">
                    <Input value={row.accumulatedCost} onChange={(e) => updateCell(idx, 'accumulatedCost', e.target.value)} disabled={disabled} className="text-center text-sm !py-1 w-24" />
                  </td>
                  {!disabled && (
                    <td className="px-1 py-1 text-center">
                      <button type="button" onClick={() => removeRow(idx)} className="p-1 text-red-500 hover:text-red-700 cursor-pointer">
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
