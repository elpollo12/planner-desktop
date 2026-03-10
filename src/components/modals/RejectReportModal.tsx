import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui';
import { XCircle } from 'lucide-react';

interface RejectReportModalProps {
  reportLabel: string;
  onConfirm: (reason: string) => Promise<void>;
}

export default function RejectReportModal({
  reportLabel,
  onConfirm,
}: RejectReportModalProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <XCircle size={20} className="text-red-500 shrink-0" />
        <div>
          <p className="text-sm font-medium text-red-800 dark:text-red-300">
            {t('reports.modals.rejectReport')}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
            {reportLabel}
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {t('reports.modals.reasonLabel')} <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('reports.modals.reasonPlaceholder')}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-sm"
          autoFocus
        />
        <p className="text-xs text-gray-500 mt-1">
          {t('reports.modals.reasonHint')}
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          variant="danger"
          onClick={handleSubmit}
          disabled={!reason.trim() || loading}
          loading={loading}
          icon={<XCircle size={16} />}
        >
          {t('reports.modals.confirmRejection')}
        </Button>
      </div>
    </div>
  );
}
