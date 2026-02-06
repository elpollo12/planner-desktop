import { useModal } from '../../store/modalStore';
import { Button } from '../ui';

export default function TestModal() {
  const { closeModal } = useModal();

  return (
    <div className="space-y-4">
      <p className="text-gray-700">
        Este es un modal de prueba. Puedes usar este componente como ejemplo
        para crear tus propios modales personalizados.
      </p>z
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          💡 Tip
        </h4>
        <p className="text-sm text-blue-700">
          Los modales se pueden abrir desde cualquier lugar usando el hook <code className="bg-blue-100 px-1 rounded">useModal()</code>
        </p>
      </div>

      <div className="flex justify-end">
        <Button variant="primary" onClick={closeModal}>
          Entendido
        </Button>
      </div>
    </div>
  );
}
