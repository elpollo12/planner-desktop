import { useState } from 'react';
import { Button } from '../ui';
import { CheckCircle } from 'lucide-react';

interface ApproveReportModalProps {
  reportLabel: string;
  onConfirm: (comment?: string) => Promise<void>;
}

export default function ApproveReportModal({
  reportLabel,
  onConfirm,
}: ApproveReportModalProps) {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onConfirm(comment.trim() || undefined);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
        <CheckCircle size={20} className="text-green-500 shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-800 dark:text-green-300">
            Aprobar reporte
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
            {reportLabel}
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Comentario <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Ej: Aprobado con observación..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-sm"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          variant="success"
          onClick={handleSubmit}
          disabled={loading}
          loading={loading}
          icon={<CheckCircle size={16} />}
        >
          Confirmar Aprobación
        </Button>
      </div>
    </div>
  );
}
