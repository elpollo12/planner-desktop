import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  ChevronDown, ChevronUp, Plus, Pencil, Trash2, AlertTriangle,
} from 'lucide-react';
import { areasApi, operationCodesApi, materialsApi, crewPositionsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { backgroundPush } from '@/lib/syncHelper';
import { useModal } from '@/store/modalStore';
import { Button } from '@/components/ui/Button';
import { Table } from '@/components/ui/Table';
import { capitalize } from '@/lib/stringUtils';
import AreaForm from './forms/AreaForm';
import OperationCodeForm from './forms/OperationCodeForm';
import MaterialForm from './forms/MaterialForm';
import CrewPositionForm from './forms/CrewPositionForm';
import type { Area } from '@/types/rig';
import type { OperationCode } from '@/types/report';
import type { Material } from '@/types/logistics';
import type { CrewPosition } from '@/types/crewPosition';

// ─── Accordion Section ──────────────────────────────────────────────────────

interface AccordionSectionProps {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  badge?: number;
  openId: string | null;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}

function AccordionSection({ id, title, subtitle, icon, badge, openId, onToggle, children }: AccordionSectionProps) {
  const isOpen = openId === id;
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white dark:bg-gray-800 hover:bg-primary-100 dark:hover:bg-gray-600 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-gray-500 dark:text-gray-400">{icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-gray-100">{title}</span>
              {badge !== undefined && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {badge}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
        {isOpen ? <ChevronUp size={18} className="text-gray-400 shrink-0" /> : <ChevronDown size={18} className="text-gray-400 shrink-0" />}
      </button>
      {isOpen && (
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Confirm Delete Modal ────────────────────────────────────────────────────

interface ConfirmDeleteProps {
  name: string;
  warningLines?: string[];
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

function ConfirmDeleteModal({ name, warningLines, onConfirm, onCancel }: ConfirmDeleteProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const handleConfirm = async () => {
    setLoading(true);
    try { await onConfirm(); } finally { setLoading(false); }
  };
  return (
    <div className="space-y-4">
      <p className="text-gray-700 dark:text-gray-300">
        {t('admin.misc.confirmDeletePrompt')} <strong className="text-gray-900 dark:text-gray-100">"{name}"</strong>?
      </p>
      {warningLines && warningLines.length > 0 && (
        <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2.5 space-y-1">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
            <AlertTriangle size={14} /> {t('admin.misc.potentialImpact')}
          </p>
          {warningLines.map((line, i) => (
            <p key={i} className="text-sm text-amber-700 dark:text-amber-400">{line}</p>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.misc.irreversible')}</p>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>{t('admin.forms.cancel')}</Button>
        <Button variant="danger" size="sm" onClick={handleConfirm} disabled={loading}>
          {loading ? t('admin.forms.deleting') : t('admin.forms.delete')}
        </Button>
      </div>
    </div>
  );
}

// ─── Areas Section ───────────────────────────────────────────────────────────

function AreasSection() {
  const { t } = useTranslation();
  const { user, sessionToken } = useAuthStore();
  const { openModal, closeModal } = useModal();
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { setAreas(await areasApi.list(true)); }
    catch { toast.error(t('admin.misc.loadAreasError')); }
    finally { setLoading(false); }
  };

  const handleCreate = () => {
    openModal(
      <AreaForm onSubmit={async (data) => {
        try {
          await areasApi.create(user!.id, data);
          toast.success(t('admin.misc.areaCreated'));
          closeModal(); load();
          if (sessionToken) backgroundPush(sessionToken);
        } catch (e: any) { toast.error(e?.message || t('admin.misc.areaCreateError')); }
      }} />,
      { title: t('admin.misc.createArea'), size: 'md', showCloseButton: true }
    );
  };

  const handleEdit = (area: Area) => {
    openModal(
      <AreaForm area={area} onSubmit={async (data) => {
        try {
          await areasApi.update(area.id, user!.id, data);
          toast.success(t('admin.misc.areaUpdated'));
          closeModal(); load();
          if (sessionToken) backgroundPush(sessionToken);
        } catch (e: any) { toast.error(e?.message || t('admin.misc.areaUpdateError')); }
      }} />,
      { title: t('admin.misc.editArea'), size: 'md', showCloseButton: true }
    );
  };

  const handleDelete = (area: Area) => {
    openModal(
      <ConfirmDeleteModal
        name={area.name}
        warningLines={[t('admin.misc.areaDeleteImpact')]}
        onConfirm={async () => {
          await areasApi.delete(area.id);
          toast.success(t('admin.misc.areaDeleted'));
          closeModal(); load();
          if (sessionToken) backgroundPush(sessionToken);
        }}
        onCancel={closeModal}
      />,
      { title: t('admin.misc.confirmDeletion'), size: 'sm' }
    );
  };

  const columns = [
    { key: 'name', header: t('admin.forms.nameLabel'), render: (a: Area) => <span className="font-medium">{a.name}</span> },
    { key: 'country', header: t('admin.forms.country'), render: (a: Area) => a.country },
    { key: 'state', header: t('admin.forms.stateProvince'), render: (a: Area) => a.state },
    { key: 'status', header: t('admin.misc.status'), render: (a: Area) => (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${a.active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
        {a.active ? t('admin.forms.active') : t('admin.forms.inactive')}
      </span>
    )},
    { key: 'actions', header: t('admin.misc.actions'), render: (a: Area) => (
      <div className="flex gap-1.5">
        <Button variant="secondary" size="sm" onClick={() => handleEdit(a)} title={t('admin.forms.edit')}><Pencil size={14} /></Button>
        <Button variant="danger" size="sm" onClick={() => handleDelete(a)} title={t('admin.forms.delete')}><Trash2 size={14} /></Button>
      </div>
    )},
  ];

  return (
    <SectionContent
      loading={loading}
      empty={areas.length === 0}
      emptyText={t('admin.misc.noAreas')}
      onAdd={handleCreate}
      addLabel={t('admin.misc.newArea')}
    >
      <Table columns={columns} data={areas} pagination pageSize={5} pageSizeOptions={[5, 10, 20]} hoverable striped />
    </SectionContent>
  );
}

// ─── Operation Codes Section ─────────────────────────────────────────────────

function CodesSection() {
  const { t } = useTranslation();
  const { sessionToken } = useAuthStore();
  const { openModal, closeModal } = useModal();
  const [codes, setCodes] = useState<OperationCode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    if (!sessionToken) return;
    setLoading(true);
    try { setCodes(await operationCodesApi.list(sessionToken, false)); }
    catch { toast.error(t('admin.misc.loadCodesError')); }
    finally { setLoading(false); }
  };

  const handleCreate = () => {
    openModal(
      <OperationCodeForm onSubmit={async (data) => {
        try {
          await operationCodesApi.create(sessionToken!, data);
          toast.success(t('admin.misc.codeCreated'));
          closeModal(); load(); backgroundPush(sessionToken!);
        } catch (e: any) { toast.error(e?.message || t('admin.misc.codeCreateError')); }
      }} />,
      { title: t('admin.misc.createCode'), size: 'md', showCloseButton: true }
    );
  };

  const handleEdit = (code: OperationCode) => {
    openModal(
      <OperationCodeForm code={code} onSubmit={async (data) => {
        try {
          await operationCodesApi.update(sessionToken!, code.id, data);
          toast.success(t('admin.misc.codeUpdated'));
          closeModal(); load(); backgroundPush(sessionToken!);
        } catch (e: any) { toast.error(e?.message || t('admin.misc.codeUpdateError')); }
      }} />,
      { title: t('admin.operationCodes.editTitle', { code: code.code }), size: 'md', showCloseButton: true }
    );
  };

  const handleDelete = (code: OperationCode) => {
    openModal(
      <ConfirmDeleteModal
        name={`${code.code} - ${code.name}`}
        warningLines={[t('admin.misc.codeDeleteImpact')]}
        onConfirm={async () => {
          await operationCodesApi.delete(sessionToken!, code.id);
          toast.success(t('admin.misc.codeDeleted'));
          closeModal(); load(); backgroundPush(sessionToken!);
        }}
        onCancel={closeModal}
      />,
      { title: t('admin.misc.confirmDeletion'), size: 'sm' }
    );
  };

  const columns = [
    { key: 'code', header: t('admin.operationCodes.code'), render: (c: OperationCode) => <span className="font-medium font-mono">{c.code}</span> },
    { key: 'name', header: t('admin.forms.nameLabel'), render: (c: OperationCode) => c.name },
    { key: 'category', header: t('admin.forms.categoryLabel'), render: (c: OperationCode) => c.category || '—' },
    { key: 'status', header: t('admin.misc.status'), render: (c: OperationCode) => (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${c.active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
        {c.active ? t('admin.forms.active') : t('admin.forms.inactive')}
      </span>
    )},
    { key: 'actions', header: t('admin.misc.actions'), render: (c: OperationCode) => (
      <div className="flex gap-1.5">
        <Button variant="secondary" size="sm" onClick={() => handleEdit(c)} title={t('admin.forms.edit')}><Pencil size={14} /></Button>
        <Button variant="danger" size="sm" onClick={() => handleDelete(c)} title={t('admin.forms.delete')}><Trash2 size={14} /></Button>
      </div>
    )},
  ];

  return (
    <SectionContent
      loading={loading}
      empty={codes.length === 0}
      emptyText={t('admin.misc.noCodes')}
      onAdd={handleCreate}
      addLabel={t('admin.misc.newCode')}
    >
      <Table columns={columns} data={codes} pagination pageSize={5} pageSizeOptions={[5, 10, 20]} hoverable striped />
    </SectionContent>
  );
}

// ─── Materials Section ──────────────────────────────────────────────────────────────────────

function MaterialsSection() {
  const { t } = useTranslation();
  const { sessionToken } = useAuthStore();
  const { openModal, closeModal } = useModal();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    if (!sessionToken) return;
    setLoading(true);
    try { setMaterials(await materialsApi.list(sessionToken, false)); }
    catch { toast.error(t('admin.misc.materialsLoadError')); }
    finally { setLoading(false); }
  };

  const handleCreate = () => {
    openModal(
      <MaterialForm
        onSubmit={async (data) => {
          await materialsApi.create(sessionToken!, data);
          toast.success(t('admin.misc.materialCreated'));
          closeModal();
          load();
        }}
        onCancel={closeModal}
      />,
      { title: t('admin.misc.newMaterial'), size: 'md', showCloseButton: true }
    );
  };

  const handleEdit = (m: Material) => {
    openModal(
      <MaterialForm
        material={m}
        onSubmit={async (data) => {
          await materialsApi.update(sessionToken!, m.id, data);
          toast.success(t('admin.misc.materialUpdated'));
          closeModal();
          load();
        }}
        onCancel={closeModal}
      />,
      { title: t('admin.misc.editMaterial', { name: m.name }), size: 'md', showCloseButton: true }
    );
  };

  const handleDelete = (m: Material) => {
    openModal(
      <ConfirmDeleteModal
        name={m.name}
        onConfirm={async () => {
          await materialsApi.delete(sessionToken!, m.id);
          toast.success(t('admin.misc.materialDeleted'));
          closeModal();
          load();
        }}
        onCancel={closeModal}
      />,
      { title: t('admin.misc.confirmDeletion'), size: 'sm' }
    );
  };

  const columns = [
    { key: 'name', header: t('admin.forms.nameLabel'), render: (m: Material) => (
      <span className="font-medium text-gray-900 dark:text-gray-100">{capitalize(m.name)}</span>
    )},
    { key: 'unit', header: t('admin.forms.materialUnit'), render: (m: Material) => (
      <span className="text-gray-600 dark:text-gray-300">{m.unit}</span>
    )},
    { key: 'description', header: t('admin.forms.materialDescription'), render: (m: Material) => (
      <span className="text-gray-500 dark:text-gray-400 text-xs">{m.description || '—'}</span>
    )},
    { key: 'status', header: t('admin.misc.status'), render: (m: Material) => (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${m.active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
        {m.active ? t('admin.forms.active') : t('admin.forms.inactive')}
      </span>
    )},
    { key: 'actions', header: t('admin.misc.actions'), render: (m: Material) => (
      <div className="flex gap-1.5">
        <Button variant="secondary" size="sm" onClick={() => handleEdit(m)} title={t('admin.forms.edit')}><Pencil size={14} /></Button>
        <Button variant="danger" size="sm" onClick={() => handleDelete(m)} title={t('admin.forms.delete')}><Trash2 size={14} /></Button>
      </div>
    )},
  ];

  return (
    <SectionContent loading={loading} empty={materials.length === 0} emptyText={t('admin.misc.noMaterials')} onAdd={handleCreate} addLabel={t('admin.misc.newMaterial')}>
      <Table columns={columns} data={materials} pagination pageSize={5} pageSizeOptions={[5, 10, 15]} hoverable striped />
    </SectionContent>
  );
}

// ─── Crew Positions Section ──────────────────────────────────────────────────────────────────────

function PositionsSection() {
  const { t } = useTranslation();
  const { sessionToken } = useAuthStore();
  const { openModal, closeModal } = useModal();
  const [positions, setPositions] = useState<CrewPosition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    if (!sessionToken) return;
    setLoading(true);
    try { setPositions(await crewPositionsApi.list(sessionToken, false)); }
    catch { toast.error(t('admin.misc.positionsLoadError')); }
    finally { setLoading(false); }
  };

  const handleCreate = () => {
    openModal(
      <CrewPositionForm
        onSubmit={async (data) => {
          await crewPositionsApi.create(sessionToken!, data);
          toast.success(t('admin.misc.positionCreated'));
          closeModal();
          load();
        }}
        onCancel={closeModal}
      />,
      { title: t('admin.misc.newPosition'), size: 'md', showCloseButton: true }
    );
  };

  const handleEdit = (p: CrewPosition) => {
    openModal(
      <CrewPositionForm
        position={p}
        onSubmit={async (data) => {
          await crewPositionsApi.update(sessionToken!, p.id, data);
          toast.success(t('admin.misc.positionUpdated'));
          closeModal();
          load();
        }}
        onCancel={closeModal}
      />,
      { title: t('admin.misc.editPosition', { name: p.name }), size: 'md', showCloseButton: true }
    );
  };

  const handleDelete = (p: CrewPosition) => {
    if (p.isDefault) {
      toast.warning(t('admin.misc.defaultCannotDelete'));
      return;
    }
    openModal(
      <ConfirmDeleteModal
        name={p.name}
        onConfirm={async () => {
          await crewPositionsApi.delete(sessionToken!, p.id);
          toast.success(t('admin.misc.positionDeleted'));
          closeModal();
          load();
        }}
        onCancel={closeModal}
      />,
      { title: t('admin.misc.confirmDeletion'), size: 'sm' }
    );
  };

  const columns = [
    { key: 'name', header: t('admin.forms.nameLabel'), render: (p: CrewPosition) => (
      <span className="font-medium text-gray-900 dark:text-gray-100">{p.name}</span>
    )},
    { key: 'sortOrder', header: t('admin.forms.orderLabel'), render: (p: CrewPosition) => (
      <span className="text-gray-500 dark:text-gray-400">{p.sortOrder}</span>
    )},
    { key: 'type', header: t('admin.misc.type'), render: (p: CrewPosition) => (
      p.isDefault
        ? <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{t('admin.misc.default')}</span>
        : <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">{t('admin.misc.custom')}</span>
    )},
    { key: 'actions', header: t('admin.misc.actions'), render: (p: CrewPosition) => (
      <div className="flex gap-1.5">
        <Button variant="secondary" size="sm" onClick={() => handleEdit(p)} title={t('admin.forms.edit')}><Pencil size={14} /></Button>
        <Button
          variant="danger" size="sm"
          onClick={() => handleDelete(p)}
          title={p.isDefault ? t('admin.misc.cannotDeleteDefault') : t('admin.forms.delete')}
          disabled={p.isDefault}
        >
          <Trash2 size={14} />
        </Button>
      </div>
    )},
  ];

  return (
    <SectionContent loading={loading} empty={positions.length === 0} emptyText={t('admin.misc.noPositions')} onAdd={handleCreate} addLabel={t('admin.misc.newPosition')}>
      <Table columns={columns} data={positions} pagination pageSize={5} pageSizeOptions={[5, 10, 15]} hoverable striped />
    </SectionContent>
  );
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
    </div>
  );
}

interface SectionContentProps {
  loading: boolean;
  empty: boolean;
  emptyText: string;
  onAdd: () => void;
  addLabel: string;
  children: React.ReactNode;
}

function SectionContent({ loading, empty, emptyText, onAdd, addLabel, children }: SectionContentProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={onAdd}>{addLabel}</Button>
      </div>
      {loading ? (
        <LoadingSpinner />
      ) : empty ? (
        <p className="text-center py-6 text-sm text-gray-400 dark:text-gray-500">{emptyText}</p>
      ) : children}
    </div>
  );
}

// ─── Root Component ──────────────────────────────────────────────────────────

export default function MiscelaneosManagement() {
  const { t } = useTranslation();
  const [openId, setOpenId] = useState<string | null>('areas');

  const toggle = (id: string) => setOpenId(prev => prev === id ? null : id);

  return (
    <div className="space-y-3">
      <div className="mb-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('admin.misc.title')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('admin.misc.subtitle')}
        </p>
      </div>

      <AccordionSection
        id="areas"
        title={t('admin.misc.areasTitle')}
        subtitle={t('admin.misc.areasDesc')}
        icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        openId={openId}
        onToggle={toggle}
      >
        <AreasSection />
      </AccordionSection>

      <AccordionSection
        id="codes"
        title={t('admin.misc.codesTitle')}
        subtitle={t('admin.misc.codesDesc')}
        icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" /></svg>}
        openId={openId}
        onToggle={toggle}
      >
        <CodesSection />
      </AccordionSection>

      <AccordionSection
        id="materials"
        title={t('admin.misc.materialsTitle')}
        subtitle={t('admin.misc.materialsDesc')}
        icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
        openId={openId}
        onToggle={toggle}
      >
        <MaterialsSection />
      </AccordionSection>

      <AccordionSection
        id="positions"
        title={t('admin.misc.positionsTitle')}
        subtitle={t('admin.misc.positionsDesc')}
        icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        openId={openId}
        onToggle={toggle}
      >
        <PositionsSection />
      </AccordionSection>
    </div>
  );
}
