import { useState, useEffect } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Select, Button } from '../ui';
import { Plus, Trash2 } from 'lucide-react';
import type { CompleteReportData } from '../../schemas';
import type { RigPersonnel } from '../../types/rig';
import { rigPersonnelApi, rigsApi, crewPositionsApi } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useModal } from '../../store/modalStore';
import { Input } from '../ui';
import type { CrewPosition } from '../../types/crewPosition';

type ShiftType = 'morning' | 'afternoon' | 'night';

// Sub-component for each shift's members
function ShiftMembers({
  shiftIndex,
  personnel,
  positions,
  onCreatePosition,
}: {
  shiftIndex: number;
  personnel: RigPersonnel[];
  positions: CrewPosition[];
  onCreatePosition: (memberIndex: number) => void;
}) {
  const { t } = useTranslation();
  const { register, control, setValue, watch } = useFormContext<CompleteReportData>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: `crew.shifts.${shiftIndex}.members` as any,
  });

  // Watch current members to filter already-selected personnel
  const currentMembers = watch(`crew.shifts.${shiftIndex}.members` as any) || [];

  const getAvailablePersonnel = (currentIndex: number) => {
    const selectedIds = currentMembers
      .map((m: any, i: number) => (i !== currentIndex ? m.personnelId : null))
      .filter(Boolean);
    return personnel.filter((p) => p.active && !selectedIds.includes(p.id));
  };

  const addMember = () => {
    append({
      personnelId: '',
      position: '',
      hours: undefined,
    });
  };

  const handlePersonnelSelect = (index: number, personnelId: string) => {
    const person = personnel.find((p) => p.id === personnelId);
    if (person) {
      setValue(`crew.shifts.${shiftIndex}.members.${index}.personnelId` as any, personnelId, { shouldDirty: true });
      setValue(`crew.shifts.${shiftIndex}.members.${index}.position` as any, person.defaultPosition || '', { shouldDirty: true });
    } else {
      setValue(`crew.shifts.${shiftIndex}.members.${index}.personnelId` as any, '', { shouldDirty: true });
      setValue(`crew.shifts.${shiftIndex}.members.${index}.position` as any, '', { shouldDirty: true });
    }
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('reports.forms.crew.members')}
        </h4>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addMember}
          disabled={personnel.length === 0}
          icon={<Plus size={16} />}
        >
          {t('reports.forms.crew.addMember')}
        </Button>
      </div>

      {personnel.length === 0 ? (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            {t('reports.forms.crew.noPersonnelWarning')}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('reports.forms.crew.personnel')}
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('reports.forms.crew.position')}
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-24">
                  {t('reports.forms.crew.hours')}
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-20">
                  {t('reports.forms.common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-50 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {fields.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-gray-500 text-sm">
                    {t('reports.forms.crew.noMembersHint')}
                  </td>
                </tr>
              ) : (
                fields.map((field, index) => {
                  const available = getAvailablePersonnel(index);
                  const currentPersonnelId = currentMembers[index]?.personnelId;

                  // Build options: current selection + available
                  const selectedPerson = personnel.find((p) => p.id === currentPersonnelId);
                  const personnelOptions = [
                    { value: '', label: t('reports.forms.crew.selectPersonnel') },
                    // Include current selection even if not in available list
                    ...(selectedPerson && !available.find((p) => p.id === selectedPerson.id)
                      ? [{ value: selectedPerson.id, label: `${selectedPerson.name}${selectedPerson.ci ? ` (${selectedPerson.ci})` : ''}` }]
                      : []),
                    ...available.map((p) => ({
                      value: p.id,
                      label: `${p.name}${p.ci ? ` (${p.ci})` : ''}`,
                    })),
                  ];

                  return (
                    <tr key={field.id}>
                      <td className="px-3 py-2">
                        <Select
                          value={currentPersonnelId || ''}
                          onChange={(e) => handlePersonnelSelect(index, e.target.value)}
                          options={personnelOptions}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          {...register(
                            `crew.shifts.${shiftIndex}.members.${index}.position` as any
                          )}
                          onChange={(e) => {
                            if (e.target.value === '__other__') {
                              e.target.value = currentMembers[index]?.position || '';
                              onCreatePosition(index);
                            } else {
                              setValue(`crew.shifts.${shiftIndex}.members.${index}.position` as any, e.target.value, { shouldDirty: true });
                            }
                          }}
                          options={[
                            ...positions.map((pos) => ({ value: pos.name, label: pos.name })),
                            { value: '__other__', label: `+ ${t('reports.forms.crew.otherPosition')}` },
                          ]}
                          placeholder={t('reports.forms.common.select')}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="24"
                          {...register(
                            `crew.shifts.${shiftIndex}.members.${index}.hours` as any,
                            { valueAsNumber: true }
                          )}
                          placeholder="8"
                          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CreatePositionModal({
  onSave,
  onCancel,
}: {
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = () => {
    if (!name.trim()) return;
    setSaving(true);
    onSave(name.trim());
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t('reports.forms.crew.newPositionDesc')}
      </p>
      <Input
        label={t('reports.forms.crew.positionName')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('reports.forms.crew.positionPlaceholder')}
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('actions.cancel')}
        </Button>
        <Button type="button" variant="primary" onClick={handleSubmit} disabled={!name.trim() || saving} loading={saving}>
          {t('actions.save')}
        </Button>
      </div>
    </div>
  );
}

export function CrewSection() {
  const { t } = useTranslation();
  const [activeShift, setActiveShift] = useState<ShiftType>('morning');
  const { register, watch, setValue: setFormValue } = useFormContext<CompleteReportData>();
  const { sessionToken } = useAuthStore();
  const { openModal, closeModal } = useModal();

  const rigName = watch('header.rigNumber');
  const [personnel, setPersonnel] = useState<RigPersonnel[]>([]);
  const [positions, setPositions] = useState<CrewPosition[]>([]);
  const [loading, setLoading] = useState(false);

  // Load crew positions (once)
  useEffect(() => {
    if (!sessionToken) return;
    crewPositionsApi.list(sessionToken, true)
      .then(setPositions)
      .catch(console.error);
  }, [sessionToken]);

  // Load rig personnel when rig changes
  useEffect(() => {
    if (!sessionToken || !rigName) {
      setPersonnel([]);
      return;
    }

    setLoading(true);
    rigsApi
      .listAccessible(sessionToken, false)
      .then((rigs) => {
        const rig = rigs.find((r) => r.name === rigName);
        if (rig) {
          return rigPersonnelApi.list(rig.id, false);
        }
        return [];
      })
      .then((data) => setPersonnel(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sessionToken, rigName]);

  const shiftIndex = activeShift === 'morning' ? 0 : activeShift === 'afternoon' ? 1 : 2;
  const shifts: ShiftType[] = ['morning', 'afternoon', 'night'];

  const handleCreatePosition = (memberIndex: number) => {
    openModal(
      <CreatePositionModal
        onSave={async (name) => {
          if (!sessionToken) return;
          try {
            const maxOrder = positions.reduce((max, p) => Math.max(max, p.sortOrder), 0);
            await crewPositionsApi.create(sessionToken, { name, sortOrder: maxOrder + 1 });
            // Reload positions, then set the new value after React re-renders
            const updated = await crewPositionsApi.list(sessionToken, true);
            setPositions(updated);
            closeModal();
            // Defer setValue to next tick so the select re-renders with new options first
            setTimeout(() => {
              setFormValue(`crew.shifts.${shiftIndex}.members.${memberIndex}.position` as any, name, { shouldDirty: true });
            }, 50);
          } catch (error) {
            console.error('Error creating position:', error);
          }
        }}
        onCancel={closeModal}
      />,
      { title: t('reports.forms.crew.newPosition'), size: 'sm', showCloseButton: true },
    );
  };

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
        {t('reports.forms.crew.title')}
      </h3>

      {!rigName && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            {t('reports.forms.crew.selectRigWarning')}
          </p>
        </div>
      )}

      {/* Shift Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4">
          {shifts.map((shift) => (
            <button
              key={shift}
              type="button"
              onClick={() => setActiveShift(shift)}
              className={`
                px-4 py-2 font-medium text-sm border-b-2 transition-colors
                ${
                  activeShift === shift
                    ? ''
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }
              `}
              style={
                activeShift === shift
                  ? {
                      color: 'var(--color-primary-500)',
                      borderBottomColor: 'var(--color-primary-500)',
                    }
                  : undefined
              }
            >
              {t(`reports.shiftLabels.${shift}`)}
            </button>
          ))}
        </nav>
      </div>

      {/* Shift Times */}
      <div key={`shift-times-${shiftIndex}`} className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('reports.forms.crew.shiftStart')}
          </label>
          <input
            type="time"
            {...register(`crew.shifts.${shiftIndex}.shiftStart` as any)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('reports.forms.crew.shiftEnd')}
          </label>
          <input
            type="time"
            {...register(`crew.shifts.${shiftIndex}.shiftEnd` as any)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Members Table */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">{t('reports.forms.crew.loadingPersonnel')}</div>
      ) : (
        <ShiftMembers
          key={`shift-${shiftIndex}`}
          shiftIndex={shiftIndex}
          personnel={personnel}
          positions={positions}
          onCreatePosition={handleCreatePosition}
        />
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>{t('reports.forms.crew.noteLabel')}</strong> {t('reports.forms.crew.noteText')}
        </p>
      </div>
    </div>
  );
}
