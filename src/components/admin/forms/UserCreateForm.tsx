import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ChevronRight, ChevronLeft,
  RotateCcw, Eye, EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useModalStore } from '@/store';
import type { UserRole, UserWithRigs, AppModule } from '@/types/user';
import { APP_MODULES, MODULE_LABELS, MODULE_DEFAULTS, PERMISSION_MODULES } from '@/types/user';
import type { Rig } from '@/types/rig';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const userDataSchema = z.object({
  username:     z.string().min(3, i18next.t('admin.forms.minChars', { count: 3 })).max(50, i18next.t('admin.forms.maxChars', { count: 50 })),
  password:     z.string().min(6, i18next.t('admin.forms.minChars', { count: 6 })),
  fullName:     z.string().max(100, i18next.t('admin.forms.maxChars', { count: 100 })).optional().or(z.literal('')),
  ci:           z.string().max(20,  i18next.t('admin.forms.maxChars', { count: 20 })).optional().or(z.literal('')),
  role:         z.enum(['admin', 'supervisor', 'operator']),
  supervisorId: z.string().optional(),
});

type UserDataFormValues = z.infer<typeof userDataSchema>;

// ─── Types ────────────────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3;

interface WizardState {
  username:          string;
  password:          string;
  fullName:          string;
  ci:                string;
  role:              UserRole;
  supervisorId:      string;
  hasAllRigs:        boolean;
  assignedRigIds:    string[];
  modulePermissions: Record<AppModule, boolean>;
}

export interface UserCreateFormProps {
  rigs:         Rig[];
  supervisors:  UserWithRigs[];
  sessionToken: string;
  onSubmit: (data: {
    username:           string;
    password:           string;
    fullName:           string;
    ci:                 string;
    role:               UserRole;
    hasAllRigs:         boolean;
    assignedRigIds:     string[];
    supervisorId?:      string;
    modulePermissions?: Record<string, boolean>;
  }) => Promise<void>;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const ACTIVE_BAR  = 'bg-primary-500 dark:bg-primary-400';
const PENDING_BAR = 'bg-gray-200 dark:bg-gray-700';

function StepIndicator({ step }: { step: WizardStep }) {
  return (
    <div className="flex gap-1.5 mb-5">
      {([1, 2, 3] as WizardStep[]).map((s) => (
        <div
          key={s}
          className={`h-1 flex-1 rounded-full transition-all duration-300 ${s <= step ? ACTIVE_BAR : PENDING_BAR}`}
        />
      ))}
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

interface StepFooterProps {
  onBack:        (() => void) | null;
  onContinue:    () => void;
  continueLabel: string;
  loading?:      boolean;
  disabled?:     boolean;
}

function StepFooter({ onBack, onContinue, continueLabel, loading, disabled }: StepFooterProps) {
  const { t } = useTranslation();
  return (
    <div className="flex justify-between gap-3 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
      {onBack ? (
        <Button type="button" variant="ghost" onClick={onBack} icon={<ChevronLeft size={15} />}>
          {t('admin.forms.back')}
        </Button>
      ) : (
        <Button type="button" variant="outline" onClick={() => useModalStore.getState().closeModal()}>
          {t('admin.forms.cancel')}
        </Button>
      )}
      <Button
        type="button"
        onClick={onContinue}
        loading={loading}
        disabled={disabled}
        icon={<ChevronRight size={15} />}
        iconPosition="right"
      >
        {continueLabel}
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────

export default function UserCreateForm({ rigs, supervisors, sessionToken: _sessionToken, onSubmit }: UserCreateFormProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [wizard, setWizard] = useState<WizardState>({
    username:          '',
    password:          '',
    fullName:          '',
    ci:                '',
    role:              'operator',
    supervisorId:      '',
    hasAllRigs:        false,
    assignedRigIds:    [],
    modulePermissions: { ...MODULE_DEFAULTS.operator },
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      <StepIndicator step={step} />
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {step === 1 && (
          <StepUserData
            wizard={wizard}
            supervisors={supervisors}
            onContinue={(data) => {
              setWizard((w) => ({
                ...w,
                ...data,
                modulePermissions: { ...MODULE_DEFAULTS[data.role] },
                hasAllRigs: data.role === 'admin' ? true : w.hasAllRigs,
              }));
              setStep(2);
            }}
          />
        )}
        {step === 2 && (
          <StepRigs
            wizard={wizard}
            rigs={rigs}
            onBack={() => setStep(1)}
            onContinue={(hasAllRigs, assignedRigIds) => {
              const updated = { ...wizard, hasAllRigs, assignedRigIds };
              setWizard(updated);
              if (wizard.role === 'admin') {
                handleFinalSubmit(updated);
              } else {
                setStep(3);
              }
            }}
          />
        )}
        {step === 3 && (
          <StepPermissions
            wizard={wizard}
            onBack={() => setStep(2)}
            onContinue={(modulePermissions) => {
              const final = { ...wizard, modulePermissions };
              setWizard(final);
              handleFinalSubmit(final);
            }}
          />
        )}
      </div>
    </div>
  );

  async function handleFinalSubmit(state: WizardState) {
    await onSubmit({
      username:          state.username,
      password:          state.password,
      fullName:          state.fullName,
      ci:                state.ci,
      role:              state.role,
      hasAllRigs:        state.hasAllRigs,
      assignedRigIds:    state.hasAllRigs ? [] : state.assignedRigIds,
      supervisorId:      state.role === 'operator' ? state.supervisorId || undefined : undefined,
      modulePermissions: state.role !== 'admin' ? state.modulePermissions : undefined,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Datos de Usuario
// ─────────────────────────────────────────────────────────────────────────────

interface StepUserDataProps {
  wizard:      WizardState;
  supervisors: UserWithRigs[];
  onContinue:  (data: Pick<WizardState, 'username' | 'password' | 'fullName' | 'ci' | 'role' | 'supervisorId'>) => void;
}

function StepUserData({ wizard, supervisors, onContinue }: StepUserDataProps) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting,   setSubmitting]   = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } =
    useForm<UserDataFormValues>({
      resolver: zodResolver(userDataSchema),
      defaultValues: {
        username:     wizard.username,
        password:     wizard.password,
        fullName:     wizard.fullName,
        ci:           wizard.ci,
        role:         wizard.role,
        supervisorId: wizard.supervisorId,
      },
    });

  const role = watch('role') as UserRole;

  const handleContinue = handleSubmit(async (data) => {
    setSubmitting(true);
    try {
      onContinue({
        username:     data.username,
        password:     data.password,
        fullName:     data.fullName     || '',
        ci:           data.ci           || '',
        role:         data.role         as UserRole,
        supervisorId: data.supervisorId || '',
      });
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="flex flex-col min-h-[55vh] h-full">
      <div className="flex-1 space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('admin.forms.enterCredentials')}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t('admin.forms.username')} <span className="text-red-500">*</span>
            </label>
            <Input
              {...register('username')}
              placeholder={t('admin.forms.usernamePlaceholder')}
              error={errors.username?.message}
              autoComplete="off"
            />
            <p className="mt-0.5 text-[11px] text-gray-400">{t('admin.forms.usernameHint')}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t('admin.forms.password')} <span className="text-red-500">*</span>
            </label>
            <div className="relative w-full">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                className={`w-full px-3 py-2.5 pr-9 bg-gray-50 dark:bg-gray-800 border rounded-lg text-gray-900 dark:text-gray-100 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 ${
                  errors.password
                    ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
            <p className="mt-0.5 text-[11px] text-gray-400">{t('admin.forms.passwordHint')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('admin.forms.fullName')}</label>
            <Input {...register('fullName')} placeholder={t('admin.forms.fullNamePlaceholder')} error={errors.fullName?.message} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('admin.forms.idCard')}</label>
            <Input {...register('ci')} placeholder={t('admin.forms.idCardPlaceholder')} error={errors.ci?.message} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {t('admin.forms.role')} <span className="text-red-500">*</span>
          </label>
          <Select
            {...register('role')}
            options={[
              { value: 'operator',   label: t('admin.forms.operator')      },
              { value: 'supervisor', label: t('admin.forms.supervisorRole')    },
              { value: 'admin',      label: t('admin.forms.admin') },
            ]}
          />
          <p className="mt-0.5 text-[11px] text-gray-400">
            {role === 'admin'
              ? t('admin.forms.roleHintAdmin')
              : role === 'supervisor'
              ? t('admin.forms.roleHintSupervisor')
              : t('admin.forms.roleHintOperator')}
          </p>
        </div>

        {role === 'operator' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t('admin.forms.supervisor')} <span className="text-red-500">*</span>
            </label>
            <Select
              {...register('supervisorId')}
              options={[
                { value: '', label: t('admin.forms.selectSupervisor') },
                ...supervisors.map((s) => ({ value: s.id, label: s.fullName || s.username })),
              ]}
            />
            <p className="mt-0.5 text-[11px] text-gray-400">{t('admin.forms.supervisorHint')}</p>
          </div>
        )}
      </div>

      <StepFooter onBack={null} onContinue={handleContinue} continueLabel={t('admin.forms.continue')} loading={submitting} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Taladros
// ─────────────────────────────────────────────────────────────────────────────

interface StepRigsProps {
  wizard:     WizardState;
  rigs:       Rig[];
  onBack:     () => void;
  onContinue: (hasAllRigs: boolean, assignedRigIds: string[]) => void;
}

function StepRigs({ wizard, rigs, onBack, onContinue }: StepRigsProps) {
  const { t } = useTranslation();
  const isAdmin = wizard.role === 'admin';
  const noRigs  = !isAdmin && rigs.length === 0;

  const [hasAllRigs,     setHasAllRigs]     = useState(isAdmin ? true : wizard.hasAllRigs);
  const [assignedRigIds, setAssignedRigIds] = useState<string[]>(wizard.assignedRigIds);
  const [error,          setError]          = useState('');
  const [submitting,     setSubmitting]     = useState(false);

  const toggleRig = (id: string) => {
    setAssignedRigIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setError('');
  };

  const handleContinue = async () => {
    if (!isAdmin && !hasAllRigs && assignedRigIds.length === 0) {
      setError(t('admin.forms.assignAtLeastOneRig'));
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      onContinue(hasAllRigs, assignedRigIds);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[55vh] h-full">
      <div className="flex-1 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isAdmin
              ? t('admin.forms.adminAutoAccess')
              : t('admin.forms.defineRigAccess')}
          </p>
          {!isAdmin && !noRigs && (
            <label className="flex items-center gap-2 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={hasAllRigs}
                onChange={(e) => {
                  setHasAllRigs(e.target.checked);
                  if (e.target.checked) setAssignedRigIds([]);
                  setError('');
                }}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{t('admin.forms.accessAll')}</span>
            </label>
          )}
        </div>

        {/* Content */}
        {isAdmin ? (
          <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 px-4 py-3">
            <p className="text-sm text-purple-700 dark:text-purple-300">
              {t('admin.forms.adminAllRigsNote')}
            </p>
          </div>
        ) : noRigs ? (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-4 flex gap-3">
            <span className="text-amber-500 dark:text-amber-400 shrink-0 mt-0.5">⚠</span>
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {t('admin.forms.noRigsAvailable')}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {t('admin.forms.noRigsHint')}
              </p>
            </div>
          </div>
        ) : hasAllRigs ? (
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3">
            <p className="text-sm text-green-700 dark:text-green-300">
              {t('admin.forms.fullRigAccess')}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setAssignedRigIds(rigs.map((r) => r.id)); setError(''); }}
                  className="text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400"
                >
                  {t('admin.forms.selectAll')}
                </button>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <button
                  type="button"
                  onClick={() => setAssignedRigIds([])}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  {t('admin.forms.deselectAll')}
                </button>
              </div>
              <span className="text-xs text-gray-400">{t('admin.forms.selected', { count: assignedRigIds.length })}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {rigs.map((rig) => {
                const selected = assignedRigIds.includes(rig.id);
                return (
                  <label
                    key={rig.id}
                    className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors border ${
                      selected
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700'
                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleRig(rig.id)}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{rig.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {rig.operator} — {rig.power}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      <StepFooter
        onBack={onBack}
        onContinue={handleContinue}
        continueLabel={wizard.role === 'admin' ? t('admin.forms.createUser') : t('admin.forms.continue')}
        loading={submitting}
        disabled={noRigs}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Permisos
// ─────────────────────────────────────────────────────────────────────────────

interface StepPermissionsProps {
  wizard:     WizardState;
  onBack:     () => void;
  onContinue: (permissions: Record<AppModule, boolean>) => void;
}

function StepPermissions({ wizard, onBack, onContinue }: StepPermissionsProps) {
  const { t } = useTranslation();
  const [perms,      setPerms]      = useState<Record<AppModule, boolean>>({ ...wizard.modulePermissions });
  const [submitting, setSubmitting] = useState(false);

  const isOverridden   = (mod: AppModule) => perms[mod] !== MODULE_DEFAULTS[wizard.role][mod];
  const hasAnyOverride = APP_MODULES.some(isOverridden);

  const handleContinue = async () => {
    setSubmitting(true);
    try {
      onContinue(perms);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[55vh] h-full">
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('admin.forms.customizeModules')}
          </p>
          {hasAnyOverride && (
            <button
              type="button"
              onClick={() => setPerms({ ...MODULE_DEFAULTS[wizard.role] })}
              className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 shrink-0"
            >
              <RotateCcw size={12} />
              {t('admin.forms.restoreDefaults')}
            </button>
          )}
        </div>

        <div className="space-y-2">
          {PERMISSION_MODULES.map((mod) => {
            const granted    = perms[mod];
            const overridden = isOverridden(mod);
            return (
              <label
                key={mod}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors border ${
                  granted
                    ? 'bg-green-50 dark:bg-green-900/15 border-green-200 dark:border-green-800'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={granted}
                    onChange={(e) => setPerms((prev) => ({ ...prev, [mod]: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {MODULE_LABELS[mod]}
                  </span>
                </div>
                {overridden && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400">
                    {t('admin.forms.customized')}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      <StepFooter onBack={onBack} onContinue={handleContinue} continueLabel={t('admin.forms.createUser')} loading={submitting} />
    </div>
  );
}
