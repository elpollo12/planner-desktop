import { useTranslation } from 'react-i18next';
import { Package } from 'lucide-react';

interface StockBadgeProps {
  stock: number | null;
  unit: string;
  loading?: boolean;
}

export function StockBadge({ stock, unit, loading }: StockBadgeProps) {
  const { t } = useTranslation();

  if (loading || stock === null) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 animate-pulse">
        <Package size={12} />
        {t('logistics.common.loading')}
      </span>
    );
  }

  const isLow = stock <= 0;
  const colorClasses = isLow
    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';

  const displayStock = Number.isInteger(stock) ? stock : stock.toFixed(2);

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${colorClasses}`}>
      <Package size={12} />
      {t('logistics.stockBadge.stock')} {displayStock} {unit}
    </span>
  );
}
