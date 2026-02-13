import { Card } from '../ui';
import { PaginationControls } from './PaginationControls';

interface PaginationConfig {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

interface InventoryShellProps {
  /** Section title */
  title: string;
  /** Stock indicator rendered next to the title */
  stockBadge?: React.ReactNode;
  /** Action buttons (Registrar, Solicitar, etc.) */
  actions?: React.ReactNode;
  /** Extra content between actions and the card (e.g. filters) */
  filters?: React.ReactNode;
  /** Whether data is loading */
  loading: boolean;
  /** Whether the data list is empty */
  isEmpty: boolean;
  /** Message shown when empty */
  emptyMessage?: string;
  /** Pagination config. Pass null to hide pagination. */
  pagination?: PaginationConfig | null;
  /** Table or content to render */
  children: React.ReactNode;
}

export function InventoryShell({
  title,
  stockBadge,
  actions,
  filters,
  loading,
  isEmpty,
  emptyMessage = 'No hay registros',
  pagination,
  children,
}: InventoryShellProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          {stockBadge}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>

      {filters}

      <Card>
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-500">Cargando...</p>
          </div>
        ) : isEmpty ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <p>{emptyMessage}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">{children}</div>
            {pagination && (
              <PaginationControls
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                pageSize={pagination.pageSize}
                itemLabel={pagination.itemLabel}
                onPageChange={pagination.onPageChange}
                onPageSizeChange={pagination.onPageSizeChange}
              />
            )}
          </>
        )}
      </Card>
    </div>
  );
}
