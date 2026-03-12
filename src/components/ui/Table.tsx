import { ReactNode, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  truncate?: boolean; // Truncar texto largo
  maxWidth?: string; // Ancho máximo antes de truncar
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
  striped?: boolean;
  hoverable?: boolean;
  // Paginación
  pagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
}

export function Table<T>({
  columns,
  data,
  onRowClick,
  emptyMessage,
  className = '',
  striped = true,
  hoverable = true,
  pagination = false,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [5, 10, 20, 50, 100],
}: TableProps<T>) {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Calcular datos paginados
  const paginatedData = useMemo(() => {
    if (!pagination) return data;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, pageSize, pagination]);

  const totalPages = useMemo(() => {
    return Math.ceil(data.length / pageSize);
  }, [data.length, pageSize]);

  // Reset a página 1 si los datos cambian
  useMemo(() => {
    setCurrentPage(1);
  }, [data.length]);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset a primera página
  };

  const getNestedValue = (obj: T, key: string): unknown => {
    return key.split('.').reduce<unknown>((acc, part) => {
      if (acc && typeof acc === 'object' && part in acc) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, obj);
  };

  const renderCellValue = (value: unknown): ReactNode => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return '-';
  };

  const displayData = pagination ? paginatedData : data;

  return (
    <div className="space-y-4">
      <div className={`overflow-x-auto ${className}`}>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-${column.align || 'left'} text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider`}
                  style={{
                    width: column.width,
                    maxWidth: column.maxWidth
                  }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-gray-50 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {displayData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center text-sm text-gray-500"
                >
                  {emptyMessage || t('common.noData')}
                </td>
              </tr>
            ) : (
              displayData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  onClick={() => onRowClick?.(row)}
                  className={`
                    ${striped && rowIndex % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'}
                    ${hoverable ? 'hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors' : ''}
                    ${onRowClick ? 'cursor-pointer' : ''}
                  `}
                >
                  {columns.map((column) => {
                    // Calcular el título del tooltip solo para columnas truncadas sin render personalizado
                    const cellValue = getNestedValue(row, column.key);
                    const tooltipTitle = column.truncate && !column.render 
                      ? String(renderCellValue(cellValue))
                      : undefined;

                    return (
                      <td
                        key={column.key}
                        className={`px-6 py-4 text-sm text-gray-900 dark:text-gray-200 text-${column.align || 'left'} ${column.truncate ? 'truncate' : 'whitespace-nowrap'
                          }`}
                        style={{
                          maxWidth: column.maxWidth
                        }}
                        title={tooltipTitle}
                      >
                        {column.render
                          ? column.render(row)
                          : renderCellValue(cellValue)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {pagination && data.length > 0 && (
        <div className="flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 sm:px-6">
          {/* Controles de navegación */}
          <div className="flex items-center gap-2 mt-2 justify-center ">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 focus-visible:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Números de página */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber: number;

                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
                } else {
                  pageNumber = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                    className={`relative inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold ${currentPage === pageNumber
                        ? 'bg-primary-600 text-white focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-primary-600'
                        : 'text-gray-900 dark:text-gray-100 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-md px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 focus-visible:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {/* Info y selector de tamaño de página */}

          <div className="flex items-center justify-between mt-2 -mx-4">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {t('pagination.showing', {
                from: Math.min((currentPage - 1) * pageSize + 1, data.length),
                to: Math.min(currentPage * pageSize, data.length),
                total: data.length,
              })}{' '}
              {t('pagination.results')}
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="pageSize" className="text-sm text-gray-700 dark:text-gray-300">
                {t('pagination.show')}
              </label>
              <select
                id="pageSize"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="block rounded-md border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-primary-500"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
