import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDateDMY, getTodayDMY } from './dateUtils';
import { capitalize } from './stringUtils';
import type {
  LogisticsReport,
  DetailedLogisticsReport,
  DetailedMovement,
} from '../types/logistics';
import type { MovementFilter } from '../schemas/logisticsSchemas';

// ============================================================================
// HELPERS
// ============================================================================

const ensureText = (v: any): string => (v === null || v === undefined ? '' : String(v));

const MOVEMENT_TYPE_LABELS: Record<string, string> = { entry: 'Entrada', exit: 'Salida' };

// ============================================================================
// GENERAL REPORT — Excel
// ============================================================================

interface GeneralExportOptions {
  report: LogisticsReport;
  sections: { botellones: boolean; combustible: boolean; vacuum: boolean; materiales: boolean; solicitudes: boolean };
  periodStart: string;
  periodEnd: string;
}

export function exportGeneralReportExcel(opts: GeneralExportOptions): void {
  const { report, sections, periodStart, periodEnd } = opts;
  const wb = XLSX.utils.book_new();

  // --- Info sheet ---
  const info = [
    ['Reporte General de Logística'],
    ['Período', `${formatDateDMY(periodStart)} — ${formatDateDMY(periodEnd)}`],
    ['Generado', getTodayDMY()],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(info);
  wsInfo['!cols'] = [{ wch: 20 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Info');

  if (sections.botellones) {
    const s = report.waterBottlesSummary;
    const ws = XLSX.utils.aoa_to_sheet([
      ['Botellones de Agua — Resumen'],
      [],
      ['Métrica', 'Valor'],
      ['Total Entradas', s.totalEntries],
      ['Total Salidas', s.totalExits],
      ['Neto', s.net],
    ]);
    ws['!cols'] = [{ wch: 18 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Botellones');
  }

  if (sections.combustible) {
    const s = report.fuelSummary;
    const ws = XLSX.utils.aoa_to_sheet([
      ['Combustible — Resumen'],
      [],
      ['Métrica', 'Valor'],
      ['Total Entradas (L)', s.totalEntries.toFixed(2)],
      ['Total Salidas (L)', s.totalExits.toFixed(2)],
      ['Neto (L)', s.net.toFixed(2)],
    ]);
    ws['!cols'] = [{ wch: 20 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Combustible');
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

  const filename = `logistica_general_${periodStart}_${periodEnd}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ============================================================================
// GENERAL REPORT — PDF
// ============================================================================

export function exportGeneralReportPdf(opts: GeneralExportOptions): void {
  const { report, sections, periodStart, periodEnd } = opts;
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(16);
  doc.text('Reporte General de Logística', 14, y);
  y += 8;
  doc.setFontSize(10);
  doc.text(`Período: ${formatDateDMY(periodStart)} — ${formatDateDMY(periodEnd)}`, 14, y);
  y += 5;
  doc.text(`Generado: ${getTodayDMY()}`, 14, y);
  y += 10;

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
      margin: { left: 14 },
    });
  }

  const filename = `logistica_general_${periodStart}_${periodEnd}.pdf`;
  doc.save(filename);
}

// ============================================================================
// DETAILED REPORT — Excel
// ============================================================================

function filterMovements(movements: DetailedMovement[], filter: MovementFilter): DetailedMovement[] {
  if (filter === 'both') return movements;
  return movements.filter((m) => (filter === 'entries' ? m.movementType === 'entry' : m.movementType === 'exit'));
}

interface DetailedExportOptions {
  data: DetailedLogisticsReport;
  periodStart: string;
  periodEnd: string;
  movementFilter?: MovementFilter;
  statusFilters?: string[];
}

export function exportDetailedReportExcel(opts: DetailedExportOptions): void {
  const { data, periodStart, periodEnd, movementFilter = 'both', statusFilters } = opts;
  const wb = XLSX.utils.book_new();

  const sectionLabel =
    data.section === 'water_bottles' ? 'Botellones'
      : data.section === 'fuel' ? 'Combustible'
        : data.section === 'vacuum' ? 'Vacuum'
          : data.section === 'materials' ? 'Materiales'
            : 'Solicitudes';

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
    const header = ['Tipo', 'Detalle', 'Estado', 'Notas', 'Solicitado por', 'Fecha Solicitud'];
    const rows = reqs.map((r) => [
      ensureText(r.requestType),
      ensureText(r.quantity ?? r.actionRequested),
      ensureText(r.status),
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
      ? ['Acción', 'Notas', 'Registrado por', 'Fecha']
      : isMaterial
        ? ['Tipo', 'Material', 'Cantidad', 'Unidad', 'Notas', 'Registrado por', 'Fecha']
        : ['Tipo', 'Cantidad', 'Notas', 'Registrado por', 'Fecha'];

    const rows = movements.map((m) => {
      const type = MOVEMENT_TYPE_LABELS[m.movementType || ''] || m.movementType || '';
      const date = formatDateDMY(m.createdAt?.split('T')[0]);
      if (isVacuum) return [ensureText(m.actionName), ensureText(m.notes), ensureText(m.createdByName), date];
      if (isMaterial) return [type, capitalize(ensureText(m.materialName)), ensureText(m.quantity), ensureText(m.materialUnit), ensureText(m.notes), ensureText(m.createdByName), date];
      return [type, ensureText(m.quantity), ensureText(m.notes), ensureText(m.createdByName), date];
    });

    const ws = XLSX.utils.aoa_to_sheet([[`${sectionLabel} — Detalle`], [], header, ...rows]);
    ws['!cols'] = header.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, sectionLabel);
  }

  const filename = `logistica_${data.section}_${periodStart}_${periodEnd}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ============================================================================
// DETAILED REPORT — PDF
// ============================================================================

export function exportDetailedReportPdf(opts: DetailedExportOptions): void {
  const { data, periodStart, periodEnd, movementFilter = 'both', statusFilters } = opts;
  const doc = new jsPDF();
  let y = 20;

  const sectionLabel =
    data.section === 'water_bottles' ? 'Botellones'
      : data.section === 'fuel' ? 'Combustible'
        : data.section === 'vacuum' ? 'Vacuum / Cisterna'
          : data.section === 'materials' ? 'Materiales'
            : 'Solicitudes';

  doc.setFontSize(16);
  doc.text(`Reporte Detallado — ${sectionLabel}`, 14, y);
  y += 8;
  doc.setFontSize(10);
  doc.text(`Período: ${formatDateDMY(periodStart)} — ${formatDateDMY(periodEnd)}`, 14, y);
  y += 5;
  doc.text(`Generado: ${getTodayDMY()}`, 14, y);
  y += 10;

  if (data.section === 'requests') {
    let reqs = data.requests;
    if (statusFilters && statusFilters.length > 0) {
      reqs = reqs.filter((r) => statusFilters.includes(r.status));
    }
    autoTable(doc, {
      startY: y,
      head: [['Tipo', 'Detalle', 'Estado', 'Notas', 'Solicitado por', 'Fecha']],
      body: reqs.map((r) => [
        ensureText(r.requestType),
        ensureText(r.quantity ?? r.actionRequested),
        ensureText(r.status),
        ensureText(r.notes),
        ensureText(r.requestedByName),
        formatDateDMY(r.requestedAt?.split('T')[0]),
      ]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14 },
    });
  } else {
    const movements = filterMovements(data.movements, movementFilter);
    const isMaterial = data.section === 'materials';
    const isVacuum = data.section === 'vacuum';

    const head = isVacuum
      ? [['Acción', 'Notas', 'Registrado por', 'Fecha']]
      : isMaterial
        ? [['Tipo', 'Material', 'Cantidad', 'Unidad', 'Notas', 'Registrado por', 'Fecha']]
        : [['Tipo', 'Cantidad', 'Notas', 'Registrado por', 'Fecha']];

    const body = movements.map((m) => {
      const type = MOVEMENT_TYPE_LABELS[m.movementType || ''] || '';
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
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14 },
    });
  }

  const filename = `logistica_${data.section}_${periodStart}_${periodEnd}.pdf`;
  doc.save(filename);
}
