import { useTranslation } from 'react-i18next';
import { Button, Input } from '../ui';
import { Plus, Trash2 } from 'lucide-react';
import { FluidProductSelector } from './FluidProductSelector';
import type { FluidProduct } from '../../types/fluid';

export interface InventoryRow {
  productId: string;
  invInicial: string;
  receivedToday: string;
  transferredToday: string;
  consumedToday: string;
  invFinal: string; // auto-calculated
  receivedTotal: string;
  transferredTotal: string;
  consumedTotal: string;
  dailyCost: string;
  notes: string;
}

export const EMPTY_INVENTORY_ROW: InventoryRow = {
  productId: '', invInicial: '', receivedToday: '', transferredToday: '',
  consumedToday: '', invFinal: '', receivedTotal: '', transferredTotal: '',
  consumedTotal: '', dailyCost: '', notes: '',
};

function computeInvFinal(row: InventoryRow): string {
  const ini = parseFloat(row.invInicial) || 0;
  const rec = parseFloat(row.receivedToday) || 0;
  const tra = parseFloat(row.transferredToday) || 0;
  const con = parseFloat(row.consumedToday) || 0;
  const result = ini + rec - tra - con;
  return result !== 0 ? result.toFixed(2) : '';
}

interface FluidInventoryTableProps {
  rows: InventoryRow[];
  products: FluidProduct[];
  onChange: (rows: InventoryRow[]) => void;
  disabled?: boolean;
}

export function FluidInventoryTable({ rows, products, onChange, disabled }: FluidInventoryTableProps) {
  const { t } = useTranslation();

  const addRow = () => {
    onChange([...rows, { ...EMPTY_INVENTORY_ROW }]);
  };

  const removeRow = (idx: number) => {
    onChange(rows.filter((_, i) => i !== idx));
  };

  const updateCell = (idx: number, key: keyof InventoryRow, value: string) => {
    const updated = rows.map((r, i) => {
      if (i !== idx) return r;
      const next = { ...r, [key]: value };
      // Auto-compute invFinal when quantities change
      if (['invInicial', 'receivedToday', 'transferredToday', 'consumedToday'].includes(key)) {
        next.invFinal = computeInvFinal(next);
      }
      return next;
    });
    onChange(updated);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          {t('fluids.inventory.title')}
        </h4>
        {!disabled && (
          <Button type="button" variant="secondary" size="sm" onClick={addRow} icon={<Plus size={14} />}>
            {t('fluids.inventory.addProduct')}
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <p className="text-gray-500 text-sm mb-2">{t('fluids.inventory.empty')}</p>
          {!disabled && (
            <Button type="button" variant="primary" size="sm" onClick={addRow} icon={<Plus size={14} />}>
              {t('fluids.inventory.addFirst')}
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase min-w-[200px]">{t('fluids.inventory.product')}</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.inventory.initial')}</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.inventory.recToday')}</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.inventory.transferred')}</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.inventory.consumed')}</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase bg-green-50 dark:bg-green-900/20">{t('fluids.inventory.invFinal')}</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.inventory.recTotal')}</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.inventory.transfTotal')}</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.inventory.consTotal')}</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.inventory.dailyCost')}</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.inventory.notes')}</th>
                {!disabled && <th className="px-2 py-2 w-10" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-1 py-1 min-w-[200px]">
                    <FluidProductSelector
                      products={products}
                      selectedId={row.productId}
                      onChange={(pid) => updateCell(idx, 'productId', pid)}
                      disabled={disabled}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Input value={row.invInicial} onChange={(e) => updateCell(idx, 'invInicial', e.target.value)} disabled={disabled} className="text-center text-sm !py-1 w-20" />
                  </td>
                  <td className="px-1 py-1">
                    <Input value={row.receivedToday} onChange={(e) => updateCell(idx, 'receivedToday', e.target.value)} disabled={disabled} className="text-center text-sm !py-1 w-20" />
                  </td>
                  <td className="px-1 py-1">
                    <Input value={row.transferredToday} onChange={(e) => updateCell(idx, 'transferredToday', e.target.value)} disabled={disabled} className="text-center text-sm !py-1 w-20" />
                  </td>
                  <td className="px-1 py-1">
                    <Input value={row.consumedToday} onChange={(e) => updateCell(idx, 'consumedToday', e.target.value)} disabled={disabled} className="text-center text-sm !py-1 w-20" />
                  </td>
                  <td className="px-1 py-1 bg-green-50 dark:bg-green-900/10">
                    <div className="px-2 py-1.5 text-center text-sm font-semibold text-green-700 dark:text-green-400">
                      {row.invFinal || '-'}
                    </div>
                  </td>
                  <td className="px-1 py-1">
                    <Input value={row.receivedTotal} onChange={(e) => updateCell(idx, 'receivedTotal', e.target.value)} disabled={disabled} className="text-center text-sm !py-1 w-20" />
                  </td>
                  <td className="px-1 py-1">
                    <Input value={row.transferredTotal} onChange={(e) => updateCell(idx, 'transferredTotal', e.target.value)} disabled={disabled} className="text-center text-sm !py-1 w-20" />
                  </td>
                  <td className="px-1 py-1">
                    <Input value={row.consumedTotal} onChange={(e) => updateCell(idx, 'consumedTotal', e.target.value)} disabled={disabled} className="text-center text-sm !py-1 w-20" />
                  </td>
                  <td className="px-1 py-1">
                    <Input value={row.dailyCost} onChange={(e) => updateCell(idx, 'dailyCost', e.target.value)} disabled={disabled} className="text-center text-sm !py-1 w-24" />
                  </td>
                  <td className="px-1 py-1">
                    <Input value={row.notes} onChange={(e) => updateCell(idx, 'notes', e.target.value)} disabled={disabled} className="text-sm !py-1 w-28" />
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
