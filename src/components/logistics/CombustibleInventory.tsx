// components/logistics/CombustibleInventory.tsx
import { Button, Card } from '../ui';
import { ArrowUpDown, FileText } from 'lucide-react';
import { useModalStore } from '../../store';
import { CombustibleForm } from './forms/combustible/CombustibleForm';

interface CombustibleInventoryProps {
  stats: {
    reserva: number;
    enUso: number;
    gastado: number;
    total: number;
  };
  onUpdate: () => void;
}

export function CombustibleInventory({ onUpdate }: CombustibleInventoryProps) {
  const { openModal } = useModalStore();

  const handleRegistrar = () => {
    openModal(
      <CombustibleForm onSuccess={onUpdate} initialTab="ingreso" />,
      {
        title: 'Registrar Movimiento de Combustible',
        size: 'xl',
        showCloseButton: true,
        closeOnOutsideClick: false,
      }
    );
  };

  const handleSolicitar = () => {
    openModal(
      <div className="p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          Formulario de solicitud de combustible (próximamente)
        </p>
      </div>,
      {
        title: 'Solicitar Combustible',
        size: 'md',
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Inventario de Combustible
        </h2>
        <div className="flex gap-2">
          <Button
            variant='secondary'
            size='sm'
            icon={<ArrowUpDown size={18} />}
            iconPosition='right'
            onClick={handleRegistrar}
          >
            Registrar
          </Button>
          
          <Button
            variant='outline'
            size='sm'
            icon={<FileText size={18} />}
            iconPosition='right'
            onClick={handleSolicitar}
          >
            Solicitar
          </Button>
        </div>
      </div>

      <Card>
        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
          <p>Tabla de movimientos de combustible (próximamente)</p>
        </div>
      </Card>
    </div>
  );
}