import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDateDMY, getTodayDMY } from './dateUtils';
import { capitalize } from './stringUtils';
import {
  saveExcelDialog,
  savePdfDialog,
  saveBothDialog,
} from './logisticsSaveDialog';
import type {
  LogisticsReport,
  DetailedLogisticsReport,
  DetailedMovement,
} from '../types/logistics';
import type { MovementFilter } from '../schemas/logisticsSchemas';
import i18n from '@/lib/i18n';

const t = (key: string, opts?: Record<string, any>) => i18n.t(key, opts) as string;

// ============================================================================
// HELPERS
// ============================================================================

const ensureText = (v: any): string => (v === null || v === undefined ? '' : String(v));

const movementTypeLabel = (type: string) => t(`exports.common.movementTypes.${type}`, { defaultValue: type });

/** Parse a hex color string to an [R, G, B] tuple for jsPDF / autoTable. */
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

/** Get current date-time formatted as "dd/mm/yyyy HH:mm" */
function getNowDatetime(): string {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${d}/${m}/${y} ${h}:${min}`;
}

/** Get current date as "dd-mm-yyyy" (safe for filenames). */
function getTodayForFilename(): string {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${d}-${m}-${now.getFullYear()}`;
}

/**
 * Build a descriptive filename (without extension).
 * Pattern: "[Taladro] - [Tipo Reporte] - [Fecha]"
 * Falls back to a generic name when rigName is empty.
 */
function buildFilename(rigName: string | undefined, reportType: string): string {
  const date = getTodayForFilename();
  const rig = rigName?.trim() || 'Reporte';
  return `${rig} - ${reportType} - ${date}`;
}

/**
 * Draw the branded PDF header.
 *
 * Layout:
 *   Left: Logo (if available)         Right: date-time
 *   Center: rigName — reportTitle
 *   Center: (periodStart — periodEnd)
 *
 * Returns the Y position after the header (where content should start).
 */
function drawPdfHeader(
  doc: jsPDF,
  branding: ReportBranding | undefined,
  reportTitle: string,
  periodStart: string,
  periodEnd: string,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // --- Row 1: Logo (left) + Date-time (right) ---
  const datetime = getNowDatetime();

  if (branding?.logoBase64) {
    try {
      // Calculate dimensions preserving aspect ratio (max height = 24, max width = 40)
      const imgProps = doc.getImageProperties(branding.logoBase64);
      const maxH = 24;
      const maxW = 40;
      const ratio = imgProps.width / imgProps.height;
      let imgW = maxH * ratio;
      let imgH = maxH;
      if (imgW > maxW) {
        imgW = maxW;
        imgH = maxW / ratio;
      }
      doc.addImage(branding.logoBase64, 'PNG', 14, y - 3, imgW, imgH);
    } catch {
      // If image fails (bad format), just skip it silently
    }
  }

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const dtWidth = doc.getTextWidth(datetime);
  doc.text(datetime, pageWidth - 14 - dtWidth, y + 2);

  // User name below date-time
  if (branding?.userName) {
    const nameWidth = doc.getTextWidth(branding.userName);
    doc.text(branding.userName, pageWidth - 14 - nameWidth, y + 7);
  }

  y += 18;

  // --- Row 2: Rig name — Report type (centered) ---
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  const rigName = branding?.rigName || '';
  const titleLine = rigName ? `${rigName} — ${reportTitle}` : reportTitle;
  doc.text(titleLine, pageWidth / 2, y, { align: 'center' });

  y += 7;

  // --- Row 3: Period (centered) ---
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  const periodLine = `(${formatDateDMY(periodStart)} — ${formatDateDMY(periodEnd)})`;
  doc.text(periodLine, pageWidth / 2, y, { align: 'center' });

  y += 4;

  // --- Separator line ---
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageWidth - 14, y);

  y += 8;

  // Reset text color for body content
  doc.setTextColor(0, 0, 0);

  return y;
}

// ============================================================================
// SHARED INTERFACES
// ============================================================================

/** Branding info coming from AppSettings, used for PDF headers. */
export interface ReportBranding {
  /** Base64-encoded logo image (data:image/png;base64,...) or null */
  logoBase64: string | null;
  /** Primary color hex (e.g. "#1e3a5f") */
  primaryColor: string;
  /** Name of the rig / taladro */
  rigName: string;
  /** Full name of the user generating the report */
  userName: string;
}

export interface GeneralExportOptions {
  report: LogisticsReport;
  sections: { botellones: boolean; combustible: boolean; vacuum: boolean; materiales: boolean; solicitudes: boolean };
  periodStart: string;
  periodEnd: string;
  branding?: ReportBranding;
}

export interface DetailedExportOptions {
  data: DetailedLogisticsReport;
  periodStart: string;
  periodEnd: string;
  movementFilter?: MovementFilter;
  statusFilters?: string[];
  branding?: ReportBranding;
}

/** Result returned by save operations. `saved` is false when the user cancels. */
export interface SaveResult {
  saved: boolean;
  paths: string[];
}

// ============================================================================
// GENERAL REPORT — BUILD (Excel)
// ============================================================================

export function buildGeneralReportExcel(opts: GeneralExportOptions): { workbook: XLSX.WorkBook; filename: string } {
  const { report, sections, periodStart, periodEnd, branding } = opts;
  const wb = XLSX.utils.book_new();

  // --- Info sheet ---
  const info = [
    [t('exports.logistics.generalTitle')],
    [t('exports.common.period'), `${formatDateDMY(periodStart)} — ${formatDateDMY(periodEnd)}`],
    [t('exports.common.generated'), getTodayDMY()],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(info);
  wsInfo['!cols'] = [{ wch: 20 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Info');

  if (sections.botellones) {
    const s = report.waterBottlesSummary;
    const ws = XLSX.utils.aoa_to_sheet([
      [t('exports.logistics.waterBottlesTitle')],
      [],
      [t('exports.logistics.metric'), t('exports.logistics.value')],
      [t('exports.logistics.totalEntries'), s.totalEntries],
      [t('exports.logistics.totalExits'), s.totalExits],
      [t('exports.logistics.net'), s.net],
    ]);
    ws['!cols'] = [{ wch: 18 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, t('exports.logistics.sectionBotellones'));
  }

  if (sections.combustible) {
    const s = report.fuelSummary;
    const ws = XLSX.utils.aoa_to_sheet([
      [t('exports.logistics.fuelTitle')],
      [],
      [t('exports.logistics.metric'), t('exports.logistics.value')],
      [t('exports.logistics.totalEntriesL'), s.totalEntries.toFixed(2)],
      [t('exports.logistics.totalExitsL'), s.totalExits.toFixed(2)],
      [t('exports.logistics.netL'), s.net.toFixed(2)],
    ]);
    ws['!cols'] = [{ wch: 20 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, t('exports.logistics.sectionFuel'));
  }

  if (sections.vacuum) {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Vacuum / Cisterna — Resumen'],
      [],
      ['Métrica', 'Valor'],
      ['Total Acciones', report.vacuumSummary.totalActions],
    ]);
    ws['!cols'] = [{ wch: 18 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Vacuum');
  }

  if (sections.materiales) {
    const header = ['Material', 'Unidad', 'Entradas', 'Salidas', 'Neto'];
    const rows = report.materialsSummary.map((m) => [
      capitalize(m.materialName), m.unit, m.totalEntries, m.totalExits, m.net,
    ]);
    const ws = XLSX.utils.aoa_to_sheet([['Materiales — Resumen'], [], header, ...rows]);
    ws['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Materiales');
  }

  if (sections.solicitudes) {
    const s = report.requestsSummary;
    const ws = XLSX.utils.aoa_to_sheet([
      ['Solicitudes — Resumen'],
      [],
      ['Estado', 'Cantidad'],
      ['Total', s.total],
      ['Solicitadas', s.requested],
      ['En Espera', s.pending],
      ['Aprobadas', s.approved],
      ['Rechazadas', s.rejected],
    ]);
    ws['!cols'] = [{ wch: 16 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Solicitudes');
  }

  const filename = buildFilename(branding?.rigName, 'Reporte General');
  return { workbook: wb, filename };
}

// ============================================================================
// GENERAL REPORT — BUILD (PDF)
// ============================================================================

export function buildGeneralReportPdf(opts: GeneralExportOptions): { doc: jsPDF; filename: string } {
  const { report, sections, periodStart, periodEnd, branding } = opts;
  const doc = new jsPDF();
  const headColor: [number, number, number] = branding?.primaryColor
    ? hexToRgb(branding.primaryColor)
    : [59, 130, 246];

  let y = drawPdfHeader(doc, branding, 'Reporte General', periodStart, periodEnd);

  if (sections.botellones) {
    const s = report.waterBottlesSummary;
    doc.setFontSize(13);
    doc.text('Botellones de Agua', 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Métrica', 'Valor']],
      body: [['Entradas', `+${s.totalEntries}`], ['Salidas', `-${s.totalExits}`], ['Neto', String(s.net)]],
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: headColor },
      margin: { left: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  if (sections.combustible) {
    const s = report.fuelSummary;
    doc.setFontSize(13);
    doc.text('Combustible', 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Métrica', 'Valor']],
      body: [
        ['Entradas (L)', `+${s.totalEntries.toFixed(2)}`],
        ['Salidas (L)', `-${s.totalExits.toFixed(2)}`],
        ['Neto (L)', s.net.toFixed(2)],
      ],
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: headColor },
      margin: { left: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  if (sections.vacuum) {
    doc.setFontSize(13);
    doc.text('Vacuum / Cisterna', 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Métrica', 'Valor']],
      body: [['Total Acciones', String(report.vacuumSummary.totalActions)]],
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: headColor },
      margin: { left: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  if (sections.materiales && report.materialsSummary.length > 0) {
    doc.setFontSize(13);
    doc.text('Materiales', 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Material', 'Unidad', 'Entradas', 'Salidas', 'Neto']],
      body: report.materialsSummary.map((m) => [
        capitalize(m.materialName), m.unit, `+${m.totalEntries}`, `-${m.totalExits}`, String(m.net),
      ]),
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: headColor },
      margin: { left: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  if (sections.solicitudes) {
    const s = report.requestsSummary;
    doc.setFontSize(13);
    doc.text('Solicitudes', 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Estado', 'Cantidad']],
      body: [
        ['Total', String(s.total)],
        ['Solicitadas', String(s.requested)],
        ['En Espera', String(s.pending)],
        ['Aprobadas', String(s.approved)],
        ['Rechazadas', String(s.rejected)],
      ],
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: headColor },
      margin: { left: 14 },
    });
  }

  const filename = buildFilename(branding?.rigName, 'Reporte General');
  return { doc, filename };
}

// ============================================================================
// GENERAL REPORT — SAVE (public API used by modals)
// ============================================================================

export async function saveGeneralReport(
  opts: GeneralExportOptions,
  format: 'excel' | 'pdf' | 'both',
): Promise<SaveResult> {
  if (format === 'excel') {
    const { workbook, filename } = buildGeneralReportExcel(opts);
    const result = await saveExcelDialog(workbook, `${filename}.xlsx`);
    return { saved: !!result.path, paths: result.path ? [result.path] : [] };
  }

  if (format === 'pdf') {
    const { doc, filename } = buildGeneralReportPdf(opts);
    const result = await savePdfDialog(doc, `${filename}.pdf`);
    return { saved: !!result.path, paths: result.path ? [result.path] : [] };
  }

  // format === 'both'
  const { workbook, filename } = buildGeneralReportExcel(opts);
  const { doc } = buildGeneralReportPdf(opts);
  const result = await saveBothDialog(workbook, doc, filename);
  if (!result.directory) return { saved: false, paths: [] };
  return {
    saved: true,
    paths: [result.excelPath!, result.pdfPath!],
  };
}

// ============================================================================
// DETAILED REPORT — BUILD helpers
// ============================================================================

function filterMovements(movements: DetailedMovement[], filter: MovementFilter): DetailedMovement[] {
  if (filter === 'both') return movements;
  return movements.filter((m) => (filter === 'entries' ? m.movementType === 'entry' : m.movementType === 'exit'));
}

function getDetailedSectionLabel(section: string): string {
  const map: Record<string, string> = {
    water_bottles: t('exports.logistics.sectionBotellones'),
    fuel: t('exports.logistics.sectionFuel'),
    vacuum: t('exports.logistics.sectionVacuum'),
    materials: t('exports.logistics.sectionMaterials'),
  };
  return map[section] ?? t('exports.logistics.sectionRequests');
}

function getDetailedPdfSectionLabel(section: string): string {
  const map: Record<string, string> = {
    water_bottles: t('exports.logistics.sectionBotellones'),
    fuel: t('exports.logistics.sectionFuel'),
    vacuum: t('exports.logistics.sectionVacuumPdf'),
    materials: t('exports.logistics.sectionMaterials'),
  };
  return map[section] ?? t('exports.logistics.sectionRequests');
}

// ============================================================================
// DETAILED REPORT — BUILD (Excel)
// ============================================================================

export function buildDetailedReportExcel(opts: DetailedExportOptions): { workbook: XLSX.WorkBook; filename: string } {
  const { data, periodStart, periodEnd, movementFilter = 'both', statusFilters, branding } = opts;
  const wb = XLSX.utils.book_new();
  const sectionLabel = getDetailedSectionLabel(data.section);

  // Info
  const info = [
    [`Reporte Detallado — ${sectionLabel}`],
    ['Período', `${formatDateDMY(periodStart)} — ${formatDateDMY(periodEnd)}`],
    ['Generado', getTodayDMY()],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(info);
  wsInfo['!cols'] = [{ wch: 22 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Info');

  if (data.section === 'requests') {
    let reqs = data.requests;
    if (statusFilters && statusFilters.length > 0) {
      reqs = reqs.filter((r) => statusFilters.includes(r.status));
    }
    const header = [t('exports.logistics.movementType'), t('exports.logistics.detail'), t('exports.logistics.statusCol'), t('exports.logistics.notes'), t('exports.logistics.requestedBy'), t('exports.logistics.requestDate')];
    const rows = reqs.map((r) => [
      t(`exports.common.requestTypes.${r.requestType}`, { defaultValue: r.requestType }),
      ensureText(r.quantity ?? r.actionRequested),
      t(`exports.common.requestStatuses.${r.status}`, { defaultValue: r.status }),
      ensureText(r.notes),
      ensureText(r.requestedByName),
      formatDateDMY(r.requestedAt?.split('T')[0]),
    ]);
    const ws = XLSX.utils.aoa_to_sheet([[`${sectionLabel} — Detalle`], [], header, ...rows]);
    ws['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 30 }, { wch: 20 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, sectionLabel);
  } else {
    const movements = filterMovements(data.movements, movementFilter);
    const isMaterial = data.section === 'materials';
    const isVacuum = data.section === 'vacuum';

    const header = isVacuum
      ? [t('exports.logistics.action'), t('exports.logistics.notes'), t('exports.logistics.registeredBy'), t('exports.logistics.date')]
      : isMaterial
        ? [t('exports.logistics.movementType'), t('exports.logistics.material'), t('exports.ddr.quantity'), t('exports.logistics.unit'), t('exports.logistics.notes'), t('exports.logistics.registeredBy'), t('exports.logistics.date')]
        : [t('exports.logistics.movementType'), t('exports.ddr.quantity'), t('exports.logistics.notes'), t('exports.logistics.registeredBy'), t('exports.logistics.date')];

    const rows = movements.map((m) => {
      const type = movementTypeLabel(m.movementType || '');
      const date = formatDateDMY(m.createdAt?.split('T')[0]);
      if (isVacuum) return [ensureText(m.actionName), ensureText(m.notes), ensureText(m.createdByName), date];
      if (isMaterial) return [type, capitalize(ensureText(m.materialName)), ensureText(m.quantity), ensureText(m.materialUnit), ensureText(m.notes), ensureText(m.createdByName), date];
      return [type, ensureText(m.quantity), ensureText(m.notes), ensureText(m.createdByName), date];
    });

    const ws = XLSX.utils.aoa_to_sheet([[`${sectionLabel} — ${t('exports.logistics.detail')}`], [], header, ...rows]);
    ws['!cols'] = header.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, sectionLabel);
  }

  const filename = buildFilename(branding?.rigName, `${t('exports.common.detailed')} ${sectionLabel}`);
  return { workbook: wb, filename };
}

// ============================================================================
// DETAILED REPORT — BUILD (PDF)
// ============================================================================

export function buildDetailedReportPdf(opts: DetailedExportOptions): { doc: jsPDF; filename: string } {
  const { data, periodStart, periodEnd, movementFilter = 'both', statusFilters, branding } = opts;
  const doc = new jsPDF();
  const sectionLabel = getDetailedPdfSectionLabel(data.section);
  const headColor: [number, number, number] = branding?.primaryColor
    ? hexToRgb(branding.primaryColor)
    : [59, 130, 246];

  let y = drawPdfHeader(doc, branding, `${t('exports.common.detailed')} — ${sectionLabel}`, periodStart, periodEnd);

  if (data.section === 'requests') {
    let reqs = data.requests;
    if (statusFilters && statusFilters.length > 0) {
      reqs = reqs.filter((r) => statusFilters.includes(r.status));
    }
    autoTable(doc, {
      startY: y,
      head: [[t('exports.logistics.movementType'), t('exports.logistics.detail'), t('exports.logistics.statusCol'), t('exports.logistics.notes'), t('exports.logistics.requestedBy'), t('exports.logistics.date')]],
      body: reqs.map((r) => [
        t(`exports.common.requestTypes.${r.requestType}`, { defaultValue: r.requestType }),
        ensureText(r.quantity ?? r.actionRequested),
        t(`exports.common.requestStatuses.${r.status}`, { defaultValue: r.status }),
        ensureText(r.notes),
        ensureText(r.requestedByName),
        formatDateDMY(r.requestedAt?.split('T')[0]),
      ]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: headColor },
      margin: { left: 14 },
    });
  } else {
    const movements = filterMovements(data.movements, movementFilter);
    const isMaterial = data.section === 'materials';
    const isVacuum = data.section === 'vacuum';

    const head = isVacuum
      ? [[t('exports.logistics.action'), t('exports.logistics.notes'), t('exports.logistics.registeredBy'), t('exports.logistics.date')]]
      : isMaterial
        ? [[t('exports.logistics.movementType'), t('exports.logistics.material'), t('exports.ddr.quantity'), t('exports.logistics.unit'), t('exports.logistics.notes'), t('exports.logistics.registeredBy'), t('exports.logistics.date')]]
        : [[t('exports.logistics.movementType'), t('exports.ddr.quantity'), t('exports.logistics.notes'), t('exports.logistics.registeredBy'), t('exports.logistics.date')]];

    const body = movements.map((m) => {
      const type = movementTypeLabel(m.movementType || '');
      const date = formatDateDMY(m.createdAt?.split('T')[0]);
      if (isVacuum) return [ensureText(m.actionName), ensureText(m.notes), ensureText(m.createdByName), date];
      if (isMaterial) return [type, capitalize(ensureText(m.materialName)), ensureText(m.quantity), ensureText(m.materialUnit), ensureText(m.notes), ensureText(m.createdByName), date];
      return [type, ensureText(m.quantity), ensureText(m.notes), ensureText(m.createdByName), date];
    });

    autoTable(doc, {
      startY: y,
      head,
      body,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: headColor },
      margin: { left: 14 },
    });
  }

  const filename = buildFilename(branding?.rigName, `Detallado ${sectionLabel}`);
  return { doc, filename };
}

// ============================================================================
// DETAILED REPORT — SAVE (public API used by modals)
// ============================================================================

export async function saveDetailedReport(
  opts: DetailedExportOptions,
  format: 'excel' | 'pdf' | 'both',
): Promise<SaveResult> {
  if (format === 'excel') {
    const { workbook, filename } = buildDetailedReportExcel(opts);
    const result = await saveExcelDialog(workbook, `${filename}.xlsx`);
    return { saved: !!result.path, paths: result.path ? [result.path] : [] };
  }

  if (format === 'pdf') {
    const { doc, filename } = buildDetailedReportPdf(opts);
    const result = await savePdfDialog(doc, `${filename}.pdf`);
    return { saved: !!result.path, paths: result.path ? [result.path] : [] };
  }

  // format === 'both'
  const { workbook, filename } = buildDetailedReportExcel(opts);
  const { doc } = buildDetailedReportPdf(opts);
  const result = await saveBothDialog(workbook, doc, filename);
  if (!result.directory) return { saved: false, paths: [] };
  return {
    saved: true,
    paths: [result.excelPath!, result.pdfPath!],
  };
}
