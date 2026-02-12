import { Button, Card } from '../ui';
import {FileText, Sheet } from 'lucide-react';

interface LogisticsReportsProps {
}

export function LogisticsReports({ }: LogisticsReportsProps) {
  return (
    <div className="">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Inventario de Botellones
        </h2>
        <div className="flex gap-2">
          <Button
            variant='outline'
            className='hover:bg-red-500 hover:border-red-500!'
            size='sm'
            icon={<FileText size={18} />}
            iconPosition='right'
          >
            Pdf
          </Button>
          <Button
            variant='outline'
            className='hover:bg-green-600 hover:border-green-600!'
            size='sm'
            icon={<Sheet size={18} />}
            iconPosition='right'
          >
            Excel
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