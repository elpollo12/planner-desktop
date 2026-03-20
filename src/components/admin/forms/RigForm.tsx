import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-toastify';
import {
  Building2, HardHat, Users, Settings2, MapPin,
  ChevronRight, ChevronLeft, Plus, Trash2,
  UserCheck, UserX, Check, X, AlertCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useModalStore } from '@/store';
import { areasApi, companiesApi, rigPersonnelApi, rigContractorsApi, crewPositionsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  rigBasicSchema, inlineAreaSchema, inlineCompanySchema,
  type RigBasicFormData, type RigBasicOutputData,
  type InlineAreaFormData, type InlineCompanyFormData,
} from '@/schemas/rigSchemas';
import {
  VENEZUELA_STATES, COMMON_COUNTRIES,
} from '@/types/rig';
import type {
  RigWithArea, RigFull, CreateRigInput, UpdateRigInput,
  RigPersonnel, CreateRigPersonnelInput, Area,
} from '@/types/rig';
import type { Company } from '@/types/company';
import type { CrewPosition } from '@/types/crewPosition';
import { translateCrewPositionName } from '@/lib/translateCatalogs';

// ─── Constants ────────────────────────────────────────────────────────────────

const CREW_POSITION_KEYS = [
  'Perforador', 'Encuellador', 'Cuñero', 'Arenillero',
  'Mecánico', 'Soldador', 'Operador Montacargas',
  'Obrero', 'Supervisor', 'Otro',
];

type WizardStep = 1 | 2 | 3 | 4 | 5;

interface WizardState {
  name: string;
  power: string;
  active: boolean;
  areaId: string;
  areaName: string;
  operatorId: string;
  operatorName: string;
  contractorIds: string[];
  contractors?: { id: string; name: string }[]; // pre-seeded names for edit mode
  rigId: string | null;
}

// ─── Step metadata ────────────────────────────────────────────────────────────

const ACTIVE_OR_DONE_BAR = 'bg-primary-500 dark:bg-primary-400';
const PENDING_BAR        = 'bg-gray-200 dark:bg-gray-700';

// Step labels are resolved via t() inside component — these are just IDs
const STEPS: { step: WizardStep }[] = [
  { step: 1 },
  { step: 2 },
  { step: 3 },
  { step: 4 },
  { step: 5 },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface RigFormProps {
  rig?: RigFull | RigWithArea | null;
  onSubmit: (data: CreateRigInput | UpdateRigInput) => Promise<string | void>;
  onContractorsChanged?: (rigId: string, companyIds: string[]) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Root — routes to wizard (create) or edit form
// ─────────────────────────────────────────────────────────────────────────────

export default function RigForm({ rig, onSubmit, onContractorsChanged }: RigFormProps) {
  if (rig?.id) {
    return <EditRigForm rig={rig as RigFull} onSubmit={onSubmit} onContractorsChanged={onContractorsChanged} />;
  }
  return <CreateRigWizard onSubmit={onSubmit} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE wizard
// ─────────────────────────────────────────────────────────────────────────────

function CreateRigWizard({ onSubmit }: { onSubmit: (data: CreateRigInput) => Promise<string | void> }) {
  const [step, setStep] = useState<WizardStep>(1);
  const [wizard, setWizard] = useState<WizardState>({
    name: '', power: '', active: true,
    areaId: '', areaName: '',
    operatorId: '', operatorName: '',
    contractorIds: [],
    rigId: null,
  });

  // Indicator: 5 horizontal bars at the top, no labels, no right panel
  const StepIndicator = () => (
    <div className="flex gap-1.5 mb-5">
      {STEPS.map(({ step: s }) => (
        <div
          key={s}
          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
            s <= step ? ACTIVE_OR_DONE_BAR : PENDING_BAR
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <StepIndicator />
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {step === 1 && (
          <StepBasics
            wizard={wizard}
            onContinue={(name, power, active) => {
              setWizard((w) => ({ ...w, name, power, active }));
              setStep(2);
            }}
          />
        )}
        {step === 2 && (
          <StepArea
            wizard={wizard}
            onBack={() => setStep(1)}
            onContinue={(areaId, areaName) => {
              setWizard((w) => ({ ...w, areaId, areaName }));
              setStep(3);
            }}
          />
        )}
        {step === 3 && (
          <StepOperator
            wizard={wizard}
            onBack={() => setStep(2)}
            onContinue={(operatorId, operatorName) => {
              setWizard((w) => ({ ...w, operatorId, operatorName }));
              setStep(4);
            }}
          />
        )}
        {step === 4 && (
          <StepContractors
            wizard={wizard}
            onBack={() => setStep(3)}
            onContinue={async (contractorIds) => {
              const updated = { ...wizard, contractorIds };
              setWizard(updated);
              const input: CreateRigInput = {
                name: updated.name,
                operator: updated.operatorName,
                operatorId: updated.operatorId,
                power: updated.power,
                areaId: updated.areaId,
                active: updated.active,
                contractorIds,
              };
              const result = await onSubmit(input);
              if (typeof result === 'string') {
                setWizard((w) => ({ ...w, rigId: result }));
                setStep(5);
              }
            }}
          />
        )}
        {step === 5 && wizard.rigId && (
          <StepPersonnel rigId={wizard.rigId} rigName={wizard.name} />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Datos básicos
// ─────────────────────────────────────────────────────────────────────────────

interface StepBasicsProps {
  wizard: WizardState;
  mode?: 'create' | 'edit';
  onContinue: (name: string, power: string, active: boolean) => void | Promise<void>;
}

function StepBasics({ wizard, mode = 'create', onContinue }: StepBasicsProps) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RigBasicFormData>({
    resolver: zodResolver(rigBasicSchema),
    defaultValues: { name: wizard.name, power: wizard.power, active: wizard.active },
  });

  const handleContinue = handleSubmit(async (data) => {
    const out = data as RigBasicOutputData;
    setSubmitting(true);
    try {
      await onContinue(out.name, out.power, out.active);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="flex flex-col min-h-[70vh] h-full">
      <div className="flex-1 space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {mode === 'edit' ? t('admin.forms.editBasicDataDescription') : t('admin.forms.basicDataDescription')}
        </p>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {t('admin.forms.rigName')} <span className="text-red-500">*</span>
          </label>
          <Input
            {...register('name')}
            placeholder={t('admin.forms.rigNamePlaceholder')}
            error={errors.name?.message}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {t('admin.forms.power')} <span className="text-red-500">*</span>
          </label>
          <Input
            {...register('power')}
            placeholder={t('admin.forms.powerPlaceholder')}
            error={errors.power?.message}
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            {...register('active')}
            className="h-4 w-4 rounded text-primary-600 border-gray-300"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">{t('admin.forms.active')}</span>
        </label>
      </div>
      <StepFooter onBack={null} onContinue={handleContinue} continueLabel={mode === 'edit' ? t('admin.forms.saveAndContinue') : t('admin.forms.continue')} loading={submitting} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Área
// ─────────────────────────────────────────────────────────────────────────────

interface StepAreaProps {
  wizard: WizardState;
  onBack: () => void;
  onContinue: (areaId: string, areaName: string) => void | Promise<void>;
}

function StepArea({ wizard, onBack, onContinue }: StepAreaProps) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuthStore();
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInline, setShowInline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState(wizard.areaId);
  const [selectedArea, setSelectedArea] = useState<Area | null>(
    null // populated on create or select
  );
  const [stepError, setStepError] = useState('');

  const {
    register: regInline,
    handleSubmit: handleInline,
    watch: watchInline,
    formState: { errors: inlineErrors },
    reset: resetInline,
  } = useForm<InlineAreaFormData>({ resolver: zodResolver(inlineAreaSchema) });

  const inlineCountry = watchInline('country');
  const isVenezuela = inlineCountry?.toLowerCase().trim() === 'venezuela';

  useEffect(() => {
    areasApi.list(false).then(setAreas).finally(() => setLoading(false));
  }, []);

  const areaOptions = areas.map((a) => ({
    value: a.id,
    label: `${a.name} — ${a.country}, ${a.state}`,
  }));

  const handleCreateArea = async (data: InlineAreaFormData) => {
    setSaving(true);
    try {
      const newArea = await areasApi.create(user!.id, { ...data, active: true });
      // setAreas first so the new option exists when selectedId triggers a re-render
      setAreas((prev) => [...prev.filter((a) => a.id !== newArea.id), newArea]);
      setSelectedId(newArea.id);
      setSelectedArea(newArea);
      setShowInline(false);
      resetInline();
      toast.success(t('admin.forms.areaCreated', { name: newArea.name }));
    } catch {
      toast.error(t('admin.forms.areaCreateError'));
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    if (!selectedId) {
      setStepError(t('admin.forms.areaRequired'));
      return;
    }
    setStepError('');
    const area = selectedArea ?? areas.find((a) => a.id === selectedId);
    setSubmitting(true);
    try {
      await onContinue(selectedId, area?.name ?? '');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[70vh] h-full">
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('admin.forms.areaDescription')}
          </p>
          {!showInline && (
            <Button type="button" variant="outline" size="sm" icon={<Plus size={13} />}
              onClick={() => setShowInline(true)}>
              {t('admin.forms.new')}
            </Button>
          )}
        </div>

        {showInline && (
          <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">{t('admin.forms.newArea')}</span>
              <button type="button" onClick={() => { setShowInline(false); resetInline(); }}>
                <X size={14} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Input {...regInline('name')} placeholder={t('admin.forms.areaNamePlaceholder')} error={inlineErrors.name?.message} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('admin.forms.country')}</label>
                {/* País con datalist para sugerencias pero tipado libre */}
                <input
                  {...regInline('country')}
                  list="country-list"
                  placeholder={t('admin.forms.country')}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <datalist id="country-list">
                  {COMMON_COUNTRIES.map((c) => <option key={c} value={c} />)}
                </datalist>
                {inlineErrors.country && (
                  <p className="text-xs text-red-500 mt-0.5">{inlineErrors.country.message}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('admin.forms.stateRegion')}</label>
                {isVenezuela ? (
                  // Dropdown when Venezuela is selected
                  <select
                    {...regInline('state')}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">{t('admin.forms.selectState')}</option>
                    {VENEZUELA_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <Input {...regInline('state')} placeholder={t('admin.forms.stateRegion')} error={inlineErrors.state?.message} />
                )}
                {isVenezuela && inlineErrors.state && (
                  <p className="text-xs text-red-500 mt-0.5">{inlineErrors.state.message}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="primary" size="sm" loading={saving}
                onClick={handleInline(handleCreateArea)}>
                {t('admin.forms.saveArea')}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-4 text-center text-sm text-gray-400">{t('admin.forms.loadingAreas')}</div>
        ) : (
          <SearchableSelect
            label={t('admin.forms.geographicArea')}
            required
            placeholder={t('admin.forms.selectArea')}
            value={selectedId}
            options={areaOptions}
            onChange={(v) => { setSelectedId(v); setSelectedArea(areas.find((a) => a.id === v) ?? null); setStepError(''); }}
          />
        )}

        {selectedId && (() => {
          const area = selectedArea ?? areas.find((a) => a.id === selectedId);
          return area ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <Check size={14} className="text-blue-500 shrink-0" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300">{area.name}</span>
              <span className="text-xs text-blue-500 dark:text-blue-400">{area.country}, {area.state}</span>
            </div>
          ) : null;
        })()}

        {stepError && (
          <p className="flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle size={13} /> {stepError}
          </p>
        )}
      </div>

      <StepFooter onBack={onBack} onContinue={handleContinue} continueLabel={t('admin.forms.continue')} loading={submitting} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Operador
// ─────────────────────────────────────────────────────────────────────────────

interface StepOperatorProps {
  wizard: WizardState;
  onBack: () => void;
  onContinue: (operatorId: string, operatorName: string) => void | Promise<void>;
}

function StepOperator({ wizard, onBack, onContinue }: StepOperatorProps) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const { sessionToken } = useAuthStore();
  const [operators, setOperators] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInline, setShowInline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState(wizard.operatorId);
  const [selectedOp, setSelectedOp] = useState<Company | null>(null);
  const [stepError, setStepError] = useState('');

  const { register: regInline, handleSubmit: handleInline, formState: { errors: inlineErrors }, reset: resetInline } =
    useForm<InlineCompanyFormData>({ resolver: zodResolver(inlineCompanySchema) });

  const loadOperators = useCallback(async () => {
    if (!sessionToken) return;
    const data = await companiesApi.list(sessionToken, true, 'operator');
    setOperators(data);
    setLoading(false);
  }, [sessionToken]);

  useEffect(() => { loadOperators(); }, [loadOperators]);

  const operatorOptions = operators.map((c) => ({ value: c.id, label: c.name }));

  const handleCreateOperator = async (data: InlineCompanyFormData) => {
    if (!sessionToken) return;
    setSaving(true);
    try {
      const newOp = await companiesApi.create(sessionToken, { name: data.name, companyType: 'operator' });
      setOperators((prev) => [...prev.filter((o) => o.id !== newOp.id), newOp]);
      setSelectedId(newOp.id);
      setSelectedOp(newOp);
      setShowInline(false);
      resetInline();
      toast.success(t('admin.forms.operatorCreated', { name: newOp.name }));
    } catch {
      toast.error(t('admin.forms.operatorCreateError'));
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    if (!selectedId) {
      setStepError(t('admin.forms.operatorRequired'));
      return;
    }
    setStepError('');
    const op = selectedOp ?? operators.find((c) => c.id === selectedId);
    setSubmitting(true);
    try {
      await onContinue(selectedId, op?.name ?? '');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[70vh] h-full">
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('admin.forms.operatorDescription')}
          </p>
          {!showInline && (
            <Button type="button" variant="outline" size="sm" icon={<Plus size={13} />}
              onClick={() => setShowInline(true)}>
              {t('admin.forms.new')}
            </Button>
          )}
        </div>

        {showInline && (
          <InlineCompanyForm
            label={t('admin.forms.newOperator')}
            placeholder={t('admin.forms.operatorPlaceholder')}
            saving={saving}
            errors={inlineErrors}
            register={regInline}
            onCancel={() => { setShowInline(false); resetInline(); }}
            onSave={handleInline(handleCreateOperator)}
          />
        )}

        {loading ? (
          <div className="py-4 text-center text-sm text-gray-400">{t('admin.forms.loadingOperators')}</div>
        ) : (
          <SearchableSelect
            label={t('admin.forms.operatorLabel')}
            required
            placeholder={t('admin.forms.selectOperator')}
            value={selectedId}
            options={operatorOptions}
            onChange={(v) => { setSelectedId(v); setSelectedOp(operators.find((o) => o.id === v) ?? null); setStepError(''); }}
          />
        )}

        {selectedId && (() => {
          const op = selectedOp ?? operators.find((c) => c.id === selectedId);
          return op ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
              <Check size={14} className="text-indigo-500 shrink-0" />
              <Building2 size={13} className="text-indigo-400 shrink-0" />
              <span className="text-sm font-medium text-indigo-800 dark:text-indigo-300">{op.name}</span>
            </div>
          ) : null;
        })()}

        {stepError && (
          <p className="flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle size={13} /> {stepError}
          </p>
        )}
      </div>

      <StepFooter onBack={onBack} onContinue={handleContinue} continueLabel={t('admin.forms.continue')} loading={submitting} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — Contratistas
// ─────────────────────────────────────────────────────────────────────────────

interface StepContractorsProps {
  wizard: WizardState;
  onBack: () => void;
  mode?: 'create' | 'edit';
  onContinue: (contractorIds: string[]) => Promise<void>;
}

function StepContractors({ wizard, onBack, mode = 'create', onContinue }: StepContractorsProps) {
  const { t } = useTranslation();
  const { sessionToken } = useAuthStore();
  const [contractors, setContractors] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInline, setShowInline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingAdd, setPendingAdd] = useState('');
  const [stepError, setStepError] = useState('');
  // Names come from wizard.contractors (edit) or are resolved from API list after load
  const [selected, setSelected] = useState<{ id: string; name: string }[]>(
    wizard.contractors?.map((c) => ({ id: c.id, name: c.name })) ??
    wizard.contractorIds.map((id) => ({ id, name: '' }))
  );

  const { register: regInline, handleSubmit: handleInline, formState: { errors: inlineErrors }, reset: resetInline } =
    useForm<InlineCompanyFormData>({ resolver: zodResolver(inlineCompanySchema) });

  const loadContractors = useCallback(async () => {
    if (!sessionToken) return;
    // In edit mode load all (including inactive) so existing assignments resolve names
    const data = await companiesApi.list(sessionToken, mode === 'edit' ? false : true, 'contractor');
    setContractors(data);
    setLoading(false);
  }, [sessionToken, mode]);

  useEffect(() => { loadContractors(); }, [loadContractors]);

  const contractorOptions = contractors
    .filter((c) => !selected.some((s) => s.id === c.id))
    .map((c) => ({ value: c.id, label: c.name }));

  const handleAdd = () => {
    if (!pendingAdd) return;
    const company = contractors.find((c) => c.id === pendingAdd);
    if (!company) return;
    setSelected((prev) => [...prev, { id: company.id, name: company.name }]);
    setPendingAdd('');
    setStepError('');
  };

  const handleCreateContractor = async (data: InlineCompanyFormData) => {
    if (!sessionToken) return;
    setSaving(true);
    try {
      const newC = await companiesApi.create(sessionToken, { name: data.name, companyType: 'contractor' });
      // Update both lists atomically so the new entry appears selected immediately
      setContractors((prev) => [...prev, newC]);
      setSelected((prev) => [
        ...prev.filter((x) => x.id !== newC.id), // dedupe just in case
        { id: newC.id, name: newC.name },
      ]);
      setShowInline(false);
      resetInline();
      setStepError('');
      toast.success(t('admin.forms.contractorCreated', { name: newC.name }));
    } catch {
      toast.error(t('admin.forms.contractorCreateError'));
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    if (selected.length === 0) {
      setStepError('Se requiere al menos un contratista para continuar');
      return;
    }
    // In create mode, verify all prior steps were completed
    if (mode === 'create') {
      if (!wizard.name.trim() || !wizard.power.trim()) {
        setStepError('Nombre y potencia del taladro son requeridos — regresa al inicio');
        return;
      }
      if (!wizard.areaId) {
        setStepError('El área es requerida — regresa al paso 2');
        return;
      }
      if (!wizard.operatorId) {
        setStepError('El operador es requerido — regresa al paso 3');
        return;
      }
    }
    setStepError('');
    setSubmitting(true);
    try {
      await onContinue(selected.map((s) => s.id));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[70vh] h-full">
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Agrega una o más empresas contratistas.
          </p>
          {!showInline && (
            <Button type="button" variant="outline" size="sm" icon={<Plus size={13} />}
              onClick={() => setShowInline(true)}>
              Nuevo
            </Button>
          )}
        </div>

        {showInline && (
          <InlineCompanyForm
            label="Nuevo contratista"
            placeholder="Ej: Schlumberger, Halliburton"
            saving={saving}
            errors={inlineErrors}
            register={regInline}
            onCancel={() => { setShowInline(false); resetInline(); }}
            onSave={handleInline(handleCreateContractor)}
          />
        )}

        {loading ? (
          <div className="py-4 text-center text-sm text-gray-400">Cargando contratistas...</div>
        ) : (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <SearchableSelect
                label="Agregar contratista"
                placeholder={contractorOptions.length === 0 ? 'Sin disponibles' : 'Seleccionar...'}
                value={pendingAdd}
                options={contractorOptions}
                onChange={setPendingAdd}
                disabled={contractorOptions.length === 0}
              />
            </div>
            <Button type="button" variant="secondary" onClick={handleAdd}
              disabled={!pendingAdd} icon={<Plus size={15} />}>
              Agregar
            </Button>
          </div>
        )}

        {selected.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Asignados ({selected.length})
            </p>
            {selected.map((s) => {
              const name = contractors.find((c) => c.id === s.id)?.name ?? s.name;
              return (
                <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2">
                    <HardHat size={13} className="text-amber-500 shrink-0" />
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-300">{name}</span>
                  </div>
                  <button type="button" onClick={() => setSelected((p) => p.filter((x) => x.id !== s.id))}
                    className="text-amber-400 hover:text-red-500 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {selected.length === 0 && !loading && (
          <div className="py-3 text-center text-xs text-gray-400">
            Sin contratistas — agrega al menos uno
          </div>
        )}

        {stepError && (
          <p className="flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle size={13} /> {stepError}
          </p>
        )}
      </div>

      <StepFooter onBack={onBack} onContinue={handleContinue} continueLabel={mode === 'edit' ? 'Guardar contratistas' : 'Guardar y continuar'} loading={submitting} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 5 — Personal
// ─────────────────────────────────────────────────────────────────────────────

interface StepPersonnelProps {
  rigId: string;
  rigName: string;
}

function StepPersonnel({ rigId, rigName }: StepPersonnelProps) {
  const { t } = useTranslation();
  const { sessionToken } = useAuthStore();
  const [personnel, setPersonnel] = useState<RigPersonnel[]>([]);
  const [positions, setPositions] = useState<CrewPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newRow, setNewRow] = useState<{ name: string; ci: string; position: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: '', ci: '', position: '', active: true });

  const load = useCallback(async () => {
    const data = await rigPersonnelApi.list(rigId, true);
    setPersonnel(data);
    setLoading(false);
  }, [rigId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!sessionToken) return;
    crewPositionsApi.list(sessionToken, true).then(setPositions).catch(console.error);
  }, [sessionToken]);

  const handleAdd = async () => {
    if (!newRow?.name.trim() || !newRow.position) return;
    setSaving(true);
    try {
      const input: CreateRigPersonnelInput = {
        name: newRow.name.trim(),
        ci: newRow.ci.trim() || undefined,
        defaultPosition: newRow.position,
      };
      await rigPersonnelApi.create(rigId, input);
      setNewRow(null);
      await load();
    } catch {
      toast.error(t('admin.forms.personnelAddError'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editData.name.trim() || !editData.position) return;
    setSaving(true);
    try {
      await rigPersonnelApi.update(editingId, {
        name: editData.name.trim(),
        ci: editData.ci.trim() || undefined,
        defaultPosition: editData.position,
        active: editData.active,
      });
      setEditingId(null);
      await load();
    } catch {
      toast.error(t('admin.forms.personnelUpdateError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      await rigPersonnelApi.delete(id);
      await load();
    } catch {
      toast.error(t('admin.forms.personnelDeleteError'));
    } finally {
      setSaving(false);
    }
  };

  const allPositionNames = [
    ...CREW_POSITION_KEYS,
    ...positions.map((p) => p.name).filter((n) => !CREW_POSITION_KEYS.includes(n)),
  ];
  const positionOptions = [
    { value: '', label: t('admin.forms.select') },
    ...allPositionNames.map((p) => ({ value: p, label: translateCrewPositionName(p, t) })),
  ];

  return (
    <div className="flex flex-col min-h-[70vh] h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users size={15} className="text-green-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{rigName}</span>
        </div>
        <Button type="button" variant="secondary" size="sm" icon={<Plus size={14} />}
          disabled={!!newRow || saving}
          onClick={() => setNewRow({ name: '', ci: '', position: '' })}>
          Agregar
        </Button>
      </div>

      {loading ? (
        <div className="py-6 text-center text-sm text-gray-400">Cargando personal...</div>
      ) : (
        <div className="overflow-x-auto flex-1">
          <table className="min-w-full text-sm divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr className="text-xs text-gray-500 dark:text-gray-400">
                {['Nombre', 'CI', 'Posición', 'Estado', ''].map((h) => (
                  <th key={h} className="px-2 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {newRow && (
                <tr className="bg-blue-50/50 dark:bg-blue-900/10">
                  <td className="px-2 py-1.5"><Input value={newRow.name} onChange={(e) => setNewRow({ ...newRow, name: e.target.value })} placeholder="Nombre" /></td>
                  <td className="px-2 py-1.5"><Input value={newRow.ci} onChange={(e) => setNewRow({ ...newRow, ci: e.target.value })} placeholder="CI" /></td>
                  <td className="px-2 py-1.5">
                    <select value={newRow.position} onChange={(e) => setNewRow({ ...newRow, position: e.target.value })}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-2 py-1.5 focus:outline-none">
                      {positionOptions.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5 text-xs text-green-600">Activo</td>
                  <td className="px-2 py-1.5">
                    <div className="flex gap-1">
                      <Button type="button" variant="primary" size="sm" loading={saving}
                        disabled={!newRow.name.trim() || !newRow.position}
                        onClick={handleAdd}>✓</Button>
                      <button type="button" onClick={() => setNewRow(null)} className="text-xs text-gray-400 hover:text-gray-600 px-1">✕</button>
                    </div>
                  </td>
                </tr>
              )}

              {personnel.length === 0 && !newRow && (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-xs text-gray-400">
                    Sin personal — haz clic en "Agregar" para comenzar
                  </td>
                </tr>
              )}

              {personnel.map((p) =>
                editingId === p.id ? (
                  <tr key={p.id} className="bg-yellow-50/50 dark:bg-yellow-900/10">
                    <td className="px-2 py-1.5"><Input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} /></td>
                    <td className="px-2 py-1.5"><Input value={editData.ci} onChange={(e) => setEditData({ ...editData, ci: e.target.value })} /></td>
                    <td className="px-2 py-1.5">
                      <select value={editData.position} onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-2 py-1.5 focus:outline-none">
                        {positionOptions.map((po) => <option key={po.value} value={po.value}>{po.label}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <button type="button" onClick={() => setEditData({ ...editData, active: !editData.active })}
                        className={`flex items-center gap-1 text-xs ${editData.active ? 'text-green-600' : 'text-red-500'}`}>
                        {editData.active ? <UserCheck size={12} /> : <UserX size={12} />}
                        {editData.active ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex gap-1">
                        <Button type="button" variant="primary" size="sm" loading={saving}
                          disabled={!editData.name.trim() || !editData.position}
                          onClick={handleSaveEdit}>✓</Button>
                        <button type="button" onClick={() => setEditingId(null)} className="text-xs text-gray-400 px-1">✕</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={p.id} className={!p.active ? 'opacity-50' : ''}>
                    <td className="px-2 py-2 text-gray-900 dark:text-gray-100">{p.name}</td>
                    <td className="px-2 py-2 text-gray-500">{p.ci ?? '—'}</td>
                    <td className="px-2 py-2 text-gray-600 dark:text-gray-300">{translateCrewPositionName(p.defaultPosition, t)}</td>
                    <td className="px-2 py-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${p.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600'}`}>
                        {p.active ? t('admin.forms.active') : t('admin.forms.inactive')}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setEditingId(p.id); setEditData({ name: p.name, ci: p.ci ?? '', position: p.defaultPosition, active: p.active }); }}
                          className="text-blue-500 hover:text-blue-700 text-xs">Editar</button>
                        <button type="button" onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end pt-4 mt-3 border-t border-gray-200 dark:border-gray-700">
        <Button type="button" variant="primary" onClick={() => useModalStore.getState().closeModal()}>
          Finalizar
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EDIT — tab layout
// ─────────────────────────────────────────────────────────────────────────────

type EditTab = 'personal' | 'basics' | 'area' | 'operator' | 'contractors';

const EDIT_TABS: { id: EditTab; label: string; icon: React.ReactNode }[] = [
  { id: 'personal',     label: 'Personal',     icon: <Users     size={14} /> },
  { id: 'basics',       label: 'General',      icon: <Settings2 size={14} /> },
  { id: 'area',         label: 'Área',         icon: <MapPin    size={14} /> },
  { id: 'operator',     label: 'Operadora',    icon: <Building2 size={14} /> },
  { id: 'contractors',  label: 'Contratistas', icon: <HardHat   size={14} /> },
];

interface EditRigFormProps {
  rig: RigFull;
  onSubmit: (data: UpdateRigInput) => Promise<string | void>;
  onContractorsChanged?: (rigId: string, companyIds: string[]) => Promise<void>;
}

function EditRigForm({ rig, onSubmit, onContractorsChanged }: EditRigFormProps) {
  const { t } = useTranslation();
  const { sessionToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState<EditTab>('personal');

  // Local mirror of mutable fields — tabs update this on save so other tabs
  // immediately reflect the latest values without a full prop re-fetch.
  const [localRig, setLocalRig] = useState({
    name:         rig.name,
    power:        rig.power,
    active:       rig.active,
    areaId:       rig.areaId       ?? '',
    areaName:     rig.areaName     ?? '',
    operatorId:   rig.operatorId   ?? '',
    operatorName: rig.operator     ?? '',
    contractors:  rig.contractors?.map((c) => ({ id: c.companyId, name: c.companyName })) ?? [],
  });

  // ── Tab bar ────────────────────────────────────────────────────────────────
  const TabBar = () => (
    <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 -mx-1">
      {EDIT_TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setActiveTab(t.id)}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === t.id
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );

  // ── Tab: Personal ──────────────────────────────────────────────────────────
  // Reuses StepPersonnel directly — no changes needed

  // ── Tab: General (basics) ──────────────────────────────────────────────────
  const TabBasics = () => {
    const [saving, setSaving] = useState(false);
    const { register, handleSubmit, formState: { errors, isDirty } } =
      useForm<RigBasicFormData>({
        resolver: zodResolver(rigBasicSchema),
        defaultValues: { name: localRig.name, power: localRig.power, active: localRig.active },
      });

    const onSave = handleSubmit(async (data) => {
      const out = data as RigBasicOutputData;
      setSaving(true);
      try {
        await onSubmit({ name: out.name, power: out.power, active: out.active });
        setLocalRig((r) => ({ ...r, name: out.name, power: out.power, active: out.active }));
        toast.success(t('admin.forms.basicsUpdated'));
      } finally {
        setSaving(false);
      }
    });

    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Nombre, potencia y estado operativo del taladro.</p>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <Input {...register('name')} placeholder="Ej: TAL-001" error={errors.name?.message} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Potencia <span className="text-red-500">*</span>
          </label>
          <Input {...register('power')} placeholder="Ej: 2000 HP" error={errors.power?.message} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" {...register('active')} className="h-4 w-4 rounded text-primary-600 border-gray-300" />
          <span className="text-sm text-gray-700 dark:text-gray-300">Taladro activo</span>
        </label>
        <div className="flex justify-end pt-2">
          <Button type="button" variant="primary" size="sm" loading={saving} disabled={!isDirty} onClick={onSave}>
            Guardar cambios
          </Button>
        </div>
      </div>
    );
  };

  // ── Tab: Área ──────────────────────────────────────────────────────────────
  const TabArea = () => {
    const { user } = useAuthStore();
    const [areas, setAreas] = useState<Area[]>([]);
    const [loadingAreas, setLoadingAreas] = useState(true);
    const [selectedId, setSelectedId] = useState(localRig.areaId);
    const [selectedArea, setSelectedArea] = useState<Area | null>(null);
    const [showInline, setShowInline] = useState(false);
    const [inlineSaving, setInlineSaving] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const { register: regInline, handleSubmit: handleInline, watch: watchInline,
      formState: { errors: inlineErrors }, reset: resetInline } =
      useForm<InlineAreaFormData>({ resolver: zodResolver(inlineAreaSchema) });
    const inlineCountry = watchInline('country');
    const isVenezuela = inlineCountry?.toLowerCase().trim() === 'venezuela';

    useEffect(() => {
      areasApi.list(false).then(setAreas).finally(() => setLoadingAreas(false));
    }, []);

    const areaOptions = areas.map((a) => ({
      value: a.id, label: `${a.name} — ${a.country}, ${a.state}`,
    }));

    const handleCreateArea = async (data: InlineAreaFormData) => {
      setInlineSaving(true);
      try {
        const a = await areasApi.create(user!.id, { ...data, active: true });
        setAreas((prev) => [...prev.filter((x) => x.id !== a.id), a]);
        setSelectedId(a.id);
        setSelectedArea(a);
        setShowInline(false);
        resetInline();
        toast.success(t('admin.forms.areaCreated', { name: a.name }));
      } catch { toast.error(t('admin.forms.areaCreateError')); }
      finally { setInlineSaving(false); }
    };

    const handleSave = async () => {
      if (!selectedId) { setError('Debes seleccionar un área'); return; }
      setSaving(true);
      try {
        await onSubmit({ areaId: selectedId });
        const area = selectedArea ?? areas.find((a) => a.id === selectedId);
        setLocalRig((r) => ({ ...r, areaId: selectedId, areaName: area?.name ?? r.areaName }));
        setError('');
        toast.success(t('admin.forms.areaUpdated'));
      } finally { setSaving(false); }
    };

    const displayArea = selectedArea ?? areas.find((a) => a.id === selectedId);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">Área geográfica donde opera este taladro.</p>
          {!showInline && (
            <Button type="button" variant="outline" size="sm" icon={<Plus size={13} />} onClick={() => setShowInline(true)}>Nueva</Button>
          )}
        </div>

        {showInline && (
          <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Nueva área</span>
              <button type="button" onClick={() => { setShowInline(false); resetInline(); }}><X size={14} className="text-gray-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Input {...regInline('name')} placeholder="Nombre del área" error={inlineErrors.name?.message} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">País</label>
                <input {...regInline('country')} list="edit-tab-country-list" placeholder="País"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <datalist id="edit-tab-country-list">
                  {COMMON_COUNTRIES.map((c) => <option key={c} value={c} />)}
                </datalist>
                {inlineErrors.country && <p className="text-xs text-red-500 mt-0.5">{inlineErrors.country.message}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Estado / Región</label>
                {isVenezuela ? (
                  <select {...regInline('state')} className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Seleccionar...</option>
                    {VENEZUELA_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <Input {...regInline('state')} placeholder="Estado / Región" error={inlineErrors.state?.message} />
                )}
                {isVenezuela && inlineErrors.state && <p className="text-xs text-red-500 mt-0.5">{inlineErrors.state.message}</p>}
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="primary" size="sm" loading={inlineSaving} onClick={handleInline(handleCreateArea)}>Guardar área</Button>
            </div>
          </div>
        )}

        {loadingAreas ? (
          <div className="py-4 text-center text-sm text-gray-400">Cargando áreas...</div>
        ) : (
          <SearchableSelect
            label="Área geográfica" required placeholder="Seleccionar área..."
            value={selectedId} options={areaOptions}
            onChange={(v) => { setSelectedId(v); setSelectedArea(areas.find((a) => a.id === v) ?? null); setError(''); }}
          />
        )}

        {displayArea && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <Check size={14} className="text-blue-500 shrink-0" />
            <span className="text-sm font-medium text-blue-800 dark:text-blue-300">{displayArea.name}</span>
            <span className="text-xs text-blue-500 dark:text-blue-400">{displayArea.country}, {displayArea.state}</span>
          </div>
        )}

        {error && <p className="flex items-center gap-1.5 text-xs text-red-500"><AlertCircle size={13} />{error}</p>}

        <div className="flex justify-end pt-2">
          <Button type="button" variant="primary" size="sm" loading={saving}
            disabled={!selectedId || selectedId === localRig.areaId}
            onClick={handleSave}>
            Guardar área
          </Button>
        </div>
      </div>
    );
  };

  // ── Tab: Operadora ─────────────────────────────────────────────────────────
  const TabOperator = () => {
    const [operators, setOperators] = useState<Company[]>([]);
    const [loadingOps, setLoadingOps] = useState(true);
    const [selectedId, setSelectedId] = useState(localRig.operatorId);
    const [selectedOp, setSelectedOp] = useState<Company | null>(null);
    const [showInline, setShowInline] = useState(false);
    const [inlineSaving, setInlineSaving] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const { register: regInline, handleSubmit: handleInline,
      formState: { errors: inlineErrors }, reset: resetInline } =
      useForm<InlineCompanyFormData>({ resolver: zodResolver(inlineCompanySchema) });

    useEffect(() => {
      if (!sessionToken) return;
      companiesApi.list(sessionToken, true, 'operator')
        .then(setOperators).finally(() => setLoadingOps(false));
    }, []);

    const operatorOptions = operators.map((o) => ({ value: o.id, label: o.name }));

    const handleCreateOp = async (data: InlineCompanyFormData) => {
      if (!sessionToken) return;
      setInlineSaving(true);
      try {
        const op = await companiesApi.create(sessionToken, { name: data.name, companyType: 'operator' });
        setOperators((prev) => [...prev.filter((o) => o.id !== op.id), op]);
        setSelectedId(op.id);
        setSelectedOp(op);
        setShowInline(false);
        resetInline();
        toast.success(t('admin.forms.operatorCreated', { name: op.name }));
      } catch { toast.error(t('admin.forms.operatorCreateError')); }
      finally { setInlineSaving(false); }
    };

    const handleSave = async () => {
      if (!selectedId) { setError('Debes seleccionar una operadora'); return; }
      setSaving(true);
      try {
        const op = selectedOp ?? operators.find((o) => o.id === selectedId);
        await onSubmit({ operatorId: selectedId, operator: op?.name });
        setLocalRig((r) => ({ ...r, operatorId: selectedId, operatorName: op?.name ?? r.operatorName }));
        setError('');
        toast.success(t('admin.forms.operatorUpdated'));
      } finally { setSaving(false); }
    };

    const displayOp = selectedOp ?? operators.find((o) => o.id === selectedId);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">Empresa operadora responsable de este taladro.</p>
          {!showInline && (
            <Button type="button" variant="outline" size="sm" icon={<Plus size={13} />} onClick={() => setShowInline(true)}>Nueva</Button>
          )}
        </div>

        {showInline && (
          <InlineCompanyForm
            label="Nueva operadora" placeholder="Ej: PDVSA, Chevron"
            saving={inlineSaving} errors={inlineErrors} register={regInline}
            onCancel={() => { setShowInline(false); resetInline(); }}
            onSave={handleInline(handleCreateOp)}
          />
        )}

        {loadingOps ? (
          <div className="py-4 text-center text-sm text-gray-400">Cargando operadoras...</div>
        ) : (
          <SearchableSelect
            label="Operadora" required placeholder="Seleccionar operadora..."
            value={selectedId} options={operatorOptions}
            onChange={(v) => { setSelectedId(v); setSelectedOp(operators.find((o) => o.id === v) ?? null); setError(''); }}
          />
        )}

        {displayOp && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
            <Check size={14} className="text-indigo-500 shrink-0" />
            <Building2 size={13} className="text-indigo-400 shrink-0" />
            <span className="text-sm font-medium text-indigo-800 dark:text-indigo-300">{displayOp.name}</span>
          </div>
        )}

        {error && <p className="flex items-center gap-1.5 text-xs text-red-500"><AlertCircle size={13} />{error}</p>}

        <div className="flex justify-end pt-2">
          <Button type="button" variant="primary" size="sm" loading={saving}
            disabled={!selectedId || selectedId === localRig.operatorId}
            onClick={handleSave}>
            Guardar operadora
          </Button>
        </div>
      </div>
    );
  };

  // ── Tab: Contratistas ──────────────────────────────────────────────────────
  const TabContractors = () => {
    const [contractors, setContractors] = useState<Company[]>([]);
    const [loadingCon, setLoadingCon] = useState(true);
    const [selected, setSelected] = useState<{ id: string; name: string }[]>(localRig.contractors);
    const [pendingAdd, setPendingAdd] = useState('');
    const [showInline, setShowInline] = useState(false);
    const [inlineSaving, setInlineSaving] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const { register: regInline, handleSubmit: handleInline,
      formState: { errors: inlineErrors }, reset: resetInline } =
      useForm<InlineCompanyFormData>({ resolver: zodResolver(inlineCompanySchema) });

    useEffect(() => {
      if (!sessionToken) return;
      // Load all (incl. inactive) so previously assigned inactive contractors show names
      companiesApi.list(sessionToken, false, 'contractor')
        .then(setContractors).finally(() => setLoadingCon(false));
    }, []);

    const availableOptions = contractors
      .filter((c) => c.active && !selected.some((s) => s.id === c.id))
      .map((c) => ({ value: c.id, label: c.name }));

    const handleCreateContractor = async (data: InlineCompanyFormData) => {
      if (!sessionToken) return;
      setInlineSaving(true);
      try {
        const c = await companiesApi.create(sessionToken, { name: data.name, companyType: 'contractor' });
        setContractors((prev) => [...prev, c]);
        setSelected((prev) => [...prev.filter((x) => x.id !== c.id), { id: c.id, name: c.name }]);
        setShowInline(false);
        resetInline();
        toast.success(t('admin.forms.contractorCreated', { name: c.name }));
      } catch { toast.error(t('admin.forms.contractorCreateError')); }
      finally { setInlineSaving(false); }
    };

    const handleSave = async () => {
      if (selected.length === 0) { setError('Se requiere al menos un contratista'); return; }
      if (!sessionToken) return;
      setSaving(true);
      try {
        await rigContractorsApi.replaceAll(rig.id, selected.map((s) => s.id));
        onContractorsChanged?.(rig.id, selected.map((s) => s.id));
        setLocalRig((r) => ({ ...r, contractors: selected }));
        setError('');
        toast.success(t('admin.forms.contractorsUpdated'));
      } finally { setSaving(false); }
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">Empresas contratistas asignadas a este taladro.</p>
          {!showInline && (
            <Button type="button" variant="outline" size="sm" icon={<Plus size={13} />} onClick={() => setShowInline(true)}>Nuevo</Button>
          )}
        </div>

        {showInline && (
          <InlineCompanyForm
            label="Nuevo contratista" placeholder="Ej: Schlumberger, Halliburton"
            saving={inlineSaving} errors={inlineErrors} register={regInline}
            onCancel={() => { setShowInline(false); resetInline(); }}
            onSave={handleInline(handleCreateContractor)}
          />
        )}

        {loadingCon ? (
          <div className="py-4 text-center text-sm text-gray-400">Cargando contratistas...</div>
        ) : (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <SearchableSelect
                label="Agregar contratista"
                placeholder={availableOptions.length === 0 ? 'Sin disponibles' : 'Seleccionar...'}
                value={pendingAdd} options={availableOptions} onChange={setPendingAdd}
                disabled={availableOptions.length === 0}
              />
            </div>
            <Button type="button" variant="secondary" icon={<Plus size={15} />}
              disabled={!pendingAdd}
              onClick={() => {
                const c = contractors.find((x) => x.id === pendingAdd);
                if (c) { setSelected((p) => [...p, { id: c.id, name: c.name }]); setPendingAdd(''); setError(''); }
              }}>
              Agregar
            </Button>
          </div>
        )}

        <div className="space-y-1.5">
          {selected.map((s) => {
            const name = contractors.find((c) => c.id === s.id)?.name ?? s.name;
            return (
              <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2">
                  <HardHat size={13} className="text-amber-500 shrink-0" />
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-300">{name}</span>
                </div>
                <button type="button" onClick={() => setSelected((p) => p.filter((x) => x.id !== s.id))}
                  className="text-amber-400 hover:text-red-500 transition-colors"><X size={14} /></button>
              </div>
            );
          })}
          {selected.length === 0 && !loadingCon && (
            <p className="text-xs text-center text-gray-400 py-2">Sin contratistas asignados</p>
          )}
        </div>

        {error && <p className="flex items-center gap-1.5 text-xs text-red-500"><AlertCircle size={13} />{error}</p>}

        <div className="flex justify-end pt-2">
          <Button type="button" variant="primary" size="sm" loading={saving} onClick={handleSave}>
            Guardar contratistas
          </Button>
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0">
      <TabBar />
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {activeTab === 'personal'    && <StepPersonnel rigId={rig.id} rigName={localRig.name} />}
        {activeTab === 'basics'      && <TabBasics />}
        {activeTab === 'area'        && <TabArea />}
        {activeTab === 'operator'    && <TabOperator />}
        {activeTab === 'contractors' && <TabContractors />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface InlineCompanyFormProps {
  label: string;
  placeholder: string;
  saving: boolean;
  errors: Partial<Record<'name', { message?: string }>>;
  register: ReturnType<typeof useForm<InlineCompanyFormData>>['register'];
  onCancel: () => void;
  onSave: () => void;
}

function InlineCompanyForm({ label, placeholder, saving, errors, register, onCancel, onSave }: InlineCompanyFormProps) {
  return (
    <div className="rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/10 p-3 space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-primary-700 dark:text-primary-300 uppercase tracking-wide">{label}</span>
          <button type="button" onClick={onCancel}><X size={13} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
      )}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Input {...register('name')} placeholder={placeholder} error={errors.name?.message} />
        </div>
        <Button type="button" variant="primary" size="sm" loading={saving} onClick={onSave}>Guardar</Button>
        {!label && (
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 pb-0.5">
            <X size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

interface StepFooterProps {
  onBack: (() => void) | null;
  onContinue: () => void;
  continueLabel: string;
  loading?: boolean;
}

function StepFooter({ onBack, onContinue, continueLabel, loading }: StepFooterProps) {
  return (
    <div className="flex justify-between gap-3 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
      {onBack ? (
        <Button type="button" variant="ghost" onClick={onBack} icon={<ChevronLeft size={15} />}>
          Atrás
        </Button>
      ) : (
        <Button type="button" variant="outline" onClick={() => useModalStore.getState().closeModal()}>
          Cancelar
        </Button>
      )}
      <Button
        type="button"
        onClick={onContinue}
        loading={loading}
        icon={<ChevronRight size={15} />}
        iconPosition="right"
      >
        {continueLabel}
      </Button>
    </div>
  );
}
