import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, HardHat, Shield, KeyRound, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { modulePermissionsApi, usersApi, companiesApi } from '@/lib/api';
import { toast } from 'react-toastify';
import type { UserRole, UserWithRigs, AppModule } from '@/types/user';
import { APP_MODULES, MODULE_LABEL_KEYS, MODULE_DEFAULTS, PERMISSION_MODULES } from '@/types/user';
import type { Rig } from '@/types/rig';
import type { Company } from '@/types/company';

// ─── Types ────────────────────────────────────────────────────────────────────

type EditTab = 'user-data' | 'rigs' | 'permissions';

// Tab labels are resolved at render time via useTranslation
const EDIT_TAB_IDS: { id: EditTab; icon: React.ReactNode }[] = [
  { id: 'user-data',    icon: <User    size={14} /> },
  { id: 'rigs',         icon: <HardHat size={14} /> },
  { id: 'permissions',  icon: <Shield  size={14} /> },
];

export interface UserEditFormProps {
  user:          UserWithRigs;
  rigs:          Rig[];
  supervisors:   UserWithRigs[];
  currentUserId?: string;
  sessionToken:  string;
  onSubmit: (data: {
    fullName:       string;
    ci:             string;
    role:           UserRole;
    active:         boolean;
    companyId?:     string | null;
    hasAllRigs:     boolean;
    assignedRigIds: string[];
    supervisorId?:  string | null;
    modulePermissions?: Record<string, boolean>;
  }) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────

export default function UserEditForm({
  user, rigs, supervisors, currentUserId, sessionToken, onSubmit,
}: UserEditFormProps) {
  const { t } = useTranslation();
  const isSelf   = !!currentUserId && user.id === currentUserId;
  const isAdmin  = user.role === 'admin';
  const [activeTab, setActiveTab] = useState<EditTab>('user-data');
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    if (sessionToken) {
      companiesApi.list(sessionToken)
        .then((data) => setCompanies(data.filter((c) => c.active)))
        .catch(() => {});
    }
  }, [sessionToken]);

  // Local mirror so tabs reflect latest saved values
  const [localUser, setLocalUser] = useState({
    fullName:       user.fullName     ?? '',
    ci:             user.ci           ?? '',
    role:           user.role,
    active:         user.active       ?? true,
    hasAllRigs:     isAdmin ? true : (user.hasAllRigs ?? false),
    assignedRigIds: user.assignedRigIds ?? [],
    supervisorId:   user.supervisorId  ?? '',
    companyId:      user.companyId     ?? '',
  });

  // ── Tab bar ────────────────────────────────────────────────────────────────

  const TAB_LABELS: Record<EditTab, string> = {
    'user-data':   t('admin.forms.tabData'),
    'rigs':        t('admin.forms.tabRigs'),
    'permissions': t('admin.forms.tabPermissions'),
  };

  const EDIT_TABS = EDIT_TAB_IDS.map((tab) => ({ ...tab, label: TAB_LABELS[tab.id] }));

  const visibleTabs = EDIT_TABS.filter(
    (tab) => !(tab.id === 'permissions' && localUser.role === 'admin')
  );

  const TabBar = () => (
    <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 -mx-1">
      {visibleTabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setActiveTab(tab.id)}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === tab.id
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );

  // ── Partial submit helper (tabs save independently) ────────────────────────

  const savePartial = async (partial: Partial<typeof localUser>) => {
    const merged = { ...localUser, ...partial };
    await onSubmit({
      fullName:       merged.fullName,
      ci:             merged.ci,
      role:           merged.role as UserRole,
      active:         merged.active,
      companyId:      merged.companyId || null,
      hasAllRigs:     merged.hasAllRigs,
      assignedRigIds: merged.hasAllRigs ? [] : merged.assignedRigIds,
      supervisorId:   merged.role === 'operator' ? merged.supervisorId || null : null,
    });
    setLocalUser(merged);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0">
      <TabBar />
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {activeTab === 'user-data' && (
          <TabUserData
            localUser={localUser}
            isSelf={isSelf}
            supervisors={supervisors}
            companies={companies}
            sessionToken={sessionToken}
            userId={user.id}
            onSave={savePartial}
          />
        )}
        {activeTab === 'rigs' && (
          <TabRigs
            localUser={localUser}
            rigs={rigs}
            onSave={savePartial}
          />
        )}
        {activeTab === 'permissions' && localUser.role !== 'admin' && (
          <TabPermissions
            userId={user.id}
            role={localUser.role as UserRole}
            sessionToken={sessionToken}
            onSave={async (perms) => {
              await onSubmit({
                fullName:       localUser.fullName,
                ci:             localUser.ci,
                role:           localUser.role as UserRole,
                active:         localUser.active,
                companyId:      localUser.companyId || undefined,
                hasAllRigs:     localUser.hasAllRigs,
                assignedRigIds: localUser.hasAllRigs ? [] : localUser.assignedRigIds,
                supervisorId:   localUser.role === 'operator' ? localUser.supervisorId || null : null,
                modulePermissions: perms,
              });
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 1 — Datos de Usuario
// ─────────────────────────────────────────────────────────────────────────────

interface TabUserDataProps {
  localUser:    ReturnType<typeof buildLocalUser>;
  isSelf:       boolean;
  supervisors:  UserWithRigs[];
  companies:    Company[];
  sessionToken: string;
  userId:       string;
  onSave:       (partial: Partial<ReturnType<typeof buildLocalUser>>) => Promise<void>;
}

// small helper to type localUser
function buildLocalUser(user: UserWithRigs) {
  return {
    fullName:       user.fullName     ?? '',
    ci:             user.ci           ?? '',
    role:           user.role,
    active:         user.active       ?? true,
    hasAllRigs:     user.role === 'admin' ? true : (user.hasAllRigs ?? false),
    assignedRigIds: user.assignedRigIds ?? [],
    supervisorId:   user.supervisorId  ?? '',
    companyId:      user.companyId     ?? '',
  };
}

function TabUserData({ localUser, isSelf, supervisors, companies, sessionToken, userId, onSave }: TabUserDataProps) {
  const { t } = useTranslation();
  const [fullName,     setFullName]     = useState(localUser.fullName);
  const [ci,           setCi]           = useState(localUser.ci);
  const [role,         setRole]         = useState<UserRole>(localUser.role as UserRole);
  const [supervisorId, setSupervisorId] = useState(localUser.supervisorId);
  const [companyId,    setCompanyId]    = useState(localUser.companyId);
  const [hasCompany,   setHasCompany]   = useState(!!localUser.companyId);
  const [active,       setActive]       = useState(localUser.active);
  const [saving,       setSaving]       = useState(false);

  // Password change
  const [newPassword,      setNewPassword]      = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const isDirty =
    fullName     !== localUser.fullName     ||
    ci           !== localUser.ci           ||
    role         !== localUser.role         ||
    supervisorId !== localUser.supervisorId ||
    companyId    !== localUser.companyId    ||
    active       !== localUser.active;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ fullName, ci, role, supervisorId, companyId, active });
      toast.success(t('admin.forms.dataUpdated'));
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = (value: string) => {
    const newRole = value as UserRole;
    setRole(newRole);
    if (newRole !== 'operator') setSupervisorId('');
  };

  return (
    <div className="space-y-4 min-h-[50vh]">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('admin.forms.fullName')}</label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t('admin.forms.fullNamePlaceholder')} maxLength={100} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('admin.forms.idCard')}</label>
          <Input value={ci} onChange={(e) => setCi(e.target.value)} placeholder={t('admin.forms.idCardPlaceholder')} maxLength={20} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {t('admin.forms.role')} {isSelf && <span className="text-gray-400">({t('admin.forms.notEditable')})</span>}
          </label>
          <Select
            value={role}
            onChange={(e) => handleRoleChange(e.target.value)}
            disabled={isSelf}
            options={[
              { value: 'operator',   label: t('admin.forms.operator')      },
              { value: 'supervisor', label: t('admin.forms.supervisorRole')    },
              { value: 'admin',      label: t('admin.forms.admin') },
            ]}
          />
        </div>

        {role === 'operator' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('admin.forms.supervisor')}</label>
            <Select
              value={supervisorId}
              onChange={(e) => setSupervisorId(e.target.value)}
              options={[
                { value: '', label: t('admin.forms.selectSupervisor') },
                ...supervisors.map((s) => ({
                  value: s.id,
                  label: s.fullName || s.username,
                })),
              ]}
            />
          </div>
        )}
      </div>

      <div className={`rounded-lg p-3 border ${
        hasCompany
          ? 'bg-primary-50 dark:bg-primary-900/10 border-primary-200 dark:border-primary-800'
          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      }`}>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 shrink-0 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasCompany}
              onChange={(e) => {
                setHasCompany(e.target.checked);
                if (!e.target.checked) setCompanyId('');
              }}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.users.company')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.users.assignCompany')}</p>
            </div>
          </label>
          {hasCompany && (
            <div className="flex-1">
              <Select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                options={companies.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.companyType === 'operator' ? t('admin.companies.operator') : t('admin.companies.contractor')})`,
                }))}
              />
            </div>
          )}
        </div>
      </div>

      {/* Active toggle */}
      <div className={`flex items-center justify-between rounded-lg p-3 border ${
        isSelf
          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      }`}>
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.forms.userStatus')}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {isSelf
              ? t('admin.forms.cannotDeactivateSelf')
              : active
              ? t('admin.forms.activeCanLogin')
              : t('admin.forms.inactiveNoAccess')}
          </p>
        </div>
        <label className={`relative inline-flex items-center ${isSelf ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            disabled={isSelf}
            className="sr-only peer"
          />
          <div className={`w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-gray-50 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 ${isSelf ? 'opacity-50' : ''}`} />
        </label>
      </div>

      {/* Password change */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
          <KeyRound size={13} className="inline mr-1.5 -mt-0.5" />
          {t('admin.forms.changePassword')}
        </label>
        <div className="flex gap-2">
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t('admin.forms.newPasswordPlaceholder')}
            disabled={changingPassword}
            className="flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={changingPassword || newPassword.length < 4}
            onClick={async () => {
              setChangingPassword(true);
              try {
                await usersApi.adminChangePassword(sessionToken, userId, newPassword);
                toast.success(t('admin.forms.passwordUpdated'));
                setNewPassword('');
              } catch (err: any) {
                toast.error(err.message || t('admin.forms.passwordChangeError'));
              } finally {
                setChangingPassword(false);
              }
            }}
          >
            {changingPassword ? t('admin.forms.changing') : t('admin.forms.change')}
          </Button>
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <Button type="button" variant="primary" size="sm" loading={saving} disabled={!isDirty} onClick={handleSave}>
          {t('admin.forms.saveChanges')}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 2 — Taladros
// ─────────────────────────────────────────────────────────────────────────────

interface TabRigsProps {
  localUser: { role: string; hasAllRigs: boolean; assignedRigIds: string[] };
  rigs:      Rig[];
  onSave:    (partial: { hasAllRigs: boolean; assignedRigIds: string[] }) => Promise<void>;
}

function TabRigs({ localUser, rigs, onSave }: TabRigsProps) {
  const { t } = useTranslation();
  const isAdmin = localUser.role === 'admin';
  const [hasAllRigs,     setHasAllRigs]     = useState(isAdmin ? true : localUser.hasAllRigs);
  const [assignedRigIds, setAssignedRigIds] = useState<string[]>(localUser.assignedRigIds);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState('');

  const isDirty =
    hasAllRigs     !== localUser.hasAllRigs ||
    JSON.stringify([...assignedRigIds].sort()) !== JSON.stringify([...localUser.assignedRigIds].sort());

  const toggleRig = (id: string) => {
    setAssignedRigIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setError('');
  };

  const handleSave = async () => {
    if (!isAdmin && !hasAllRigs && assignedRigIds.length === 0) {
      setError(t('admin.forms.assignAtLeastOneRig'));
      return;
    }
    setSaving(true);
    try {
      await onSave({ hasAllRigs, assignedRigIds });
      setError('');
      toast.success(t('admin.forms.rigAccessUpdated'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 min-h-[50vh]">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {isAdmin
            ? t('admin.forms.adminAllRigsAccess')
            : t('admin.forms.defineRigAccessEdit')}
        </p>
        {!isAdmin && rigs.length > 0 && (
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

      {isAdmin ? (
        <div className="rounded-lg px-4 py-3 border bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
          <p className="text-sm text-purple-700 dark:text-purple-300">
            {t('admin.forms.fullAccessAdmin')}
          </p>
        </div>
      ) : !isAdmin && rigs.length === 0 ? (
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
        <div className="rounded-lg px-4 py-3 border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
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

      {!isAdmin && rigs.length > 0 && (
        <div className="flex justify-end pt-1">
          <Button type="button" variant="primary" size="sm" loading={saving} disabled={!isDirty} onClick={handleSave}>
            {t('admin.forms.saveAccess')}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 3 — Permisos
// ─────────────────────────────────────────────────────────────────────────────

interface TabPermissionsProps {
  userId:       string;
  role:         UserRole;
  sessionToken: string;
  onSave:       (perms: Record<AppModule, boolean>) => Promise<void>;
}

function TabPermissions({ userId, role, sessionToken, onSave }: TabPermissionsProps) {
  const { t } = useTranslation();
  const [perms,   setPerms]   = useState<Record<AppModule, boolean>>({ ...MODULE_DEFAULTS[role] });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    setLoading(true);
    modulePermissionsApi.getForUser(sessionToken, userId)
      .then((p) => setPerms(p as Record<AppModule, boolean>))
      .catch(() => setPerms({ ...MODULE_DEFAULTS[role] }))
      .finally(() => setLoading(false));
  }, [userId, sessionToken, role]);

  const isOverridden   = (mod: AppModule) => perms[mod] !== MODULE_DEFAULTS[role][mod];
  const hasAnyOverride = APP_MODULES.some(isOverridden);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(perms);
      toast.success(t('admin.forms.permissionsUpdated'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500" />
        <span className="ml-2 text-sm text-gray-500">{t('admin.forms.loadingPermissions')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 min-h-[50vh]">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('admin.forms.customizeModulesEdit')}
        </p>
        {hasAnyOverride && (
          <button
            type="button"
            onClick={() => setPerms({ ...MODULE_DEFAULTS[role] })}
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
                  {t(MODULE_LABEL_KEYS[mod])}
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

      <div className="flex justify-end pt-1">
        <Button type="button" variant="primary" size="sm" loading={saving} onClick={handleSave}>
          {t('admin.forms.savePermissions')}
        </Button>
      </div>
    </div>
  );
}
