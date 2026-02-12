import { Button, Card } from '../ui';
import { FileText, ArrowUpDown } from 'lucide-react';

interface MaterialesInventoryProps {
  stats: {
    disponible: number;
    usado: number;
    consumiblesActivos: number;
  };
  onUpdate: () => void;
}

export function MaterialesInventory({ }: MaterialesInventoryProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Inventario de Materiales
        </h2>
        <div className="flex gap-2">
          <Button
            variant='secondary'
            size='sm'
            icon={<ArrowUpDown size={18} />}
            iconPosition='right'
          >
            Registrar
          </Button>
          <Button
            variant='outline'
            size='sm'
            icon={<FileText size={18} />}
            iconPosition='right'
          >
            Solicitar
          </Button>
        </div>
      </div>

      <Card>
        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
          <p>Implementar tabla de movimientos de botellones</p>
        </div>
      </Card>
    </div>
  );
}