import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '../components/layout';
import { Button, Card, Input, Select } from '../components/ui';
import { Save, ChevronLeft, Droplets } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useModal } from '../store/modalStore';
import { fluidsApi, fluidProductsApi, rigsApi, rigPersonnelApi } from '../lib/api';
import { toast } from '../lib/toast';
import { backgroundPush } from '../lib/syncHelper';
import { RigSelectionStep } from '../components/forms/RigSelectionStep';
import { FluidPropsTable, EMPTY_PROPS_ROW, type FluidPropsRow } from '../components/fluids/FluidPropsTable';
import { FluidSolidsTable, type FluidSolidsRow } from '../components/fluids/FluidSolidsTable';
import { FluidInventoryTable, type InventoryRow } from '../components/fluids/FluidInventoryTable';
import { FluidServicesTable, type ServiceRow } from '../components/fluids/FluidServicesTable';
import { FluidTanksTable, type TankRow } from '../components/fluids/FluidTanksTable';
import { FluidVolStatsSection, EMPTY_VOL_STATS, type VolStatsState } from '../components/fluids/FluidVolStatsSection';
import { SaveWithNoteModal } from '../components/fluids/SaveWithNoteModal';
import type { FluidReportFull, FluidProduct } from '../types/fluid';
import type { RigWithArea, RigPersonnel, RigFull } from '../types/rig';
import { useTranslation } from 'react-i18next';

// ============================================================================
// Types for local form state
// ============================================================================

interface ReportHeaderState {
  reportDate: string;
  wellNumber: string;
  rigNumber: string;
  contract: string;
  contractor: string;
  operator: string;
  fieldDistrict: string;
  supervisor24h: string;
}

interface HeaderState {
  fluidType: string;
  wellPhase: string;
  fluidCoordinator: string;
  techRep1: string;
  techRep2: string;
  trainee: string;
  opsSupervisor: string;
}

interface CirculationState {
  bottomDownMin: string; bottomDownEmb: string;
  bottomUpMin: string; bottomUpEmb: string;
  wellCycleMin: string; wellCycleEmb: string;
  totalCycleMin: string; totalCycleEmb: string;
}

interface DimsState {
  volInicial: string; volPerdidoHoyo: string; volDescartado: string; volPreparado: string;
  volTransferido: string; volRecibido: string; volPerdidoSup: string; volFinal: string;
}

interface HydraulicsState {
  esd: string; ecd: string;
  embNTuberia: string; embNAnular: string;
  embKTuberia: string; embKAnular: string;
}

interface ActivityState {
  hoursMoving: string; hoursCirculating: string; hoursDrilling: string;
  hoursTripping: string; hoursCleaning: string; hoursBackreaming: string;
  hoursCementing: string; hoursRunningCsg: string; hoursOther: string;
}

interface CommentsState {
  fluidComments: string;
  productComments: string;
  volComments: string;
}

const EMPTY_REPORT_HEADER: ReportHeaderState = { reportDate: '', wellNumber: '', rigNumber: '', contract: '', contractor: '', operator: '', fieldDistrict: '', supervisor24h: '' };
const EMPTY_HEADER: HeaderState = { fluidType: '', wellPhase: '', fluidCoordinator: '', techRep1: '', techRep2: '', trainee: '', opsSupervisor: '' };
const EMPTY_CIRC: CirculationState = { bottomDownMin: '', bottomDownEmb: '', bottomUpMin: '', bottomUpEmb: '', wellCycleMin: '', wellCycleEmb: '', totalCycleMin: '', totalCycleEmb: '' };
const EMPTY_DIMS: DimsState = { volInicial: '', volPerdidoHoyo: '', volDescartado: '', volPreparado: '', volTransferido: '', volRecibido: '', volPerdidoSup: '', volFinal: '' };
const EMPTY_HYD: HydraulicsState = { esd: '', ecd: '', embNTuberia: '', embNAnular: '', embKTuberia: '', embKAnular: '' };
const EMPTY_ACTIVITY: ActivityState = { hoursMoving: '', hoursCirculating: '', hoursDrilling: '', hoursTripping: '', hoursCleaning: '', hoursBackreaming: '', hoursCementing: '', hoursRunningCsg: '', hoursOther: '' };
const EMPTY_COMMENTS: CommentsState = { fluidComments: '', productComments: '', volComments: '' };

// ============================================================================
// Helpers
// ============================================================================

const toNum = (v: string): number | null => {
  if (!v || v.trim() === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};

const toStr = (v: number | string | null | undefined): string => {
  if (v === null || v === undefined) return '';
  return String(v);
};

/** Returns true if all values in a row are empty strings, null, or undefined */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isRowEmpty = (row: any): boolean => {
  return Object.values(row).every((v) => v === '' || v === null || v === undefined);
};

function computeHoursTotal(a: ActivityState): string {
  const values = [a.hoursMoving, a.hoursCirculating, a.hoursDrilling, a.hoursTripping, a.hoursCleaning, a.hoursBackreaming, a.hoursCementing, a.hoursRunningCsg, a.hoursOther];
  const sum = values.reduce((acc, v) => acc + (toNum(v) || 0), 0);
  return sum > 0 ? sum.toFixed(1) : '0';
}

// ============================================================================
// Tabs
// ============================================================================

type TabId = 'tab1' | 'tab2' | 'tab3';

// ============================================================================
// Main Component
// ============================================================================

export default function FluidForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sessionToken } = useAuthStore();
  const { openModal, closeModal } = useModal();
  const { t } = useTranslation();

  const TABS: Array<{ id: TabId; label: string; description: string }> = [
    { id: 'tab1', label: t('fluids.form.tabs.tab1'), description: t('fluids.form.tabs.tab1Desc') },
    { id: 'tab2', label: t('fluids.form.tabs.tab2'), description: t('fluids.form.tabs.tab2Desc') },
    { id: 'tab3', label: t('fluids.form.tabs.tab3'), description: t('fluids.form.tabs.tab3Desc') },
  ];

  const isEditMode = !!id;

  // Step: 'rig' (new only) -> 'create' -> 'form'
  const [step, setStep] = useState<'rig' | 'create' | 'form'>(isEditMode ? 'form' : 'rig');
  const [activeTab, setActiveTab] = useState<TabId>('tab1');

  // Rig selection (new reports)
  const [accessibleRigs, setAccessibleRigs] = useState<RigWithArea[]>([]);
  const [selectedRigId, setSelectedRigId] = useState('');
  const [isLoadingRigs, setIsLoadingRigs] = useState(false);

  // Data from selected rig (for dynamic selects)
  const [rigContractors, setRigContractors] = useState<string[]>([]);
  const [rigPersonnel, setRigPersonnel] = useState<RigPersonnel[]>([]);
  const [selectedRigData, setSelectedRigData] = useState<RigWithArea | null>(null);

  // Report header fields (editable, independent of DDR)
  const [reportHeader, setReportHeader] = useState<ReportHeaderState>({ ...EMPTY_REPORT_HEADER });

  // Form state
  const [fluidReportId, setFluidReportId] = useState<string | null>(id || null);
  const [header, setHeader] = useState<HeaderState>({ ...EMPTY_HEADER });
  const [circulation, setCirculation] = useState<CirculationState>({ ...EMPTY_CIRC });
  const [dims, setDims] = useState<DimsState>({ ...EMPTY_DIMS });
  const [hydraulics, setHydraulics] = useState<HydraulicsState>({ ...EMPTY_HYD });
  const [propsRows, setPropsRows] = useState<FluidPropsRow[]>([{ ...EMPTY_PROPS_ROW }, { ...EMPTY_PROPS_ROW }, { ...EMPTY_PROPS_ROW }]);
  const [solidsRows, setSolidsRows] = useState<FluidSolidsRow[]>([]);
  const [activity, setActivity] = useState<ActivityState>({ ...EMPTY_ACTIVITY });
  const [comments, setComments] = useState<CommentsState>({ ...EMPTY_COMMENTS });

  // Tab 2 state
  const [inventoryRows, setInventoryRows] = useState<InventoryRow[]>([]);
  const [serviceRows, setServiceRows] = useState<ServiceRow[]>([]);
  const [activeProducts, setActiveProducts] = useState<FluidProduct[]>([]);

  // Tab 3 state
  const [tankRows, setTankRows] = useState<TankRow[]>([]);
  const [volStats, setVolStats] = useState<VolStatsState>({ ...EMPTY_VOL_STATS });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // -- Load existing report ---------------------------------------------------
  useEffect(() => {
    if (isEditMode && sessionToken && id) {
      loadFluidReport(id);
    }
  }, [id, sessionToken]);

  // -- Load product catalog ---------------------------------------------------
  useEffect(() => {
    if (sessionToken) {
      fluidProductsApi.listActive(sessionToken)
        .then(setActiveProducts)
        .catch((err) => console.error('Error loading products:', err));
    }
  }, [sessionToken]);

  // -- Load accessible rigs (new reports) -----------------------------------
  useEffect(() => {
    if (!isEditMode && sessionToken) {
      setIsLoadingRigs(true);
      rigsApi.listAccessible(sessionToken, false)
        .then((rigs) => {
          setAccessibleRigs(rigs);
          if (rigs.length === 1) setSelectedRigId(rigs[0].id);
        })
        .catch((err) => console.error('Error loading rigs:', err))
        .finally(() => setIsLoadingRigs(false));
    }
  }, [sessionToken, isEditMode]);

  // -- Load rig data on edit mode (for dynamic selects) ---------------------
  useEffect(() => {
    if (isEditMode && sessionToken && selectedRigData) {
      loadRigExtras(selectedRigData.id);
    }
  }, [selectedRigData]);

  const loadRigExtras = async (rigId: string) => {
    try {
      const [rigFull, personnel] = await Promise.all([
        rigsApi.getFull(rigId) as Promise<RigFull>,
        rigPersonnelApi.list(rigId, false),
      ]);
      setRigContractors(rigFull.contractors?.map((c) => c.companyName) || []);
      setRigPersonnel(personnel);
    } catch (err) {
      console.error('Error loading rig extras:', err);
    }
  };

  const handleRigConfirmed = async () => {
    if (!selectedRigId) return;
    const rig = accessibleRigs.find((r) => r.id === selectedRigId);
    if (!rig) return;

    setSelectedRigData(rig);

    // Pre-fill header with rig data
    setReportHeader((h) => ({
      ...h,
      rigNumber: rig.name,
      operator: rig.operatorName || '',
      fieldDistrict: rig.areaName || '',
    }));

    // Load contractors + personnel for selects
    await loadRigExtras(rig.id);

    setStep('create');
  };

  const loadFluidReport = async (fluidId: string) => {
    if (!sessionToken) return;
    setLoading(true);
    try {
      const full: FluidReportFull = await fluidsApi.get(sessionToken, fluidId);
      populateFromFull(full);
    } catch (error) {
      console.error('Error loading fluid report:', error);
      toast.error(t('fluids.form.errorLoading'));
      navigate('/fluids');
    } finally {
      setLoading(false);
    }
  };

  const populateFromFull = (full: FluidReportFull) => {
    setFluidReportId(full.id);

    // Load rig extras for dynamic selects if rigId exists
    if (full.rigId) {
      setSelectedRigId(full.rigId);
      loadRigExtras(full.rigId);
    }

    // Report header fields (from flattened FluidReport)
    setReportHeader({
      reportDate: full.reportDate || '',
      wellNumber: full.wellNumber || '',
      rigNumber: full.rigNumber || '',
      contract: full.contract || '',
      contractor: full.contractor || '',
      operator: full.operator || '',
      fieldDistrict: full.fieldDistrict || '',
      supervisor24h: full.supervisor24h || '',
    });

    setHeader({
      fluidType: full.fluidType || '', wellPhase: full.wellPhase || '',
      fluidCoordinator: full.fluidCoordinator || '', techRep1: full.techRep1 || '',
      techRep2: full.techRep2 || '', trainee: full.trainee || '', opsSupervisor: full.opsSupervisor || '',
    });

    setCirculation({
      bottomDownMin: toStr(full.bottomDownMin), bottomDownEmb: toStr(full.bottomDownEmb),
      bottomUpMin: toStr(full.bottomUpMin), bottomUpEmb: toStr(full.bottomUpEmb),
      wellCycleMin: toStr(full.wellCycleMin), wellCycleEmb: toStr(full.wellCycleEmb),
      totalCycleMin: toStr(full.totalCycleMin), totalCycleEmb: toStr(full.totalCycleEmb),
    });

    setDims({
      volInicial: toStr(full.volInicial), volPerdidoHoyo: toStr(full.volPerdidoHoyo),
      volDescartado: toStr(full.volDescartado), volPreparado: toStr(full.volPreparado),
      volTransferido: toStr(full.volTransferido), volRecibido: toStr(full.volRecibido),
      volPerdidoSup: toStr(full.volPerdidoSup), volFinal: toStr(full.volFinal),
    });

    setHydraulics({
      esd: toStr(full.esd), ecd: toStr(full.ecd),
      embNTuberia: toStr(full.embNTuberia), embNAnular: toStr(full.embNAnular),
      embKTuberia: toStr(full.embKTuberia), embKAnular: toStr(full.embKAnular),
    });

    setComments({
      fluidComments: full.fluidComments || '',
      productComments: full.productComments || '',
      volComments: full.volComments || '',
    });

    // Props: fill 3 slots
    const propsData: FluidPropsRow[] = [0, 1, 2].map((i) => {
      const p = full.props[i];
      if (!p) return { ...EMPTY_PROPS_ROW };
      return {
        sampleHour: p.sampleHour || '', sampleSource: p.sampleSource || '',
        temperatureF: toStr(p.temperatureF), depthMd: toStr(p.depthMd), depthTvd: toStr(p.depthTvd),
        density: toStr(p.density), marshViscosity: toStr(p.marshViscosity),
        rpm600: toStr(p.rpm600), rpm300: toStr(p.rpm300), rpm200: toStr(p.rpm200),
        rpm100: toStr(p.rpm100), rpm6: toStr(p.rpm6), rpm3: toStr(p.rpm3),
        pv: toStr(p.pv), yp: toStr(p.yp),
        gel10s: toStr(p.gel10s), gel10m: toStr(p.gel10m), gel30m: toStr(p.gel30m),
        apiFiltrate: toStr(p.apiFiltrate), filterCake: toStr(p.filterCake),
        sandContent: toStr(p.sandContent), solidsRetort: toStr(p.solidsRetort),
        oilRetort: toStr(p.oilRetort), waterRetort: toStr(p.waterRetort),
        ph: toStr(p.ph), alkalinityPm: toStr(p.alkalinityPm),
        alkalinityPf: toStr(p.alkalinityPf), alkalinityMf: toStr(p.alkalinityMf),
        calciumPpm: toStr(p.calciumPpm), chloridesPpm: toStr(p.chloridesPpm),
        mbt: toStr(p.mbt), brookfieldVisc: toStr(p.brookfieldVisc), lubricityCoef: toStr(p.lubricityCoef),
      };
    });
    setPropsRows(propsData);

    // Solids control
    setSolidsRows(full.solidsControl.map((s) => ({
      equipment: s.equipment || '', designMesh: s.designMesh || '',
      hoursToday: toStr(s.hoursToday), hoursAccumulated: toStr(s.hoursAccumulated),
    })));

    // Activity
    if (full.activity) {
      setActivity({
        hoursMoving: toStr(full.activity.hoursMoving), hoursCirculating: toStr(full.activity.hoursCirculating),
        hoursDrilling: toStr(full.activity.hoursDrilling), hoursTripping: toStr(full.activity.hoursTripping),
        hoursCleaning: toStr(full.activity.hoursCleaning), hoursBackreaming: toStr(full.activity.hoursBackreaming),
        hoursCementing: toStr(full.activity.hoursCementing), hoursRunningCsg: toStr(full.activity.hoursRunningCsg),
        hoursOther: toStr(full.activity.hoursOther),
      });
    }

    // Inventory (Tab 2)
    setInventoryRows(full.inventory.map((inv) => {
      const row: InventoryRow = {
        productId: inv.productId || '',
        invInicial: toStr(inv.invInicial),
        receivedToday: toStr(inv.receivedToday),
        transferredToday: toStr(inv.transferredToday),
        consumedToday: toStr(inv.consumedToday),
        invFinal: toStr(inv.invFinal),
        receivedTotal: toStr(inv.receivedTotal),
        transferredTotal: toStr(inv.transferredTotal),
        consumedTotal: toStr(inv.consumedTotal),
        dailyCost: toStr(inv.dailyCost),
        notes: inv.notes || '',
      };
      return row;
    }));

    // Services (Tab 2)
    setServiceRows(full.services.map((svc) => ({
      serviceName: svc.serviceName || '',
      hoursPerDay: toStr(svc.hoursPerDay),
      quantity: toStr(svc.quantity),
      daysToday: toStr(svc.daysToday),
      daysTotal: toStr(svc.daysTotal),
      costBsf: toStr(svc.costBsf),
      costUsd: toStr(svc.costUsd),
      dailyCost: toStr(svc.dailyCost),
      accumulatedCost: toStr(svc.accumulatedCost),
    })));

    // Tanks (Tab 3)
    setTankRows(full.tanks.map((t) => ({
      name: t.name || '',
      systemStatus: t.systemStatus || 'active',
      volumeBls: toStr(t.volumeBls),
      lpg: toStr(t.lpg),
      fluidType: t.fluidType || '',
    })));

    // Vol Stats (Tab 3)
    if (full.volStats) {
      const vs = full.volStats;
      setVolStats({
        volCapSarta: toStr(vs.volCapSarta), volDespSarta: toStr(vs.volDespSarta),
        volRevestidor: toStr(vs.volRevestidor), volHoyoDesnudo: toStr(vs.volHoyoDesnudo),
        volPozoSinTuberia: toStr(vs.volPozoSinTuberia), volPozoConTuberia: toStr(vs.volPozoConTuberia),
        volSistemaActivo: toStr(vs.volSistemaActivo), volSistemaReserva: toStr(vs.volSistemaReserva),
        volSistemaContingencia: toStr(vs.volSistemaContingencia), volHoyoAbandonado: toStr(vs.volHoyoAbandonado),
        volAguaAgregadoHoy: toStr(vs.volAguaAgregadoHoy), volAguaAgregadoAcum: toStr(vs.volAguaAgregadoAcum),
        volProductosHoy: toStr(vs.volProductosHoy), volProductosAcum: toStr(vs.volProductosAcum),
        volAceiteAcum: toStr(vs.volAceiteAcum),
        volRecibidoHoy: toStr(vs.volRecibidoHoy), volRecibidoAcum: toStr(vs.volRecibidoAcum),
        volProcesadoHoy: toStr(vs.volProcesadoHoy), volProcesadoAcum: toStr(vs.volProcesadoAcum),
        volManejadoHoy: toStr(vs.volManejadoHoy),
        volTotalAgregadoHoy: toStr(vs.volTotalAgregadoHoy), volTotalAgregadoAcum: toStr(vs.volTotalAgregadoAcum),
        volTransferidoFuera: toStr(vs.volTransferidoFuera),
        volPerdidoEcs: toStr(vs.volPerdidoEcs), volPerdidoEcsAcum: toStr(vs.volPerdidoEcsAcum),
        volPerdidoHumectacion: toStr(vs.volPerdidoHumectacion), volPerdidoHumectacionAcum: toStr(vs.volPerdidoHumectacionAcum),
        volPerdidoFormacionHoy: toStr(vs.volPerdidoFormacionHoy), volPerdidoFormacionAcum: toStr(vs.volPerdidoFormacionAcum),
        volPerdidoPermeabilidad: toStr(vs.volPerdidoPermeabilidad), volPerdidoPermeabilidadAcum: toStr(vs.volPerdidoPermeabilidadAcum),
        volDescartado: toStr(vs.volDescartado), volEntrampado: toStr(vs.volEntrampado),
        volPerdidoSuperficie: toStr(vs.volPerdidoSuperficie), volPerdidoSuperficieAcum: toStr(vs.volPerdidoSuperficieAcum),
        volOtrasPerdidas: toStr(vs.volOtrasPerdidas),
        volTotalPerdidoHoy: toStr(vs.volTotalPerdidoHoy), volTotalPerdidoAcum: toStr(vs.volTotalPerdidoAcum),
        volInicialDiario: toStr(vs.volInicialDiario), volFinalDiario: toStr(vs.volFinalDiario),
      });
    }
  };

  // -- Create new report ------------------------------------------------------
  const handleCreate = async () => {
    if (!sessionToken) return;
    if (!reportHeader.reportDate) {
      toast.error(t('fluids.form.dateRequired'));
      return;
    }
    setSaving(true);
    try {
      const newReport = await fluidsApi.create(sessionToken, {
        rigId: selectedRigId || undefined,
        reportDate: reportHeader.reportDate || undefined,
        wellNumber: reportHeader.wellNumber || undefined,
        rigNumber: reportHeader.rigNumber || undefined,
        contract: reportHeader.contract || undefined,
        contractor: reportHeader.contractor || undefined,
        operator: reportHeader.operator || undefined,
        fieldDistrict: reportHeader.fieldDistrict || undefined,
        supervisor24h: reportHeader.supervisor24h || undefined,
      });
      setFluidReportId(newReport.id);
      // Load full report to populate all fields
      const full = await fluidsApi.get(sessionToken, newReport.id);
      populateFromFull(full);
      setStep('form');
      toast.success(t('fluids.form.created'));
      backgroundPush(sessionToken);
    } catch (error) {
      console.error('Error creating fluid report:', error);
      toast.error(String(error));
    } finally {
      setSaving(false);
    }
  };

  // -- Modal save helpers (open note modal, then save) -------------------------
  const openSaveModal = (tabLabel: string, saveFn: (note?: string) => Promise<void>) => {
    openModal(
      <SaveWithNoteModal
        tabLabel={tabLabel}
        onSave={async (note) => {
          await saveFn(note);
          closeModal();
        }}
        onCancel={closeModal}
      />,
      { title: t('fluids.changelog.saveTitle'), size: 'sm', showCloseButton: true },
    );
  };

  // -- Save Tab 1 (includes report header) ------------------------------------
  const handleSaveTab1 = async (note?: string) => {
    if (!sessionToken || !fluidReportId) return;
    setSaving(true);
    try {
      const data = {
        header: {
          // Report header fields
          reportDate: reportHeader.reportDate || null,
          wellNumber: reportHeader.wellNumber || null,
          rigNumber: reportHeader.rigNumber || null,
          contract: reportHeader.contract || null,
          contractor: reportHeader.contractor || null,
          operator: reportHeader.operator || null,
          fieldDistrict: reportHeader.fieldDistrict || null,
          supervisor24h: reportHeader.supervisor24h || null,
          // Fluid-specific header fields
          fluidType: header.fluidType || null,
          wellPhase: header.wellPhase || null,
          fluidCoordinator: header.fluidCoordinator || null,
          techRep1: header.techRep1 || null,
          techRep2: header.techRep2 || null,
          trainee: header.trainee || null,
          opsSupervisor: header.opsSupervisor || null,
          bottomDownMin: toNum(circulation.bottomDownMin),
          bottomDownEmb: toNum(circulation.bottomDownEmb),
          bottomUpMin: toNum(circulation.bottomUpMin),
          bottomUpEmb: toNum(circulation.bottomUpEmb),
          wellCycleMin: toNum(circulation.wellCycleMin),
          wellCycleEmb: toNum(circulation.wellCycleEmb),
          totalCycleMin: toNum(circulation.totalCycleMin),
          totalCycleEmb: toNum(circulation.totalCycleEmb),
          volInicial: toNum(dims.volInicial),
          volPerdidoHoyo: toNum(dims.volPerdidoHoyo),
          volDescartado: toNum(dims.volDescartado),
          volPreparado: toNum(dims.volPreparado),
          volTransferido: toNum(dims.volTransferido),
          volRecibido: toNum(dims.volRecibido),
          volPerdidoSup: toNum(dims.volPerdidoSup),
          volFinal: toNum(dims.volFinal),
          esd: toNum(hydraulics.esd),
          ecd: toNum(hydraulics.ecd),
          embNTuberia: toNum(hydraulics.embNTuberia),
          embNAnular: toNum(hydraulics.embNAnular),
          embKTuberia: toNum(hydraulics.embKTuberia),
          embKAnular: toNum(hydraulics.embKAnular),
          fluidComments: comments.fluidComments || null,
          productComments: comments.productComments || null,
          volComments: comments.volComments || null,
        },
        props: propsRows.filter((r) => !isRowEmpty(r)).map((r) => ({
          sampleHour: r.sampleHour || null,
          sampleSource: r.sampleSource || null,
          temperatureF: toNum(r.temperatureF),
          depthMd: toNum(r.depthMd), depthTvd: toNum(r.depthTvd),
          density: toNum(r.density), marshViscosity: toNum(r.marshViscosity),
          rpm600: toNum(r.rpm600), rpm300: toNum(r.rpm300), rpm200: toNum(r.rpm200),
          rpm100: toNum(r.rpm100), rpm6: toNum(r.rpm6), rpm3: toNum(r.rpm3),
          pv: toNum(r.pv), yp: toNum(r.yp),
          gel10s: toNum(r.gel10s), gel10m: toNum(r.gel10m), gel30m: toNum(r.gel30m),
          apiFiltrate: toNum(r.apiFiltrate), filterCake: toNum(r.filterCake),
          sandContent: toNum(r.sandContent), solidsRetort: toNum(r.solidsRetort),
          oilRetort: toNum(r.oilRetort), waterRetort: toNum(r.waterRetort),
          ph: toNum(r.ph), alkalinityPm: toNum(r.alkalinityPm),
          alkalinityPf: toNum(r.alkalinityPf), alkalinityMf: toNum(r.alkalinityMf),
          calciumPpm: toNum(r.calciumPpm), chloridesPpm: toNum(r.chloridesPpm),
          mbt: toNum(r.mbt), brookfieldVisc: toNum(r.brookfieldVisc), lubricityCoef: toNum(r.lubricityCoef),
        })),
        solidsControl: solidsRows.filter((r) => !isRowEmpty(r)).map((r) => ({
          equipment: r.equipment || null,
          designMesh: r.designMesh || null,
          hoursToday: toNum(r.hoursToday),
          hoursAccumulated: toNum(r.hoursAccumulated),
        })),
        activity: {
          hoursMoving: toNum(activity.hoursMoving),
          hoursCirculating: toNum(activity.hoursCirculating),
          hoursDrilling: toNum(activity.hoursDrilling),
          hoursTripping: toNum(activity.hoursTripping),
          hoursCleaning: toNum(activity.hoursCleaning),
          hoursBackreaming: toNum(activity.hoursBackreaming),
          hoursCementing: toNum(activity.hoursCementing),
          hoursRunningCsg: toNum(activity.hoursRunningCsg),
          hoursOther: toNum(activity.hoursOther),
        },
        note: note || undefined,
      };
      await fluidsApi.saveTab1(sessionToken, fluidReportId, data);
      toast.success(t('fluids.form.tab1Saved'));
      backgroundPush(sessionToken);
    } catch (error) {
      console.error('Error saving tab 1:', error);
      toast.error(t('fluids.form.errorSaving', { error: String(error) }));
    } finally {
      setSaving(false);
    }
  };

  // -- Save Tab 2 -------------------------------------------------------------
  const handleSaveTab2 = async (note?: string) => {
    if (!sessionToken || !fluidReportId) return;
    setSaving(true);
    try {
      const data = {
        inventory: inventoryRows.filter((r) => !isRowEmpty(r)).map((r) => ({
          productId: r.productId || null,
          invInicial: toNum(r.invInicial) ?? 0,
          receivedToday: toNum(r.receivedToday) ?? 0,
          transferredToday: toNum(r.transferredToday) ?? 0,
          consumedToday: toNum(r.consumedToday) ?? 0,
          invFinal: toNum(r.invFinal) ?? 0,
          receivedTotal: toNum(r.receivedTotal) ?? 0,
          transferredTotal: toNum(r.transferredTotal) ?? 0,
          consumedTotal: toNum(r.consumedTotal) ?? 0,
          dailyCost: toNum(r.dailyCost),
          notes: r.notes || null,
        })),
        services: serviceRows.filter((r) => !isRowEmpty(r)).map((r) => ({
          serviceName: r.serviceName || '',
          hoursPerDay: toNum(r.hoursPerDay),
          quantity: toNum(r.quantity),
          daysToday: toNum(r.daysToday),
          daysTotal: toNum(r.daysTotal),
          costBsf: toNum(r.costBsf),
          costUsd: toNum(r.costUsd),
          dailyCost: toNum(r.dailyCost),
          accumulatedCost: toNum(r.accumulatedCost),
        })),
        note: note || undefined,
      };
      await fluidsApi.saveTab2(sessionToken, fluidReportId, data);
      toast.success(t('fluids.form.tab2Saved'));
      backgroundPush(sessionToken);
    } catch (error) {
      console.error('Error saving tab 2:', error);
      toast.error(t('fluids.form.errorSaving', { error: String(error) }));
    } finally {
      setSaving(false);
    }
  };

  // -- Save Tab 3 -------------------------------------------------------------
  const handleSaveTab3 = async (note?: string) => {
    if (!sessionToken || !fluidReportId) return;
    setSaving(true);
    try {
      const data = {
        tanks: tankRows.filter((r) => !isRowEmpty(r)).map((r, i) => ({
          name: r.name || `TK-${i + 1}`,
          systemStatus: r.systemStatus || 'active',
          volumeBls: toNum(r.volumeBls),
          lpg: toNum(r.lpg),
          fluidType: r.fluidType || null,
          sortOrder: i,
        })),
        volStats: {
          volCapSarta: toNum(volStats.volCapSarta),
          volDespSarta: toNum(volStats.volDespSarta),
          volRevestidor: toNum(volStats.volRevestidor),
          volHoyoDesnudo: toNum(volStats.volHoyoDesnudo),
          volPozoSinTuberia: toNum(volStats.volPozoSinTuberia),
          volPozoConTuberia: toNum(volStats.volPozoConTuberia),
          volSistemaActivo: toNum(volStats.volSistemaActivo),
          volSistemaReserva: toNum(volStats.volSistemaReserva),
          volSistemaContingencia: toNum(volStats.volSistemaContingencia),
          volHoyoAbandonado: toNum(volStats.volHoyoAbandonado),
          volAguaAgregadoHoy: toNum(volStats.volAguaAgregadoHoy),
          volAguaAgregadoAcum: toNum(volStats.volAguaAgregadoAcum),
          volProductosHoy: toNum(volStats.volProductosHoy),
          volProductosAcum: toNum(volStats.volProductosAcum),
          volAceiteAcum: toNum(volStats.volAceiteAcum),
          volRecibidoHoy: toNum(volStats.volRecibidoHoy),
          volRecibidoAcum: toNum(volStats.volRecibidoAcum),
          volProcesadoHoy: toNum(volStats.volProcesadoHoy),
          volProcesadoAcum: toNum(volStats.volProcesadoAcum),
          volManejadoHoy: toNum(volStats.volManejadoHoy),
          volTotalAgregadoHoy: toNum(volStats.volTotalAgregadoHoy),
          volTotalAgregadoAcum: toNum(volStats.volTotalAgregadoAcum),
          volTransferidoFuera: toNum(volStats.volTransferidoFuera),
          volPerdidoEcs: toNum(volStats.volPerdidoEcs),
          volPerdidoEcsAcum: toNum(volStats.volPerdidoEcsAcum),
          volPerdidoHumectacion: toNum(volStats.volPerdidoHumectacion),
          volPerdidoHumectacionAcum: toNum(volStats.volPerdidoHumectacionAcum),
          volPerdidoFormacionHoy: toNum(volStats.volPerdidoFormacionHoy),
          volPerdidoFormacionAcum: toNum(volStats.volPerdidoFormacionAcum),
          volPerdidoPermeabilidad: toNum(volStats.volPerdidoPermeabilidad),
          volPerdidoPermeabilidadAcum: toNum(volStats.volPerdidoPermeabilidadAcum),
          volDescartado: toNum(volStats.volDescartado),
          volEntrampado: toNum(volStats.volEntrampado),
          volPerdidoSuperficie: toNum(volStats.volPerdidoSuperficie),
          volPerdidoSuperficieAcum: toNum(volStats.volPerdidoSuperficieAcum),
          volOtrasPerdidas: toNum(volStats.volOtrasPerdidas),
          volTotalPerdidoHoy: toNum(volStats.volTotalPerdidoHoy),
          volTotalPerdidoAcum: toNum(volStats.volTotalPerdidoAcum),
          volInicialDiario: toNum(volStats.volInicialDiario),
          volFinalDiario: toNum(volStats.volFinalDiario),
        },
        note: note || undefined,
      };
      await fluidsApi.saveTab3(sessionToken, fluidReportId, data);
      toast.success(t('fluids.form.tab3Saved'));
      backgroundPush(sessionToken);
    } catch (error) {
      console.error('Error saving tab 3:', error);
      toast.error(t('fluids.form.errorSaving', { error: String(error) }));
    } finally {
      setSaving(false);
    }
  };

  // -- Render -----------------------------------------------------------------

  if (loading) {
    return (
      <MainLayout title={t('fluids.form.loadingReport')}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
        </div>
      </MainLayout>
    );
  }

  // Step 0: Rig selection (new reports only)
  if (step === 'rig') {
    return (
      <MainLayout
        title={t('fluids.form.newTitle')}
        subtitle={t('fluids.form.step1Subtitle')}
      >
        <RigSelectionStep
          accessibleRigs={accessibleRigs}
          selectedRigId={selectedRigId}
          isLoadingRigs={isLoadingRigs}
          isLoadingSnapshot={false}
          onSelectRig={setSelectedRigId}
          onConfirm={handleRigConfirmed}
          onCancel={() => navigate('/fluids')}
        />
      </MainLayout>
    );
  }

  // Step 1: Create new report (fill header fields)
  if (step === 'create') {
    return (
      <MainLayout
        title={t('fluids.form.newTitle')}
        subtitle={t('fluids.form.step2Subtitle', { rig: reportHeader.rigNumber || t('fluids.form.noRig') })}
        headerActions={
          <Button variant="outline" onClick={() => setStep('rig')} icon={<ChevronLeft size={16} />}>
            {t('fluids.form.changeRig')}
          </Button>
        }
      >
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('fluids.form.reportData')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('fluids.form.reportDataDesc')}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                label={`${t('fluids.form.reportDate')} *`}
                type="date"
                value={reportHeader.reportDate}
                onChange={(e) => setReportHeader((h) => ({ ...h, reportDate: e.target.value }))}
              />
              <Input
                label={t('fluids.form.well')}
                value={reportHeader.wellNumber}
                onChange={(e) => setReportHeader((h) => ({ ...h, wellNumber: e.target.value }))}
                placeholder="Ej: POZ-001"
              />
              <Input
                label={t('fluids.form.rig')}
                value={reportHeader.rigNumber}
                disabled
              />
              <Input
                label={t('fluids.form.contract')}
                value={reportHeader.contract}
                onChange={(e) => setReportHeader((h) => ({ ...h, contract: e.target.value }))}
              />

              {/* Contratista — select from rig contractors */}
              <Select
                label={t('fluids.form.contractor')}
                value={reportHeader.contractor}
                onChange={(e) => setReportHeader((h) => ({ ...h, contractor: e.target.value }))}
              >
                <option value="">{t('fluids.form.selectOption')}</option>
                {rigContractors.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>

              {/* Operadora — read-only from rig */}
              <Input
                label={t('fluids.form.operator')}
                value={reportHeader.operator}
                disabled
              />

              {/* Campo/Distrito — read-only from rig area */}
              <Input
                label={t('fluids.form.fieldDistrict')}
                value={reportHeader.fieldDistrict}
                disabled
              />

              {/* Supervisor 24h — select from rig personnel */}
              <Select
                label={t('fluids.form.supervisor24h')}
                value={reportHeader.supervisor24h}
                onChange={(e) => setReportHeader((h) => ({ ...h, supervisor24h: e.target.value }))}
              >
                <option value="">{t('fluids.form.selectOption')}</option>
                {rigPersonnel.map((p) => (
                  <option key={p.id} value={p.name}>{p.name} ({p.defaultPosition})</option>
                ))}
              </Select>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={() => navigate('/fluids')}>
                {t('fluids.form.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleCreate}
                disabled={!reportHeader.reportDate}
                loading={saving}
                icon={<Droplets size={16} />}
              >
                {t('fluids.form.createReport')}
              </Button>
            </div>
          </div>
        </Card>
      </MainLayout>
    );
  }

  // Step: Form with tabs
  return (
    <MainLayout
      title={isEditMode ? t('fluids.form.editTitle') : t('fluids.form.newTitle')}
      subtitle={reportHeader.wellNumber ? `${reportHeader.wellNumber} — ${reportHeader.rigNumber || ''}` : ''}
      headerActions={
        <>
        <Button variant="outline" onClick={() => navigate('/fluids')} icon={<ChevronLeft size={16} />}>
          {t('fluids.form.back')}
        </Button>
                    <div className="flex gap-2 pr-4">
              {activeTab === 'tab1' && (
                <Button variant="primary" size="md" onClick={() => openSaveModal(t('fluids.form.tabs.tab1'), handleSaveTab1)} loading={saving} icon={<Save size={16} />}>
                  {t('fluids.form.saveTab1')}
                </Button>
              )}
              {activeTab === 'tab2' && (
                <Button variant="primary" size="md" onClick={() => openSaveModal(t('fluids.form.tabs.tab2'), handleSaveTab2)} loading={saving} icon={<Save size={16} />}>
                  {t('fluids.form.saveTab2')}
                </Button>
              )}
              {activeTab === 'tab3' && (
                <Button variant="primary" size="md" onClick={() => openSaveModal(t('fluids.form.tabs.tab3'), handleSaveTab3)} loading={saving} icon={<Save size={16} />}>
                  {t('fluids.form.saveTab3')}
                </Button>
              )}
            </div>
        </>
        
      }
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Editable Report Header */}
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">{t('fluids.form.reportData')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Input
                label={t('fluids.form.reportDate')}
                type="date"
                value={reportHeader.reportDate}
                onChange={(e) => setReportHeader((h) => ({ ...h, reportDate: e.target.value }))}
              />
              <Input
                label={t('fluids.form.well')}
                value={reportHeader.wellNumber}
                onChange={(e) => setReportHeader((h) => ({ ...h, wellNumber: e.target.value }))}
              />
              <Input label={t('fluids.form.rig')} value={reportHeader.rigNumber} disabled />
              <Input
                label={t('fluids.form.contract')}
                value={reportHeader.contract}
                onChange={(e) => setReportHeader((h) => ({ ...h, contract: e.target.value }))}
              />
              {/* Contratista — select from rig contractors */}
              {rigContractors.length > 0 ? (
                <Select
                  label={t('fluids.form.contractor')}
                  value={reportHeader.contractor}
                  onChange={(e) => setReportHeader((h) => ({ ...h, contractor: e.target.value }))}
                >
                  <option value="">{t('fluids.form.selectOption')}</option>
                  {rigContractors.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              ) : (
                <Input label={t('fluids.form.contractor')} value={reportHeader.contractor} onChange={(e) => setReportHeader((h) => ({ ...h, contractor: e.target.value }))} />
              )}
              <Input label={t('fluids.form.operator')} value={reportHeader.operator} disabled />
              <Input label={t('fluids.form.fieldDistrict')} value={reportHeader.fieldDistrict} disabled />
              {/* Supervisor 24h — select from rig personnel */}
              {rigPersonnel.length > 0 ? (
                <Select
                  label={t('fluids.form.supervisor24h')}
                  value={reportHeader.supervisor24h}
                  onChange={(e) => setReportHeader((h) => ({ ...h, supervisor24h: e.target.value }))}
                >
                  <option value="">{t('fluids.form.selectOption')}</option>
                  {rigPersonnel.map((p) => (
                    <option key={p.id} value={p.name}>{p.name} ({p.defaultPosition})</option>
                  ))}
                </Select>
              ) : (
                <Input label={t('fluids.form.supervisor24h')} value={reportHeader.supervisor24h} onChange={(e) => setReportHeader((h) => ({ ...h, supervisor24h: e.target.value }))} />
              )}
            </div>
          </div>
        </Card>

        {/* Tab Navigation */}
        <Card>
          <div className="border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <nav className="flex">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

          </div>

          <div className="p-6">
            {/* Tab 1: API Report */}
            {activeTab === 'tab1' && (
              <div className="space-y-8">
                {/* Personal de guardia */}
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('fluids.form.personnel')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Input label={t('fluids.form.fluidType')} value={header.fluidType} onChange={(e) => setHeader((h) => ({ ...h, fluidType: e.target.value }))} />
                    <Input label={t('fluids.form.wellPhase')} value={header.wellPhase} onChange={(e) => setHeader((h) => ({ ...h, wellPhase: e.target.value }))} />
                    <Input label={t('fluids.form.fluidCoordinator')} value={header.fluidCoordinator} onChange={(e) => setHeader((h) => ({ ...h, fluidCoordinator: e.target.value }))} />
                    <Input label={t('fluids.form.techRep1')} value={header.techRep1} onChange={(e) => setHeader((h) => ({ ...h, techRep1: e.target.value }))} />
                    <Input label={t('fluids.form.techRep2')} value={header.techRep2} onChange={(e) => setHeader((h) => ({ ...h, techRep2: e.target.value }))} />
                    <Input label={t('fluids.form.trainee')} value={header.trainee} onChange={(e) => setHeader((h) => ({ ...h, trainee: e.target.value }))} />
                    <Input label={t('fluids.form.opsSupervisor')} value={header.opsSupervisor} onChange={(e) => setHeader((h) => ({ ...h, opsSupervisor: e.target.value }))} />
                  </div>
                </section>

                {/* Propiedades del Fluido */}
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('fluids.form.fluidProps')}</h3>
                  <FluidPropsTable rows={propsRows} onChange={setPropsRows} />
                </section>

                {/* Parametros de Circulacion */}
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('fluids.form.circulation')}</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.form.circulationParam')}</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.form.circulationMin')}</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fluids.form.circulationStrokes')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {([
                          { label: t('fluids.form.circBottomDown'), minKey: 'bottomDownMin' as const, embKey: 'bottomDownEmb' as const },
                          { label: t('fluids.form.circBottomUp'), minKey: 'bottomUpMin' as const, embKey: 'bottomUpEmb' as const },
                          { label: t('fluids.form.circWellCycle'), minKey: 'wellCycleMin' as const, embKey: 'wellCycleEmb' as const },
                          { label: t('fluids.form.circTotalCycle'), minKey: 'totalCycleMin' as const, embKey: 'totalCycleEmb' as const },
                        ]).map((row) => (
                          <tr key={row.label}>
                            <td className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300">{row.label}</td>
                            <td className="px-2 py-1">
                              <Input value={circulation[row.minKey]} onChange={(e) => setCirculation((c) => ({ ...c, [row.minKey]: e.target.value }))} className="text-center text-sm py-1!" />
                            </td>
                            <td className="px-2 py-1">
                              <Input value={circulation[row.embKey]} onChange={(e) => setCirculation((c) => ({ ...c, [row.embKey]: e.target.value }))} className="text-center text-sm py-1!" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Volumetria DIMS */}
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('fluids.form.dims')}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Input label={t('fluids.form.dimsInitial')} value={dims.volInicial} onChange={(e) => setDims((d) => ({ ...d, volInicial: e.target.value }))} />
                    <Input label={t('fluids.form.dimsLostHole')} value={dims.volPerdidoHoyo} onChange={(e) => setDims((d) => ({ ...d, volPerdidoHoyo: e.target.value }))} />
                    <Input label={t('fluids.form.dimsDiscarded')} value={dims.volDescartado} onChange={(e) => setDims((d) => ({ ...d, volDescartado: e.target.value }))} />
                    <Input label={t('fluids.form.dimsPrepared')} value={dims.volPreparado} onChange={(e) => setDims((d) => ({ ...d, volPreparado: e.target.value }))} />
                    <Input label={t('fluids.form.dimsTransferred')} value={dims.volTransferido} onChange={(e) => setDims((d) => ({ ...d, volTransferido: e.target.value }))} />
                    <Input label={t('fluids.form.dimsReceived')} value={dims.volRecibido} onChange={(e) => setDims((d) => ({ ...d, volRecibido: e.target.value }))} />
                    <Input label={t('fluids.form.dimsLostSurface')} value={dims.volPerdidoSup} onChange={(e) => setDims((d) => ({ ...d, volPerdidoSup: e.target.value }))} />
                    <Input label={t('fluids.form.dimsFinal')} value={dims.volFinal} onChange={(e) => setDims((d) => ({ ...d, volFinal: e.target.value }))} />
                  </div>
                </section>

                {/* Hidraulica */}
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('fluids.form.hydraulics')}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Input label="ESD" value={hydraulics.esd} onChange={(e) => setHydraulics((h) => ({ ...h, esd: e.target.value }))} />
                    <Input label="ECD" value={hydraulics.ecd} onChange={(e) => setHydraulics((h) => ({ ...h, ecd: e.target.value }))} />
                    <Input label="n Tuberia" value={hydraulics.embNTuberia} onChange={(e) => setHydraulics((h) => ({ ...h, embNTuberia: e.target.value }))} />
                    <Input label="n Anular" value={hydraulics.embNAnular} onChange={(e) => setHydraulics((h) => ({ ...h, embNAnular: e.target.value }))} />
                    <Input label="K Tuberia" value={hydraulics.embKTuberia} onChange={(e) => setHydraulics((h) => ({ ...h, embKTuberia: e.target.value }))} />
                    <Input label="K Anular" value={hydraulics.embKAnular} onChange={(e) => setHydraulics((h) => ({ ...h, embKAnular: e.target.value }))} />
                  </div>
                </section>

                {/* Control de Solidos */}
                <section>
                  <FluidSolidsTable rows={solidsRows} onChange={setSolidsRows} />
                </section>

                {/* Bitacora de Horas */}
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('fluids.form.activityLog')}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <Input label={t('fluids.form.actMoving')} value={activity.hoursMoving} onChange={(e) => setActivity((a) => ({ ...a, hoursMoving: e.target.value }))} />
                    <Input label={t('fluids.form.actCirculating')} value={activity.hoursCirculating} onChange={(e) => setActivity((a) => ({ ...a, hoursCirculating: e.target.value }))} />
                    <Input label={t('fluids.form.actDrilling')} value={activity.hoursDrilling} onChange={(e) => setActivity((a) => ({ ...a, hoursDrilling: e.target.value }))} />
                    <Input label={t('fluids.form.actTripping')} value={activity.hoursTripping} onChange={(e) => setActivity((a) => ({ ...a, hoursTripping: e.target.value }))} />
                    <Input label={t('fluids.form.actCleaning')} value={activity.hoursCleaning} onChange={(e) => setActivity((a) => ({ ...a, hoursCleaning: e.target.value }))} />
                    <Input label={t('fluids.form.actBackreaming')} value={activity.hoursBackreaming} onChange={(e) => setActivity((a) => ({ ...a, hoursBackreaming: e.target.value }))} />
                    <Input label={t('fluids.form.actCementing')} value={activity.hoursCementing} onChange={(e) => setActivity((a) => ({ ...a, hoursCementing: e.target.value }))} />
                    <Input label={t('fluids.form.actRunningCsg')} value={activity.hoursRunningCsg} onChange={(e) => setActivity((a) => ({ ...a, hoursRunningCsg: e.target.value }))} />
                    <Input label={t('fluids.form.actOther')} value={activity.hoursOther} onChange={(e) => setActivity((a) => ({ ...a, hoursOther: e.target.value }))} />
                    <div className="flex items-end">
                      <div className="w-full">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fluids.form.actTotal')}</label>
                        <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-bold text-center">
                          {computeHoursTotal(activity)} {t('fluids.form.actHrs')}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Comentarios */}
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('fluids.form.comments')}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fluids.form.commentsFluid')}</label>
                      <textarea
                        value={comments.fluidComments}
                        onChange={(e) => setComments((c) => ({ ...c, fluidComments: e.target.value }))}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fluids.form.commentsProducts')}</label>
                      <textarea
                        value={comments.productComments}
                        onChange={(e) => setComments((c) => ({ ...c, productComments: e.target.value }))}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fluids.form.commentsVol')}</label>
                      <textarea
                        value={comments.volComments}
                        onChange={(e) => setComments((c) => ({ ...c, volComments: e.target.value }))}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </section>

              </div>
            )}

            {/* Tab 2: Inventario & Servicios */}
            {activeTab === 'tab2' && (
              <div className="space-y-8">
                {/* Inventario de Productos */}
                <section>
                  <FluidInventoryTable
                    rows={inventoryRows}
                    products={activeProducts}
                    onChange={setInventoryRows}
                  />
                </section>

                {/* Servicios Tecnicos */}
                <section>
                  <FluidServicesTable
                    rows={serviceRows}
                    onChange={setServiceRows}
                  />
                </section>

                {/* Comentarios de Productos (ya existe en comments state) */}
                <section>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">
                    {t('fluids.form.commentsProductsServices')}
                  </h4>
                  <textarea
                    value={comments.productComments}
                    onChange={(e) => setComments((c) => ({ ...c, productComments: e.target.value }))}
                    rows={3}
                    placeholder={t('fluids.form.commentsProductsPlaceholder')}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </section>

              </div>
            )}

            {/* Tab 3: Volumetria y Tanques */}
            {activeTab === 'tab3' && (
              <div className="space-y-8">
                {/* Tanques */}
                <section>
                  <FluidTanksTable
                    rows={tankRows}
                    onChange={setTankRows}
                  />
                </section>

                {/* Volumetria Estadistica */}
                <section>
                  <FluidVolStatsSection
                    data={volStats}
                    onChange={setVolStats}
                  />
                </section>

                {/* Comentarios de volumetria */}
                <section>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">
                    {t('fluids.form.commentsVolSection')}
                  </h4>
                  <textarea
                    value={comments.volComments}
                    onChange={(e) => setComments((c) => ({ ...c, volComments: e.target.value }))}
                    rows={3}
                    placeholder={t('fluids.form.commentsVolPlaceholder')}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </section>

              </div>
            )}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
