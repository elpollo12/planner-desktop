import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDateDMY } from './dateUtils';
import i18n from '@/lib/i18n';
import {
  saveExcelDialog,
  savePdfDialog,
  saveBothDialog,
} from './logisticsSaveDialog';
import type { FluidReportFull } from '../types/fluid';
import type { ReportBranding, SaveResult } from './logisticsExport';

// ============================================================================
// TYPES
// ============================================================================

export interface FluidExportOptions {
  data: FluidReportFull;
  branding?: ReportBranding;
}

// ============================================================================
// HELPERS
// ============================================================================

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(key, opts) as string;

const ensure = (v: unknown): string =>
  v === null || v === undefined || v === '' ? '-' : String(v);

const ensureNum = (v: unknown): string =>
  v === null || v === undefined || v === '' ? '-' : Number(v).toLocaleString('es-VE', { maximumFractionDigits: 2 });

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  return [
    parseInt(c.substring(0, 2), 16),
    parseInt(c.substring(2, 4), 16),
    parseInt(c.substring(4, 6), 16),
  ];
}

function getNowDatetime(): string {
  const n = new Date();
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${pad(n.getDate())}/${pad(n.getMonth() + 1)}/${n.getFullYear()} ${pad(n.getHours())}:${pad(n.getMinutes())}`;
}

function getTodayFilename(): string {
  const n = new Date();
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${pad(n.getDate())}-${pad(n.getMonth() + 1)}-${n.getFullYear()}`;
}

function buildFilename(data: FluidReportFull, rigName?: string): string {
  const rig = rigName?.trim() || data.rigNumber || 'API';
  const well = data.wellNumber || '';
  const num = data.reportNumber || 0;
  const date = getTodayFilename();
  return `${rig}${well ? ` - ${well}` : ''} - API #${num} - ${date}`;
}

// ============================================================================
// PDF — HEADER
// ============================================================================

function drawPdfHeader(
  doc: jsPDF,
  branding: ReportBranding | undefined,
  data: FluidReportFull,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  if (branding?.logoBase64) {
    try {
      const imgProps = doc.getImageProperties(branding.logoBase64);
      const maxH = 24;
      const maxW = 40;
      const ratio = imgProps.width / imgProps.height;
      let imgW = maxH * ratio;
      let imgH = maxH;
      if (imgW > maxW) { imgW = maxW; imgH = maxW / ratio; }
      doc.addImage(branding.logoBase64, 'PNG', 14, y - 3, imgW, imgH);
    } catch { /* skip bad image */ }
  }

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const datetime = getNowDatetime();
  doc.text(datetime, pageWidth - 14 - doc.getTextWidth(datetime), y + 2);

  if (branding?.userName) {
    doc.text(branding.userName, pageWidth - 14 - doc.getTextWidth(branding.userName), y + 7);
  }

  y += 18;

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(12);
  const rigLabel = branding?.rigName || data.rigNumber || '';
  const titleLine = rigLabel
    ? `${rigLabel} — ${t('exports.fluid.title', { num: data.reportNumber || '?' })}`
    : t('exports.fluid.title', { num: data.reportNumber || '?' });
  doc.text(titleLine, pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const subLine = `${data.wellNumber || t('exports.fluid.noWell')} · ${formatDateDMY(data.reportDate || '')}`;
  doc.text(subLine, pageWidth / 2, y, { align: 'center' });
  y += 4;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  doc.setTextColor(0, 0, 0);
  return y;
}

// ============================================================================
// PDF — SECTION TITLE
// ============================================================================

function drawSectionTitle(
  doc: jsPDF,
  title: string,
  y: number,
  headColor: [number, number, number],
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  if (y + 16 > doc.internal.pageSize.getHeight() - margin) {
    doc.addPage();
    y = margin;
  }
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...headColor);
  doc.text(title, margin, y + 4);
  doc.setDrawColor(...headColor);
  doc.setLineWidth(0.4);
  doc.line(margin, y + 6, pageWidth - margin, y + 6);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  return y + 11;
}

// ============================================================================
// PDF — PAGE FOOTER
// ============================================================================

function addPageFooters(doc: jsPDF, headColor: [number, number, number]) {
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(...headColor);
    doc.text(`${t('exports.fluid.page')} ${i}/${totalPages}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
    doc.text('D-Planner', 14, pageHeight - 8);
  }
}

// ============================================================================
// BUILD PDF
// ============================================================================

export function buildFluidReportPdf(opts: FluidExportOptions): { doc: jsPDF; filename: string } {
  const { data, branding } = opts;
  const doc = new jsPDF();
  const margin = 14;
  const headColor: [number, number, number] = branding?.primaryColor
    ? hexToRgb(branding.primaryColor)
    : [30, 58, 95];

  const tableHead = { fillColor: headColor, textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold' as const, fontSize: 7 };
  const tableStyle = { fontSize: 7, cellPadding: 1.5 };

  let y = drawPdfHeader(doc, branding, data);

  const checkPage = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // ── General Info ──────────────────────────────────────────────────────
  y = drawSectionTitle(doc, t('exports.fluid.generalInfo'), y, headColor);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [[t('exports.fluid.field'), t('exports.fluid.value')]],
    body: [
      [t('exports.fluid.reportNum'), ensure(data.reportNumber)],
      [t('exports.fluid.date'), formatDateDMY(data.reportDate || '')],
      [t('exports.fluid.well'), ensure(data.wellNumber)],
      [t('exports.fluid.rig'), ensure(data.rigNumber)],
      [t('exports.fluid.contract'), ensure(data.contract)],
      [t('exports.fluid.contractor'), ensure(data.contractor)],
      [t('exports.fluid.operator'), ensure(data.operator)],
      [t('exports.fluid.fieldDistrict'), ensure(data.fieldDistrict)],
      [t('exports.fluid.supervisor24h'), ensure(data.supervisor24h)],
      [t('exports.fluid.fluidType'), ensure(data.fluidType)],
      [t('exports.fluid.wellPhase'), ensure(data.wellPhase)],
      [t('exports.fluid.coordinator'), ensure(data.fluidCoordinator)],
      [t('exports.fluid.techRep1'), ensure(data.techRep1)],
      [t('exports.fluid.techRep2'), ensure(data.techRep2)],
      [t('exports.fluid.trainee'), ensure(data.trainee)],
      [t('exports.fluid.opsSupervisor'), ensure(data.opsSupervisor)],
    ],
    headStyles: tableHead,
    styles: tableStyle,
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
    didDrawPage: (d) => { y = d.cursor?.y ?? y; },
  });
  y = (doc as any).lastAutoTable?.finalY ?? y + 10;
  y += 6;

  // ── Fluid Properties ─────────────────────────────────────────────────
  if (data.props.length > 0) {
    checkPage(30);
    y = drawSectionTitle(doc, t('exports.fluid.properties'), y, headColor);

    const propLabels = [
      t('exports.fluid.propHour'), t('exports.fluid.propSource'),
      t('exports.fluid.propTemp'), t('exports.fluid.propDepthMd'), t('exports.fluid.propDepthTvd'),
      t('exports.fluid.propDensity'), t('exports.fluid.propMarsh'),
      'L600', 'L300', 'L200', 'L100', 'L6', 'L3',
      'VP (cP)', 'YP', 'Gel 10s', 'Gel 10m', 'Gel 30m',
      t('exports.fluid.propFiltrate'), t('exports.fluid.propCake'),
      t('exports.fluid.propSand'), t('exports.fluid.propSolids'), t('exports.fluid.propOil'), t('exports.fluid.propWater'),
      'pH', 'Pm', 'Pf', 'Mf', 'Ca²⁺ (ppm)', 'Cl⁻ (ppm)', 'MBT', 'Brookfield',
      t('exports.fluid.propLub'),
    ];

    const propKeys: (keyof typeof data.props[0])[] = [
      'sampleHour', 'sampleSource', 'temperatureF', 'depthMd', 'depthTvd',
      'density', 'marshViscosity',
      'rpm600', 'rpm300', 'rpm200', 'rpm100', 'rpm6', 'rpm3',
      'pv', 'yp', 'gel10s', 'gel10m', 'gel30m',
      'apiFiltrate', 'filterCake',
      'sandContent', 'solidsRetort', 'oilRetort', 'waterRetort',
      'ph', 'alkalinityPm', 'alkalinityPf', 'alkalinityMf',
      'calciumPpm', 'chloridesPpm', 'mbt', 'brookfieldVisc', 'lubricityCoef',
    ];

    const shiftHeaders = [t('exports.fluid.property'), ...data.props.map((_, i) => `${t('exports.fluid.shift')} ${i + 1}`)];
    const propsBody = propLabels.map((label, idx) => {
      const key = propKeys[idx];
      const values = data.props.map(p => ensure(p[key]));
      return [label, ...values];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [shiftHeaders],
      body: propsBody,
      headStyles: tableHead,
      styles: { ...tableStyle, fontSize: 6 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 } },
    });
    y = (doc as any).lastAutoTable?.finalY ?? y + 10;
    y += 6;
  }

  // ── Circulation ───────────────────────────────────────────────────────
  checkPage(25);
  y = drawSectionTitle(doc, t('exports.fluid.circulation'), y, headColor);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [[t('exports.fluid.circParam'), t('exports.fluid.circMin'), t('exports.fluid.circStrokes')]],
    body: [
      [t('exports.fluid.circBottomDown'), ensureNum(data.bottomDownMin), ensureNum(data.bottomDownEmb)],
      [t('exports.fluid.circBottomUp'), ensureNum(data.bottomUpMin), ensureNum(data.bottomUpEmb)],
      [t('exports.fluid.circWellCycle'), ensureNum(data.wellCycleMin), ensureNum(data.wellCycleEmb)],
      [t('exports.fluid.circTotalCycle'), ensureNum(data.totalCycleMin), ensureNum(data.totalCycleEmb)],
    ],
    headStyles: tableHead,
    styles: tableStyle,
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
  });
  y = (doc as any).lastAutoTable?.finalY ?? y + 10;
  y += 6;

  // ── DIMS ──────────────────────────────────────────────────────────────
  checkPage(25);
  y = drawSectionTitle(doc, t('exports.fluid.dims'), y, headColor);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [[t('exports.fluid.field'), t('exports.fluid.valueBls')]],
    body: [
      [t('exports.fluid.dimsInitial'), ensureNum(data.volInicial)],
      [t('exports.fluid.dimsLostHole'), ensureNum(data.volPerdidoHoyo)],
      [t('exports.fluid.dimsDiscarded'), ensureNum(data.volDescartado)],
      [t('exports.fluid.dimsPrepared'), ensureNum(data.volPreparado)],
      [t('exports.fluid.dimsTransferred'), ensureNum(data.volTransferido)],
      [t('exports.fluid.dimsReceived'), ensureNum(data.volRecibido)],
      [t('exports.fluid.dimsLostSurface'), ensureNum(data.volPerdidoSup)],
      [t('exports.fluid.dimsFinal'), ensureNum(data.volFinal)],
    ],
    headStyles: tableHead,
    styles: tableStyle,
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
  });
  y = (doc as any).lastAutoTable?.finalY ?? y + 10;
  y += 6;

  // ── Hydraulics ────────────────────────────────────────────────────────
  checkPage(20);
  y = drawSectionTitle(doc, t('exports.fluid.hydraulics'), y, headColor);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [[t('exports.fluid.field'), t('exports.fluid.value')]],
    body: [
      ['ESD', ensureNum(data.esd)],
      ['ECD', ensureNum(data.ecd)],
      [`n ${t('exports.fluid.pipe')}`, ensureNum(data.embNTuberia)],
      [`n ${t('exports.fluid.annular')}`, ensureNum(data.embNAnular)],
      [`K ${t('exports.fluid.pipe')}`, ensureNum(data.embKTuberia)],
      [`K ${t('exports.fluid.annular')}`, ensureNum(data.embKAnular)],
    ],
    headStyles: tableHead,
    styles: tableStyle,
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
  });
  y = (doc as any).lastAutoTable?.finalY ?? y + 10;
  y += 6;

  // ── Solids Control ────────────────────────────────────────────────────
  if (data.solidsControl.length > 0) {
    checkPage(20);
    y = drawSectionTitle(doc, t('exports.fluid.solidsControl'), y, headColor);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [[t('exports.fluid.solidsEquipment'), t('exports.fluid.solidsMesh'), t('exports.fluid.solidsHrsToday'), t('exports.fluid.solidsHrsAccum')]],
      body: data.solidsControl.map(s => [ensure(s.equipment), ensure(s.designMesh), ensureNum(s.hoursToday), ensureNum(s.hoursAccumulated)]),
      headStyles: tableHead,
      styles: tableStyle,
    });
    y = (doc as any).lastAutoTable?.finalY ?? y + 10;
    y += 6;
  }

  // ── Activity Log ──────────────────────────────────────────────────────
  if (data.activity) {
    checkPage(25);
    y = drawSectionTitle(doc, t('exports.fluid.activityLog'), y, headColor);
    const a = data.activity;
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [[t('exports.fluid.activity'), t('exports.fluid.hours')]],
      body: [
        [t('exports.fluid.actMoving'), ensureNum(a.hoursMoving)],
        [t('exports.fluid.actCirculating'), ensureNum(a.hoursCirculating)],
        [t('exports.fluid.actDrilling'), ensureNum(a.hoursDrilling)],
        [t('exports.fluid.actTripping'), ensureNum(a.hoursTripping)],
        [t('exports.fluid.actCleaning'), ensureNum(a.hoursCleaning)],
        [t('exports.fluid.actBackreaming'), ensureNum(a.hoursBackreaming)],
        [t('exports.fluid.actCementing'), ensureNum(a.hoursCementing)],
        [t('exports.fluid.actRunningCsg'), ensureNum(a.hoursRunningCsg)],
        [t('exports.fluid.actOther'), ensureNum(a.hoursOther)],
        [{ content: t('exports.fluid.actTotal'), styles: { fontStyle: 'bold' as const } }, { content: ensureNum(a.hoursTotal), styles: { fontStyle: 'bold' as const } }],
      ],
      headStyles: tableHead,
      styles: tableStyle,
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
    });
    y = (doc as any).lastAutoTable?.finalY ?? y + 10;
    y += 6;
  }

  // ── Inventory ─────────────────────────────────────────────────────────
  if (data.inventory.length > 0) {
    doc.addPage();
    y = margin;
    y = drawSectionTitle(doc, t('exports.fluid.inventory'), y, headColor);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [[
        t('exports.fluid.invProduct'), t('exports.fluid.invInitial'), t('exports.fluid.invReceived'),
        t('exports.fluid.invTransferred'), t('exports.fluid.invConsumed'), t('exports.fluid.invFinal'),
        t('exports.fluid.invCost'),
      ]],
      body: data.inventory.map(inv => [
        `${inv.productCode || ''} ${inv.productName || ''}`.trim() || '-',
        ensureNum(inv.invInicial), ensureNum(inv.receivedToday),
        ensureNum(inv.transferredToday), ensureNum(inv.consumedToday),
        ensureNum(inv.invFinal), ensureNum(inv.dailyCost),
      ]),
      headStyles: tableHead,
      styles: { ...tableStyle, fontSize: 6 },
    });
    y = (doc as any).lastAutoTable?.finalY ?? y + 10;
    y += 6;
  }

  // ── Services ──────────────────────────────────────────────────────────
  if (data.services.length > 0) {
    checkPage(20);
    y = drawSectionTitle(doc, t('exports.fluid.services'), y, headColor);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [[
        t('exports.fluid.svcName'), t('exports.fluid.svcHours'), t('exports.fluid.svcQty'),
        t('exports.fluid.svcDaysToday'), t('exports.fluid.svcDaysTotal'),
        t('exports.fluid.svcDaily'), t('exports.fluid.svcAccum'),
      ]],
      body: data.services.map(s => [
        ensure(s.serviceName), ensureNum(s.hoursPerDay), ensureNum(s.quantity),
        ensureNum(s.daysToday), ensureNum(s.daysTotal),
        ensureNum(s.dailyCost), ensureNum(s.accumulatedCost),
      ]),
      headStyles: tableHead,
      styles: tableStyle,
    });
    y = (doc as any).lastAutoTable?.finalY ?? y + 10;
    y += 6;
  }

  // ── Tanks ─────────────────────────────────────────────────────────────
  if (data.tanks.length > 0) {
    checkPage(20);
    y = drawSectionTitle(doc, t('exports.fluid.tanks'), y, headColor);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [[
        t('exports.fluid.tankName'), t('exports.fluid.tankStatus'),
        t('exports.fluid.tankVolume'), t('exports.fluid.tankLpg'), t('exports.fluid.tankFluidType'),
      ]],
      body: data.tanks.map(tk => [
        ensure(tk.name), ensure(tk.systemStatus),
        ensureNum(tk.volumeBls), ensureNum(tk.lpg), ensure(tk.fluidType),
      ]),
      headStyles: tableHead,
      styles: tableStyle,
    });
    y = (doc as any).lastAutoTable?.finalY ?? y + 10;
    y += 6;
  }

  // ── Comments ──────────────────────────────────────────────────────────
  const hasComments = data.fluidComments || data.productComments || data.volComments;
  if (hasComments) {
    checkPage(20);
    y = drawSectionTitle(doc, t('exports.fluid.comments'), y, headColor);
    const commentRows: string[][] = [];
    if (data.fluidComments) commentRows.push([t('exports.fluid.commentFluid'), data.fluidComments]);
    if (data.productComments) commentRows.push([t('exports.fluid.commentProduct'), data.productComments]);
    if (data.volComments) commentRows.push([t('exports.fluid.commentVol'), data.volComments]);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [[t('exports.fluid.commentType'), t('exports.fluid.commentText')]],
      body: commentRows,
      headStyles: tableHead,
      styles: { ...tableStyle, cellWidth: 'wrap' },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 }, 1: { cellWidth: 'auto' } },
    });
  }

  // Footer
  addPageFooters(doc, headColor);

  return { doc, filename: buildFilename(data, branding?.rigName) };
}

// ============================================================================
// BUILD EXCEL
// ============================================================================

export function buildFluidReportExcel(opts: FluidExportOptions): { workbook: XLSX.WorkBook; filename: string } {
  const { data, branding } = opts;
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: General ──────────────────────────────────────────────────
  const generalData = [
    [t('exports.fluid.title', { num: data.reportNumber || '?' })],
    [],
    [t('exports.fluid.field'), t('exports.fluid.value')],
    [t('exports.fluid.reportNum'), ensure(data.reportNumber)],
    [t('exports.fluid.date'), formatDateDMY(data.reportDate || '')],
    [t('exports.fluid.well'), ensure(data.wellNumber)],
    [t('exports.fluid.rig'), ensure(data.rigNumber)],
    [t('exports.fluid.contract'), ensure(data.contract)],
    [t('exports.fluid.contractor'), ensure(data.contractor)],
    [t('exports.fluid.operator'), ensure(data.operator)],
    [t('exports.fluid.fieldDistrict'), ensure(data.fieldDistrict)],
    [t('exports.fluid.supervisor24h'), ensure(data.supervisor24h)],
    [t('exports.fluid.fluidType'), ensure(data.fluidType)],
    [t('exports.fluid.wellPhase'), ensure(data.wellPhase)],
    [t('exports.fluid.coordinator'), ensure(data.fluidCoordinator)],
    [t('exports.fluid.techRep1'), ensure(data.techRep1)],
    [t('exports.fluid.techRep2'), ensure(data.techRep2)],
    [t('exports.fluid.trainee'), ensure(data.trainee)],
    [t('exports.fluid.opsSupervisor'), ensure(data.opsSupervisor)],
  ];
  const wsGeneral = XLSX.utils.aoa_to_sheet(generalData);
  wsGeneral['!cols'] = [{ wch: 25 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsGeneral, t('exports.fluid.sheetGeneral'));

  // ── Sheet 2: Properties ───────────────────────────────────────────────
  if (data.props.length > 0) {
    const propLabels = [
      t('exports.fluid.propHour'), t('exports.fluid.propSource'),
      t('exports.fluid.propTemp'), t('exports.fluid.propDepthMd'), t('exports.fluid.propDepthTvd'),
      t('exports.fluid.propDensity'), t('exports.fluid.propMarsh'),
      'L600', 'L300', 'L200', 'L100', 'L6', 'L3',
      'VP (cP)', 'YP', 'Gel 10s', 'Gel 10m', 'Gel 30m',
      t('exports.fluid.propFiltrate'), t('exports.fluid.propCake'),
      t('exports.fluid.propSand'), t('exports.fluid.propSolids'), t('exports.fluid.propOil'), t('exports.fluid.propWater'),
      'pH', 'Pm', 'Pf', 'Mf', 'Ca²⁺ (ppm)', 'Cl⁻ (ppm)', 'MBT', 'Brookfield',
      t('exports.fluid.propLub'),
    ];

    const propKeys: (keyof typeof data.props[0])[] = [
      'sampleHour', 'sampleSource', 'temperatureF', 'depthMd', 'depthTvd',
      'density', 'marshViscosity',
      'rpm600', 'rpm300', 'rpm200', 'rpm100', 'rpm6', 'rpm3',
      'pv', 'yp', 'gel10s', 'gel10m', 'gel30m',
      'apiFiltrate', 'filterCake',
      'sandContent', 'solidsRetort', 'oilRetort', 'waterRetort',
      'ph', 'alkalinityPm', 'alkalinityPf', 'alkalinityMf',
      'calciumPpm', 'chloridesPpm', 'mbt', 'brookfieldVisc', 'lubricityCoef',
    ];

    const headers = [t('exports.fluid.property'), ...data.props.map((_, i) => `${t('exports.fluid.shift')} ${i + 1}`)];
    const rows = propLabels.map((label, idx) => {
      const key = propKeys[idx];
      return [label, ...data.props.map(p => p[key] ?? '')];
    });

    const wsProps = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    wsProps['!cols'] = [{ wch: 20 }, ...data.props.map(() => ({ wch: 15 }))];
    XLSX.utils.book_append_sheet(wb, wsProps, t('exports.fluid.sheetProps'));
  }

  // ── Sheet 3: Circulation + DIMS + Hydraulics ──────────────────────────
  const circData = [
    [t('exports.fluid.circulation')],
    [t('exports.fluid.circParam'), t('exports.fluid.circMin'), t('exports.fluid.circStrokes')],
    [t('exports.fluid.circBottomDown'), data.bottomDownMin ?? '', data.bottomDownEmb ?? ''],
    [t('exports.fluid.circBottomUp'), data.bottomUpMin ?? '', data.bottomUpEmb ?? ''],
    [t('exports.fluid.circWellCycle'), data.wellCycleMin ?? '', data.wellCycleEmb ?? ''],
    [t('exports.fluid.circTotalCycle'), data.totalCycleMin ?? '', data.totalCycleEmb ?? ''],
    [],
    [t('exports.fluid.dims')],
    [t('exports.fluid.field'), t('exports.fluid.valueBls')],
    [t('exports.fluid.dimsInitial'), data.volInicial ?? ''],
    [t('exports.fluid.dimsLostHole'), data.volPerdidoHoyo ?? ''],
    [t('exports.fluid.dimsDiscarded'), data.volDescartado ?? ''],
    [t('exports.fluid.dimsPrepared'), data.volPreparado ?? ''],
    [t('exports.fluid.dimsTransferred'), data.volTransferido ?? ''],
    [t('exports.fluid.dimsReceived'), data.volRecibido ?? ''],
    [t('exports.fluid.dimsLostSurface'), data.volPerdidoSup ?? ''],
    [t('exports.fluid.dimsFinal'), data.volFinal ?? ''],
    [],
    [t('exports.fluid.hydraulics')],
    [t('exports.fluid.field'), t('exports.fluid.value')],
    ['ESD', data.esd ?? ''],
    ['ECD', data.ecd ?? ''],
    [`n ${t('exports.fluid.pipe')}`, data.embNTuberia ?? ''],
    [`n ${t('exports.fluid.annular')}`, data.embNAnular ?? ''],
    [`K ${t('exports.fluid.pipe')}`, data.embKTuberia ?? ''],
    [`K ${t('exports.fluid.annular')}`, data.embKAnular ?? ''],
  ];
  const wsCirc = XLSX.utils.aoa_to_sheet(circData);
  wsCirc['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsCirc, t('exports.fluid.sheetCirc'));

  // ── Sheet 4: Solids Control ───────────────────────────────────────────
  if (data.solidsControl.length > 0) {
    const solidsHeaders = [t('exports.fluid.solidsEquipment'), t('exports.fluid.solidsMesh'), t('exports.fluid.solidsHrsToday'), t('exports.fluid.solidsHrsAccum')];
    const solidsBody = data.solidsControl.map(s => [s.equipment ?? '', s.designMesh ?? '', s.hoursToday ?? '', s.hoursAccumulated ?? '']);
    const wsSolids = XLSX.utils.aoa_to_sheet([solidsHeaders, ...solidsBody]);
    wsSolids['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsSolids, t('exports.fluid.sheetSolids'));
  }

  // ── Sheet 5: Inventory ────────────────────────────────────────────────
  if (data.inventory.length > 0) {
    const invHeaders = [
      t('exports.fluid.invCode'), t('exports.fluid.invProduct'),
      t('exports.fluid.invInitial'), t('exports.fluid.invReceived'), t('exports.fluid.invTransferred'),
      t('exports.fluid.invConsumed'), t('exports.fluid.invFinal'),
      t('exports.fluid.invReceivedTotal'), t('exports.fluid.invTransferredTotal'), t('exports.fluid.invConsumedTotal'),
      t('exports.fluid.invCost'),
    ];
    const invBody = data.inventory.map(inv => [
      inv.productCode ?? '', inv.productName ?? '',
      inv.invInicial ?? '', inv.receivedToday ?? '', inv.transferredToday ?? '',
      inv.consumedToday ?? '', inv.invFinal ?? '',
      inv.receivedTotal ?? '', inv.transferredTotal ?? '', inv.consumedTotal ?? '',
      inv.dailyCost ?? '',
    ]);
    const wsInv = XLSX.utils.aoa_to_sheet([invHeaders, ...invBody]);
    wsInv['!cols'] = invHeaders.map(() => ({ wch: 14 }));
    XLSX.utils.book_append_sheet(wb, wsInv, t('exports.fluid.sheetInventory'));
  }

  // ── Sheet 6: Services ─────────────────────────────────────────────────
  if (data.services.length > 0) {
    const svcHeaders = [
      t('exports.fluid.svcName'), t('exports.fluid.svcHours'), t('exports.fluid.svcQty'),
      t('exports.fluid.svcDaysToday'), t('exports.fluid.svcDaysTotal'),
      t('exports.fluid.svcBsf'), t('exports.fluid.svcUsd'),
      t('exports.fluid.svcDaily'), t('exports.fluid.svcAccum'),
    ];
    const svcBody = data.services.map(s => [
      s.serviceName ?? '', s.hoursPerDay ?? '', s.quantity ?? '',
      s.daysToday ?? '', s.daysTotal ?? '',
      s.costBsf ?? '', s.costUsd ?? '',
      s.dailyCost ?? '', s.accumulatedCost ?? '',
    ]);
    const wsSvc = XLSX.utils.aoa_to_sheet([svcHeaders, ...svcBody]);
    wsSvc['!cols'] = svcHeaders.map(() => ({ wch: 16 }));
    XLSX.utils.book_append_sheet(wb, wsSvc, t('exports.fluid.sheetServices'));
  }

  // ── Sheet 7: Tanks ────────────────────────────────────────────────────
  if (data.tanks.length > 0) {
    const tankHeaders = [t('exports.fluid.tankName'), t('exports.fluid.tankStatus'), t('exports.fluid.tankVolume'), t('exports.fluid.tankLpg'), t('exports.fluid.tankFluidType')];
    const tankBody = data.tanks.map(tk => [tk.name ?? '', tk.systemStatus ?? '', tk.volumeBls ?? '', tk.lpg ?? '', tk.fluidType ?? '']);
    const wsTanks = XLSX.utils.aoa_to_sheet([tankHeaders, ...tankBody]);
    wsTanks['!cols'] = [{ wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsTanks, t('exports.fluid.sheetTanks'));
  }

  // ── Sheet 8: Activity ─────────────────────────────────────────────────
  if (data.activity) {
    const a = data.activity;
    const actData = [
      [t('exports.fluid.activity'), t('exports.fluid.hours')],
      [t('exports.fluid.actMoving'), a.hoursMoving ?? ''],
      [t('exports.fluid.actCirculating'), a.hoursCirculating ?? ''],
      [t('exports.fluid.actDrilling'), a.hoursDrilling ?? ''],
      [t('exports.fluid.actTripping'), a.hoursTripping ?? ''],
      [t('exports.fluid.actCleaning'), a.hoursCleaning ?? ''],
      [t('exports.fluid.actBackreaming'), a.hoursBackreaming ?? ''],
      [t('exports.fluid.actCementing'), a.hoursCementing ?? ''],
      [t('exports.fluid.actRunningCsg'), a.hoursRunningCsg ?? ''],
      [t('exports.fluid.actOther'), a.hoursOther ?? ''],
      [t('exports.fluid.actTotal'), a.hoursTotal ?? ''],
    ];
    const wsAct = XLSX.utils.aoa_to_sheet(actData);
    wsAct['!cols'] = [{ wch: 20 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsAct, t('exports.fluid.sheetActivity'));
  }

  return { workbook: wb, filename: buildFilename(data, branding?.rigName) };
}

// ============================================================================
// PUBLIC: SAVE
// ============================================================================

export async function saveFluidReport(
  opts: FluidExportOptions,
  format: 'pdf' | 'excel' | 'both',
): Promise<SaveResult> {
  if (format === 'pdf') {
    const { doc, filename } = buildFluidReportPdf(opts);
    const result = await savePdfDialog(doc, filename);
    return { saved: !!result.path, paths: result.path ? [result.path] : [] };
  }

  if (format === 'excel') {
    const { workbook, filename } = buildFluidReportExcel(opts);
    const result = await saveExcelDialog(workbook, filename);
    return { saved: !!result.path, paths: result.path ? [result.path] : [] };
  }

  // both
  const { doc, filename: pdfFilename } = buildFluidReportPdf(opts);
  const { workbook, filename: xlsFilename } = buildFluidReportExcel(opts);
  const result = await saveBothDialog(workbook, doc, pdfFilename.replace(/ - \d{2}-\d{2}-\d{4}$/, '') || xlsFilename);
  const paths: string[] = [];
  if (result.excelPath) paths.push(result.excelPath);
  if (result.pdfPath) paths.push(result.pdfPath);
  return { saved: paths.length > 0, paths };
}
