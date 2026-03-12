import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-toastify';
import {
  Building2, HardHat, Users, Settings2, MapPin,
  Plus, Trash2, UserCheck, UserX, Check, X, AlertCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { areasApi, companiesApi, rigPersonnelApi, rigContractorsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  rigBasicSchema, inlineAreaSchema, inlineCompanySchema,
  type RigBasicFormData, type RigBasicOutputData,
  type InlineAreaFormData, type InlineCompanyFormData,
} from '@/schemas/rigSchemas';
import { VENEZUELA_STATES, COMMON_COUNTRIES } from '@/types/rig';
import type {
  RigFull, UpdateRigInput,
  RigPersonnel, CreateRigPersonnelInput, Area,
} from '@/types/rig';
import type { Company } from '@/types/company';

import { translateCrewPositionName } from '@/lib/translateCatalogs';

// ─── Constants ────────────────────────────────────────────────────────────────

const CREW_POSITION_KEYS = [
  'Perforador', 'Encuellador', 'Cuñero', 'Arenillero',
  'Mecánico', 'Soldador', 'Operador Montacargas',
  'Obrero', 'Supervisor', 'Otro',
];

type EditTab = 'personal' | 'basics' | 'area' | 'operator' | 'contractors';

// Tab labels are resolved via t() inside the component to support i18n
const EDIT_TAB_IDS: { id: EditTab; icon: React.ReactNode }[] = [
  { id: 'basics',      icon: <Settings2 size={14} /> },
  { id: 'area',        icon: <MapPin    size={14} /> },
  { id: 'operator',    icon: <Building2 size={14} /> },
  { id: 'contractors', icon: <HardHat   size={14} /> },
  { id: 'personal',    icon: <Users     size={14} /> },
];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RigUpdateFormProps {
  rig: RigFull;
  onSubmit: (data: UpdateRigInput) => Promise<void>;
  onContractorsChanged?: (rigId: string, companyIds: string[]) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// RigUpdateForm
// ─────────────────────────────────────────────────────────────────────────────

export default function RigUpdateForm({ rig, onSubmit, onContractorsChanged }: RigUpdateFormProps) {
  const { t } = useTranslation();
  const { sessionToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState<EditTab>('basics');

  const [localRig, setLocalRig] = useState({
    name:         rig.name,
    power:        rig.power,
    active:       rig.active,
    areaId:       rig.areaId      ?? '',
    areaName:     rig.areaName    ?? '',
    operatorId:   rig.operatorId  ?? '',
    operatorName: rig.operator    ?? '',
    contractors:  rig.contractors?.map((c) => ({ id: c.companyId, name: c.companyName })) ?? [],
  });

  // ── Tab bar ────────────────────────────────────────────────────────────────

  const tabLabels: Record<EditTab, string> = {
    basics: t('admin.forms.tabGeneral'),
    area: t('admin.forms.tabArea'),
    operator: t('admin.forms.tabOperator'),
    contractors: t('admin.forms.tabContractors'),
    personal: t('admin.forms.tabPersonnel'),
  };

  const TabBar = () => (
    <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 -mx-1">
      {EDIT_TAB_IDS.map((tab) => (
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
          {tabLabels[tab.id]}
        </button>
      ))}
    </div>
  );

  // ── Tab: General ──────────────────────────────────────────────────────────

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
      <div className="space-y-4 min-h-[50vh]">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('admin.forms.basicsDescription')}
        </p>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {t('admin.forms.rigName')} <span className="text-red-500">*</span>
          </label>
          <Input {...register('name')} placeholder={t('admin.forms.rigNamePlaceholder')} error={errors.name?.message} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {t('admin.forms.power')} <span className="text-red-500">*</span>
          </label>
          <Input {...register('power')} placeholder={t('admin.forms.powerPlaceholder')} error={errors.power?.message} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" {...register('active')} className="h-4 w-4 rounded text-primary-600 border-gray-300" />
          <span className="text-sm text-gray-700 dark:text-gray-300">{t('admin.forms.active')}</span>
        </label>
        <div className="flex justify-end pt-2">
          <Button type="button" variant="primary" size="sm" loading={saving} disabled={!isDirty} onClick={onSave}>
            {t('admin.forms.saveChanges')}
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

    const {
      register: regInline, handleSubmit: handleInline, watch: watchInline,
      formState: { errors: inlineErrors }, reset: resetInline,
    } = useForm<InlineAreaFormData>({ resolver: zodResolver(inlineAreaSchema) });
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
      if (!selectedId) { setError(t('admin.forms.areaRequired')); return; }
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
      <div className="space-y-4 min-h-[50vh]">
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
                <X size={14} className="text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Input {...regInline('name')} placeholder={t('admin.forms.areaNamePlaceholder')} error={inlineErrors.name?.message} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('admin.forms.country')}</label>
                <input
                  {...regInline('country')}
                  list="update-tab-country-list"
                  placeholder={t('admin.forms.country')}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <datalist id="update-tab-country-list">
                  {COMMON_COUNTRIES.map((c) => <option key={c} value={c} />)}
                </datalist>
                {inlineErrors.country && (
                  <p className="text-xs text-red-500 mt-0.5">{inlineErrors.country.message}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('admin.forms.stateRegion')}</label>
                {isVenezuela ? (
                  <select
                    {...regInline('state')}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              <Button type="button" variant="primary" size="sm" loading={inlineSaving}
                onClick={handleInline(handleCreateArea)}>
                {t('admin.forms.saveArea')}
              </Button>
            </div>
          </div>
        )}

        {loadingAreas ? (
          <div className="py-4 text-center text-sm text-gray-400">{t('admin.forms.loadingAreas')}</div>
        ) : (
          <SearchableSelect
            label={t('admin.forms.geographicArea')} required placeholder={t('admin.forms.selectArea')}
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

        {error && (
          <p className="flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle size={13} /> {error}
          </p>
        )}

        <div className="flex justify-end pt-2">
          <Button type="button" variant="primary" size="sm" loading={saving}
            disabled={!selectedId || selectedId === localRig.areaId}
            onClick={handleSave}>
            {t('admin.forms.saveArea')}
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

    const { register: regInline, handleSubmit: handleInline, formState: { errors: inlineErrors }, reset: resetInline } =
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
      if (!selectedId) { setError(t('admin.forms.operatorRequired')); return; }
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
      <div className="space-y-4 min-h-[50vh]">
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
            label={t('admin.forms.newOperator')} placeholder={t('admin.forms.operatorPlaceholder')}
            saving={inlineSaving} errors={inlineErrors} register={regInline}
            onCancel={() => { setShowInline(false); resetInline(); }}
            onSave={handleInline(handleCreateOp)}
          />
        )}

        {loadingOps ? (
          <div className="py-4 text-center text-sm text-gray-400">{t('admin.forms.loadingOperators')}</div>
        ) : (
          <SearchableSelect
            label={t('admin.forms.operatorLabel')} required placeholder={t('admin.forms.selectOperator')}
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

        {error && (
          <p className="flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle size={13} /> {error}
          </p>
        )}

        <div className="flex justify-end pt-2">
          <Button type="button" variant="primary" size="sm" loading={saving}
            disabled={!selectedId || selectedId === localRig.operatorId}
            onClick={handleSave}>
            {t('admin.forms.saveOperator')}
          </Button>
        </div>
      </div>
    );
  };

  // ── Tab: Personal ──────────────────────────────────────────────────────────

  const TabPersonnel = () => {
    const [personnel, setPersonnel] = useState<RigPersonnel[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newRow, setNewRow] = useState<{ name: string; ci: string; position: string } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState({ name: '', ci: '', position: '', active: true });

    const load = useCallback(async () => {
      const data = await rigPersonnelApi.list(rig.id, true);
      setPersonnel(data);
      setLoading(false);
    }, []);

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
        await rigPersonnelApi.create(rig.id, input);
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

    const positionOptions = [
      { value: '', label: t('admin.forms.select') },
      ...CREW_POSITION_KEYS.map((p) => ({ value: p, label: translateCrewPositionName(p, t) })),
    ];

    return (
      <div className="min-h-[50vh]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-green-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{localRig.name}</span>
          </div>
          <Button type="button" variant="secondary" size="sm" icon={<Plus size={14} />}
            disabled={!!newRow || saving}
            onClick={() => setNewRow({ name: '', ci: '', position: '' })}>
            {t('admin.forms.add')}
          </Button>
        </div>

        {loading ? (
          <div className="py-6 text-center text-sm text-gray-400">{t('admin.forms.loadingPersonnel')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr className="text-xs text-gray-500 dark:text-gray-400">
                  {[t('admin.forms.personnelName'), t('admin.forms.personnelCI'), t('admin.forms.personnelPosition'), t('admin.forms.personnelStatus'), ''].map((h) => (
                    <th key={h} className="px-2 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {newRow && (
                  <tr className="bg-blue-50/50 dark:bg-blue-900/10">
                    <td className="px-2 py-1.5"><Input value={newRow.name} onChange={(e) => setNewRow({ ...newRow, name: e.target.value })} placeholder={t('admin.forms.personnelName')} /></td>
                    <td className="px-2 py-1.5"><Input value={newRow.ci} onChange={(e) => setNewRow({ ...newRow, ci: e.target.value })} placeholder={t('admin.forms.personnelCI')} /></td>
                    <td className="px-2 py-1.5">
                      <select value={newRow.position} onChange={(e) => setNewRow({ ...newRow, position: e.target.value })}
                        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-2 py-1.5 focus:outline-none">
                        {positionOptions.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 text-xs text-green-600">{t('admin.forms.active')}</td>
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
                      {t('admin.forms.noPersonnel')}
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
                          {editData.active ? t('admin.forms.active') : t('admin.forms.inactive')}
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
                          <button type="button"
                            onClick={() => { setEditingId(p.id); setEditData({ name: p.name, ci: p.ci ?? '', position: p.defaultPosition, active: p.active }); }}
                            className="text-blue-500 hover:text-blue-700 text-xs">
                            {t('admin.forms.edit')}
                          </button>
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
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-0">
      <TabBar />
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {activeTab === 'personal'    && <TabPersonnel />}
        {activeTab === 'basics'      && <TabBasics />}
        {activeTab === 'area'        && <TabArea />}
        {activeTab === 'operator'    && <TabOperator />}
        {activeTab === 'contractors' && (
          <TabContractors
            rigId={rig.id}
            initialContractors={localRig.contractors}
            sessionToken={sessionToken}
            onSaved={(updated) => setLocalRig((r) => ({ ...r, contractors: updated }))}
            onContractorsChanged={onContractorsChanged}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TabContractors — standalone para evitar closure stale en useState initializer
// ─────────────────────────────────────────────────────────────────────────────

interface TabContractorsProps {
  rigId: string;
  initialContractors: { id: string; name: string }[];
  sessionToken: string | null;
  onSaved: (updated: { id: string; name: string }[]) => void;
  onContractorsChanged?: (rigId: string, companyIds: string[]) => Promise<void>;
}

function TabContractors({
  rigId,
  initialContractors,
  sessionToken,
  onSaved,
  onContractorsChanged,
}: TabContractorsProps) {
  const { t } = useTranslation();
  const [contractors, setContractors] = useState<Company[]>([]);
  const [loadingCon, setLoadingCon] = useState(true);
  // initialContractors viene como prop estable — no hay closure stale
  const [selected, setSelected] = useState<{ id: string; name: string }[]>(initialContractors);
  const [pendingAdd, setPendingAdd] = useState('');
  const [showInline, setShowInline] = useState(false);
  const [inlineSaving, setInlineSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { register: regInline, handleSubmit: handleInline, formState: { errors: inlineErrors }, reset: resetInline } =
    useForm<InlineCompanyFormData>({ resolver: zodResolver(inlineCompanySchema) });

  useEffect(() => {
    if (!sessionToken) return;
    // Carga todos (incluyendo inactivos) para resolver nombres de asignaciones previas
    companiesApi.list(sessionToken, false, 'contractor')
      .then(setContractors).finally(() => setLoadingCon(false));
  }, [sessionToken]);

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
    if (selected.length === 0) { setError(t('admin.forms.contractorRequired')); return; }
    if (!sessionToken) return;
    setSaving(true);
    try {
      await rigContractorsApi.replaceAll(rigId, selected.map((s) => s.id));
      // Notifica al padre para actualizar localRig — NO vuelve a llamar replaceAll
      onSaved(selected);
      // Callback opcional para side-effects externos (ej: backgroundPush)
      await onContractorsChanged?.(rigId, selected.map((s) => s.id));
      setError('');
      toast.success(t('admin.forms.contractorsUpdated'));
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4 min-h-[50vh]">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('admin.forms.contractorsAssignedDescription')}
        </p>
        {!showInline && (
          <Button type="button" variant="outline" size="sm" icon={<Plus size={13} />}
            onClick={() => setShowInline(true)}>
            {t('admin.forms.newMasc')}
          </Button>
        )}
      </div>

      {showInline && (
        <InlineCompanyForm
          label={t('admin.forms.newContractor')} placeholder={t('admin.forms.contractorPlaceholder')}
          saving={inlineSaving} errors={inlineErrors} register={regInline}
          onCancel={() => { setShowInline(false); resetInline(); }}
          onSave={handleInline(handleCreateContractor)}
        />
      )}

      {loadingCon ? (
        <div className="py-4 text-center text-sm text-gray-400">{t('admin.forms.loadingContractors')}</div>
      ) : (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <SearchableSelect
              label={t('admin.forms.addContractor')}
              placeholder={availableOptions.length === 0 ? t('admin.forms.noneAvailable') : t('admin.forms.select')}
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
            {t('admin.forms.add')}
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
                className="text-amber-400 hover:text-red-500 transition-colors">
                <X size={14} />
              </button>
            </div>
          );
        })}
        {selected.length === 0 && !loadingCon && (
          <p className="text-xs text-center text-gray-400 py-2">{t('admin.forms.noContractorsAssigned')}</p>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-500">
          <AlertCircle size={13} /> {error}
        </p>
      )}

      <div className="flex justify-end pt-2">
        <Button type="button" variant="primary" size="sm" loading={saving} onClick={handleSave}>
          {t('admin.forms.saveContractors')}
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
  const { t } = useTranslation();
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
        <Button type="button" variant="primary" size="sm" loading={saving} onClick={onSave}>{t('admin.forms.save')}</Button>
      </div>
    </div>
  );
}
