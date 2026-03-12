import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, SearchableSelect } from '../ui';
import { useModal } from '../../store/modalStore';
import { useCreateIncident, useRigPersonnel, useIncidentTypes } from '../../hooks/useIncidents';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';

interface IncidentFormProps {
  rigId: string;
}

export function IncidentForm({ rigId }: IncidentFormProps) {
  const { t } = useTranslation();
  const { closeModal } = useModal();
  const createMutation = useCreateIncident(rigId);
  const { data: personnel = [], isLoading: loadingPersonnel } = useRigPersonnel(rigId);
  const { data: incidentTypes = [] } = useIncidentTypes();

  const [incidentType, setIncidentType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [selectedPersonnelIds, setSelectedPersonnelIds] = useState<string[]>([]);

  // Sort alphabetically, but "Otro" always last
  const typeOptions = useMemo(() => {
    const sorted = [...incidentTypes].sort((a, b) => {
      const aIsOtro = a.name.toLowerCase() === 'otro';
      const bIsOtro = b.name.toLowerCase() === 'otro';
      if (aIsOtro && !bIsOtro) return 1;
      if (!aIsOtro && bIsOtro) return -1;
      return a.name.localeCompare(b.name, 'es');
    });
    return sorted.map((t) => ({ value: t.id, label: t.name }));
  }, [incidentTypes]);

  const togglePersonnel = (id: string) => {
    setSelectedPersonnelIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!incidentType) {
      toast.error(t('incidents.form.selectTypeError'));
      return;
    }
    if (!description.trim()) {
      toast.error(t('incidents.form.descriptionRequired'));
      return;
    }

    try {
      await createMutation.mutateAsync({
        incidentType,
        description: description.trim(),
        personnelIds: selectedPersonnelIds,
      });
      toast.success(t('incidents.form.createdSuccess'));
      closeModal();
    } catch (error) {
      toast.error(String(error));
    }
  };

  const activePersonnel = personnel.filter((p) => p.active);

  return (
    <div className="space-y-5">
      {/* Incident Type - Searchable */}
      <SearchableSelect
        label={t('incidents.form.typeLabel')}
        placeholder={t('incidents.form.typePlaceholder')}
        value={incidentType}
        options={typeOptions}
        onChange={setIncidentType}
        required
      />

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {t('incidents.form.descriptionLabel')} <span className="text-red-500">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          placeholder={t('incidents.form.descriptionPlaceholder')}
          className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 hover:border-gray-400 dark:hover:border-gray-500 resize-y"
        />
      </div>

      {/* Personnel Multi-Select */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {t('incidents.form.personnelLabel')}
        </label>
        {loadingPersonnel ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 size={14} className="animate-spin" />
            {t('incidents.form.loadingPersonnel')}
          </div>
        ) : activePersonnel.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {t('incidents.form.noPersonnelForRig')}
          </p>
        ) : (
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-48 overflow-y-auto">
            {activePersonnel.map((person) => {
              const isSelected = selectedPersonnelIds.includes(person.id);
              return (
                <label
                  key={person.id}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => togglePersonnel(person.id)}
                    className="rounded border-gray-300 dark:border-gray-600 text-primary-500 focus:ring-primary-500"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                      {person.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      {person.defaultPosition}
                    </span>
                  </div>
                  {person.ci && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      CI: {person.ci}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        )}
        {selectedPersonnelIds.length > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {selectedPersonnelIds.length !== 1 ? t('incidents.form.selectedCountPlural', { count: selectedPersonnelIds.length }) : t('incidents.form.selectedCount', { count: selectedPersonnelIds.length })}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="outline" onClick={closeModal}>
          {t('incidents.common.cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          loading={createMutation.isPending}
          disabled={!incidentType || !description.trim()}
        >
          {t('incidents.form.createBtn')}
        </Button>
      </div>
    </div>
  );
}
