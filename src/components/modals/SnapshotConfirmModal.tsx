import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';
import { useModal } from '../../store/modalStore';
import { Button } from '../ui';

interface SnapshotConfirmModalProps {
  rigName: string;
  onConfirm: () => void | Promise<void>;
  onReject: () => void;
}

export default function SnapshotConfirmModal({
  rigName,
  onConfirm,
  onReject,
}: SnapshotConfirmModalProps) {
  const { t } = useTranslation();
  const { closeModal } = useModal();

  const handleConfirm = async () => {
    await onConfirm();
    closeModal();
  };

  const handleReject = () => {
    onReject();
    closeModal();
  };

  return (
    <div className="space-y-4">
      {/* Icon */}
      <div className="flex justify-center">
        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
      </div>

      {/* Message */}
      <div className="text-center">
        <p className="text-gray-700 dark:text-gray-300">
          {t('reports.modals.snapshotFound')}
        </p>
        <p className="mt-2 font-semibold text-gray-900 dark:text-gray-100">
          {rigName}
        </p>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {t('reports.modals.snapshotDetail')}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4">
        <Button
          variant="outline"
          onClick={handleReject}
        >
          {t('reports.modals.snapshotReject')}
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirm}
        >
          {t('reports.modals.snapshotConfirm')}
        </Button>
      </div>
    </div>
  );
}
