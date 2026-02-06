import { AlertTriangle } from 'lucide-react';
import { useModal } from '../../store/modalStore';
import { Button } from '../ui';

interface ConfirmDeleteModalProps {
  message?: string;
  itemName?: string;
  onConfirm: () => void | Promise<void>;
}

export default function ConfirmDeleteModal({
  message = '¿Estás seguro de que deseas eliminar este reporte?',
  itemName,
  onConfirm,
}: ConfirmDeleteModalProps) {
  
  const { closeModal, updateOptions } = useModal();

  const handleConfirm = async () => {
    // Disable buttons while deleting
    updateOptions({ disableConfirm: true, disableCancel: true });
    
    try {
      await onConfirm();
      closeModal();
    } catch (error) {
      // Re-enable buttons if error
      updateOptions({ disableConfirm: false, disableCancel: false });
    }
  };

  return (
    <div className="space-y-4">
      {/* Icon */}
      <div className="flex justify-center">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-500" />
        </div>
      </div>

      {/* Message */}
      <div className="text-center">
        <p className="text-gray-700 dark:text-gray-300">
          {message}
        </p>
        {itemName && (
          <p className="mt-2 font-semibold text-gray-900 dark:text-gray-100">
            {itemName}
          </p>
        )}
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Esta acción no se puede deshacer.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4">
        <Button
          variant="outline"
          onClick={closeModal}
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirm}
          className="bg-red-600 hover:bg-red-700 focus:ring-red-500 dark:bg-red-600 dark:hover:bg-red-700"
        >
          Eliminar
        </Button>
      </div>
    </div>
  );
}
