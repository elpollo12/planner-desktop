import { Card, Button } from '../../ui';
import { CheckCircle2, Edit2 } from 'lucide-react';
import { HeaderSummaryProps } from '../../../types';

export function HeaderSummary({ headerData, onEdit }: HeaderSummaryProps) {
  if (!headerData) return null;

  return (
    <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-blue-600" size={20} />
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">
              Encabezado Completado
            </h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            icon={<Edit2 size={14} />}
            className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300"
          >
            Modificar
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Reporte #:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
              {headerData.reportNumber}
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Fecha:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
              {new Date(headerData.reportDate).toLocaleDateString()}
            </span>
          </div>
          {headerData.wellNumber && (
            <div>
              <span className="text-gray-600 dark:text-gray-400">Pozo:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                {headerData.wellNumber}
              </span>
            </div>
          )}
          {headerData.rigNumber && (
            <div>
              <span className="text-gray-600 dark:text-gray-400">TAL:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                {headerData.rigNumber}
              </span>
            </div>
          )}
          {headerData.supervisor24h && (
            <div>
              <span className="text-gray-600 dark:text-gray-400">Supervisor:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                {headerData.supervisor24h}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}