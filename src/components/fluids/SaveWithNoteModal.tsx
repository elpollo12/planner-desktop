import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui';
import { Save } from 'lucide-react';

interface SaveWithNoteModalProps {
  tabLabel: string;
  onSave: (note: string | undefined) => Promise<void>;
  onCancel: () => void;
}

export function SaveWithNoteModal({ tabLabel, onSave, onCancel }: SaveWithNoteModalProps) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(note.trim() || undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t('fluids.changelog.savePrompt', { tab: tabLabel })}
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('fluids.changelog.noteLabel')}
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder={t('fluids.changelog.notePlaceholder')}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          autoFocus
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          {t('fluids.changelog.cancel')}
        </Button>
        <Button variant="primary" onClick={handleSave} loading={saving} icon={<Save size={14} />}>
          {note.trim() ? t('fluids.changelog.saveWithNote') : t('fluids.changelog.saveWithoutNote')}
        </Button>
      </div>
    </div>
  );
}
