import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-toastify';
import {
  Building2, HardHat, Users,
  ChevronRight, ChevronLeft, Plus,
  Check, X, AlertCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useModalStore } from '@/store';
import { areasApi, companiesApi, rigPersonnelApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  rigBasicSchema, inlineAreaSchema, inlineCompanySchema,
  type RigBasicFormData, type RigBasicOutputData,
  type InlineAreaFormData, type InlineCompanyFormData,
} from '@/schemas/rigSchemas';
import { VENEZUELA_STATES, COMMON_COUNTRIES } from '@/types/rig';
import type {
  CreateRigInput, RigPersonnel, CreateRigPersonnelInput, Area,
} from '@/types/rig';
import type { Company } from '@/types/company';

// ─── Constants ────────────────────────────────────────────────────────────────

const CREW_POSITIONS = [
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
  rigId: string | null;
}

const ACTIVE_OR_DONE_BAR = 'bg-primary-500 dark:bg-primary-400';
const PENDING_BAR        = 'bg-gray-200 dark:bg-gray-700';

const STEPS: { step: WizardStep }[] = [
  { step: 1 }, { step: 2 }, { step: 3 }, { step: 4 }, { step: 5 },
];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RigCreateFormProps {
  onSubmit: (data: CreateRigInput) => Promise<string | void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// RigCreateForm — 5-step wizard
// ─────────────────────────────────────────────────────────────────────────────

export default function RigCreateForm({ onSubmit }: RigCreateFormProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [wizard, setWizard] = useState<WizardState>({
    name: '', power: '', active: true,
    areaId: '', areaName: '',
    operatorId: '', operatorName: '',
    contractorIds: [],
    rigId: null,
  });

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
  onContinue: (name: string, power: string, active: boolean) => void;
}

function StepBasics({ wizard, onContinue }: StepBasicsProps) {
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<RigBasicFormData>({
    resolver: zodResolver(rigBasicSchema),
    defaultValues: { name: wizard.name, power: wizard.power, active: wizard.active },
  });

  const handleContinue = handleSubmit(async (data) => {
    const out = data as RigBasicOutputData;
    setSubmitting(true);
    try {
      onContinue(out.name, out.power, out.active);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="flex flex-col min-h-[50vh] h-full">
      <div className="flex-1 space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Ingresa los datos identificadores del taladro.
        </p>
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
          <input
            type="checkbox"
            {...register('active')}
            className="h-4 w-4 rounded text-primary-600 border-gray-300"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Taladro activo</span>
        </label>
      </div>
      <StepFooter onBack={null} onContinue={handleContinue} continueLabel="Continuar" loading={submitting} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Área
// ─────────────────────────────────────────────────────────────────────────────

interface StepAreaProps {
  wizard: WizardState;
  onBack: () => void;
  onContinue: (areaId: string, areaName: string) => void;
}

function StepArea({ wizard, onBack, onContinue }: StepAreaProps) {
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuthStore();
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInline, setShowInline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState(wizard.areaId);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [stepError, setStepError] = useState('');

  const {
    register: regInline, handleSubmit: handleInline, watch: watchInline,
    formState: { errors: inlineErrors }, reset: resetInline,
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
      setAreas((prev) => [...prev.filter((a) => a.id !== newArea.id), newArea]);
      setSelectedId(newArea.id);
      setSelectedArea(newArea);
      setShowInline(false);
      resetInline();
      toast.success(`Área "${newArea.name}" creada`);
    } catch {
      toast.error('Error al crear el área');
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    if (!selectedId) { setStepError('Debes seleccionar un área para continuar'); return; }
    setStepError('');
    const area = selectedArea ?? areas.find((a) => a.id === selectedId);
    setSubmitting(true);
    try {
      onContinue(selectedId, area?.name ?? '');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[50vh] h-full">
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Área geográfica donde opera este taladro.
          </p>
          {!showInline && (
            <Button type="button" variant="outline" size="sm" icon={<Plus size={13} />}
              onClick={() => setShowInline(true)}>
              Nueva
            </Button>
          )}
        </div>

        {showInline && (
          <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Nueva área</span>
              <button type="button" onClick={() => { setShowInline(false); resetInline(); }}>
                <X size={14} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Input {...regInline('name')} placeholder="Nombre del área" error={inlineErrors.name?.message} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">País</label>
                <input
                  {...regInline('country')}
                  list="create-country-list"
                  placeholder="País"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <datalist id="create-country-list">
                  {COMMON_COUNTRIES.map((c) => <option key={c} value={c} />)}
                </datalist>
                {inlineErrors.country && (
                  <p className="text-xs text-red-500 mt-0.5">{inlineErrors.country.message}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Estado / Región</label>
                {isVenezuela ? (
                  <select
                    {...regInline('state')}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar estado...</option>
                    {VENEZUELA_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <Input {...regInline('state')} placeholder="Estado / Región" error={inlineErrors.state?.message} />
                )}
                {isVenezuela && inlineErrors.state && (
                  <p className="text-xs text-red-500 mt-0.5">{inlineErrors.state.message}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="primary" size="sm" loading={saving}
                onClick={handleInline(handleCreateArea)}>
                Guardar área
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-4 text-center text-sm text-gray-400">Cargando áreas...</div>
        ) : (
          <SearchableSelect
            label="Área geográfica" required placeholder="Seleccionar área..."
            value={selectedId} options={areaOptions}
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
      <StepFooter onBack={onBack} onContinue={handleContinue} continueLabel="Continuar" loading={submitting} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Operador
// ─────────────────────────────────────────────────────────────────────────────

interface StepOperatorProps {
  wizard: WizardState;
  onBack: () => void;
  onContinue: (operatorId: string, operatorName: string) => void;
}

function StepOperator({ wizard, onBack, onContinue }: StepOperatorProps) {
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
      toast.success(`Operadora "${newOp.name}" creada`);
    } catch {
      toast.error('Error al crear la operadora');
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    if (!selectedId) { setStepError('Debes seleccionar un operador para continuar'); return; }
    setStepError('');
    const op = selectedOp ?? operators.find((c) => c.id === selectedId);
    setSubmitting(true);
    try {
      onContinue(selectedId, op?.name ?? '');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[50vh] h-full">
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Empresa operadora responsable de este taladro.
          </p>
          {!showInline && (
            <Button type="button" variant="outline" size="sm" icon={<Plus size={13} />}
              onClick={() => setShowInline(true)}>
              Nueva
            </Button>
          )}
        </div>

        {showInline && (
          <InlineCompanyForm
            label="Nueva operadora" placeholder="Ej: PDVSA, Chevron"
            saving={saving} errors={inlineErrors} register={regInline}
            onCancel={() => { setShowInline(false); resetInline(); }}
            onSave={handleInline(handleCreateOperator)}
          />
        )}

        {loading ? (
          <div className="py-4 text-center text-sm text-gray-400">Cargando operadoras...</div>
        ) : (
          <SearchableSelect
            label="Operadora" required placeholder="Seleccionar operadora..."
            value={selectedId} options={operatorOptions}
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
      <StepFooter onBack={onBack} onContinue={handleContinue} continueLabel="Continuar" loading={submitting} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — Contratistas
// ─────────────────────────────────────────────────────────────────────────────

interface StepContractorsProps {
  wizard: WizardState;
  onBack: () => void;
  onContinue: (contractorIds: string[]) => Promise<void>;
}

function StepContractors({ wizard, onBack, onContinue }: StepContractorsProps) {
  const { sessionToken } = useAuthStore();
  const [contractors, setContractors] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInline, setShowInline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingAdd, setPendingAdd] = useState('');
  const [stepError, setStepError] = useState('');
  const [selected, setSelected] = useState<{ id: string; name: string }[]>([]);

  const { register: regInline, handleSubmit: handleInline, formState: { errors: inlineErrors }, reset: resetInline } =
    useForm<InlineCompanyFormData>({ resolver: zodResolver(inlineCompanySchema) });

  const loadContractors = useCallback(async () => {
    if (!sessionToken) return;
    const data = await companiesApi.list(sessionToken, true, 'contractor');
    setContractors(data);
    setLoading(false);
  }, [sessionToken]);

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
      setContractors((prev) => [...prev, newC]);
      setSelected((prev) => [...prev.filter((x) => x.id !== newC.id), { id: newC.id, name: newC.name }]);
      setShowInline(false);
      resetInline();
      setStepError('');
      toast.success(`Contratista "${newC.name}" creado`);
    } catch {
      toast.error('Error al crear el contratista');
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    if (selected.length === 0) {
      setStepError('Se requiere al menos un contratista para continuar');
      return;
    }
    if (!wizard.name.trim() || !wizard.power.trim()) {
      setStepError('Nombre y potencia son requeridos — regresa al inicio');
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
    setStepError('');
    setSubmitting(true);
    try {
      await onContinue(selected.map((s) => s.id));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[50vh] h-full">
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
            label="Nuevo contratista" placeholder="Ej: Schlumberger, Halliburton"
            saving={saving} errors={inlineErrors} register={regInline}
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
                value={pendingAdd} options={contractorOptions} onChange={setPendingAdd}
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
            {selected.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2">
                  <HardHat size={13} className="text-amber-500 shrink-0" />
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-300">{s.name}</span>
                </div>
                <button type="button" onClick={() => setSelected((p) => p.filter((x) => x.id !== s.id))}
                  className="text-amber-400 hover:text-red-500 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ))}
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
      <StepFooter onBack={onBack} onContinue={handleContinue} continueLabel="Guardar y continuar" loading={submitting} />
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
  const [personnel, setPersonnel] = useState<RigPersonnel[]>([]);
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
      toast.error('Error al agregar personal');
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
      toast.error('Error al actualizar personal');
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
      toast.error('Error al eliminar personal');
    } finally {
      setSaving(false);
    }
  };

  const positionOptions = [
    { value: '', label: 'Seleccionar...' },
    ...CREW_POSITIONS.map((p) => ({ value: p, label: p })),
  ];

  return (
    <div className="flex flex-col min-h-[50vh] h-full">
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
                        {editData.active ? '✓ Activo' : '✕ Inactivo'}
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
                    <td className="px-2 py-2 text-gray-600 dark:text-gray-300">{p.defaultPosition}</td>
                    <td className="px-2 py-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${p.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600'}`}>
                        {p.active ? 'Activo' : 'Inact.'}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <button type="button"
                          onClick={() => { setEditingId(p.id); setEditData({ name: p.name, ci: p.ci ?? '', position: p.defaultPosition, active: p.active }); }}
                          className="text-blue-500 hover:text-blue-700 text-xs">Editar</button>
                        <button type="button" onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600">
                          ✕
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
// Shared: InlineCompanyForm
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
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-primary-700 dark:text-primary-300 uppercase tracking-wide">{label}</span>
        <button type="button" onClick={onCancel}><X size={13} className="text-gray-400 hover:text-gray-600" /></button>
      </div>
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Input {...register('name')} placeholder={placeholder} error={errors.name?.message} />
        </div>
        <Button type="button" variant="primary" size="sm" loading={saving} onClick={onSave}>Guardar</Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared: StepFooter
// ─────────────────────────────────────────────────────────────────────────────

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
