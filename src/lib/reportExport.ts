import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDateDMY } from './dateUtils';
import {
  saveExcelDialog,
  savePdfDialog,
  saveBothDialog,
} from './logisticsSaveDialog';
import type {
  Report,
  CrewShift,
  BitRecord,
  TimeDistribution,
  MudRecord,
  MudAdditive,
  DrillingParameters,
  DeviationHistory,
  OperationsLog,
  DrillStringComponent,
} from '../types/report';
import type { ReportBranding, SaveResult } from './logisticsExport';

// ============================================================================
// TYPES
// ============================================================================

export interface DDRReportData {
  report: Report;
  crewShifts?: CrewShift[];
  bitRecords?: BitRecord[];
  timeDistributions?: TimeDistribution[];
  mudRecords?: MudRecord[];
  mudAdditives?: MudAdditive[];
  drillingParams?: DrillingParameters[];
  deviationHistory?: DeviationHistory[];
  operationsLog?: OperationsLog[];
  drillStringComponents?: DrillStringComponent[];
}

export interface DDRExportOptions {
  data: DDRReportData;
  branding?: ReportBranding;
}

// ============================================================================
// HELPERS
// ============================================================================

const SHIFT_LABELS: Record<string, string> = {
  morning: 'Mañana',
  afternoon: 'Tarde',
  night: 'Noche',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  submitted: 'Enviado',
  approved: 'Aprobado',
  rejected: 'Rechazado',
};

const ensure = (v: any): string =>
  v === null || v === undefined ? '-' : String(v);

const SHIFT_SORT_ORDER: Record<string, number> = { morning: 0, afternoon: 1, night: 2 };
function sortByShift<T extends { shift?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (SHIFT_SORT_ORDER[a.shift ?? ''] ?? 99) - (SHIFT_SORT_ORDER[b.shift ?? ''] ?? 99));
}

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

function buildFilename(report: Report, rigName?: string): string {
  const rig = rigName?.trim() || report.rigNumber || 'DDR';
  const well = report.wellNumber || '';
  const num = report.reportNumber || 0;
  const date = getTodayFilename();
  return `${rig}${well ? ` - ${well}` : ''} - DDR #${num} - ${date}`;
}

// ============================================================================
// PDF — BRANDED HEADER (same layout as logistics)
// ============================================================================

function drawPdfHeader(
  doc: jsPDF,
  branding: ReportBranding | undefined,
  report: Report,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Row 1: Logo (left) + Date-time (right)
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
    doc.text(
      branding.userName,
      pageWidth - 14 - doc.getTextWidth(branding.userName),
      y + 7,
    );
  }

  y += 18;

  // Row 2: Title (centered)
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(12);
  const rigLabel = branding?.rigName || report.rigNumber || '';
  const titleLine = rigLabel
    ? `${rigLabel} — Reporte DDR #${report.reportNumber}`
    : `Reporte DDR #${report.reportNumber}`;
  doc.text(titleLine, pageWidth / 2, y, { align: 'center' });
  y += 6;

  // Row 3: Well + date (centered)
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const subLine = `${report.wellNumber || 'Sin pozo'} · ${formatDateDMY(report.reportDate)} · ${STATUS_LABELS[report.status] || report.status}`;
  doc.text(subLine, pageWidth / 2, y, { align: 'center' });
  y += 4;

  // Separator
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  doc.setTextColor(0, 0, 0);
  return y;
}

// ============================================================================
// PDF — SECTION HEADER
// ============================================================================

function drawSectionTitle(
  doc: jsPDF,
  title: string,
  y: number,
  headColor: [number, number, number],
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Check page break
  if (y + 16 > doc.internal.pageSize.getHeight() - margin) {
    doc.addPage();
    y = margin;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...headColor);
  doc.text(title, margin, y + 4);

  // Subtle underline
  doc.setDrawColor(...headColor);
  doc.setLineWidth(0.4);
  doc.line(margin, y + 6, pageWidth - margin, y + 6);

  // Reset
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  return y + 11;
}

// ============================================================================
// BUILD PDF
// ============================================================================

export function buildDDRReportPdf(opts: DDRExportOptions): { doc: jsPDF; filename: string } {
  const { data, branding } = opts;
  const { report } = data;
  const doc = new jsPDF();
  const margin = 14;
  const headColor: [number, number, number] = branding?.primaryColor
    ? hexToRgb(branding.primaryColor)
    : [30, 58, 95];

  const tableHead = { fillColor: headColor, textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold' as const, fontSize: 7 };
  const tableStyle = { fontSize: 7, cellPadding: 1.5 };

  let y = drawPdfHeader(doc, branding, report);

  const checkPage = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // ── General Info ─────────────────────────────────────────────────────
  y = drawSectionTitle(doc, 'INFORMACIÓN GENERAL', y, headColor);

  autoTable(doc, {
    startY: y,
    body: [
      ['Pozo', ensure(report.wellNumber), 'Campo / Distrito', ensure(report.fieldDistrict)],
      ['Taladro', ensure(report.rigNumber), 'Contratista', ensure(report.contractor)],
      ['Número API', ensure(report.apiNumber), 'Contrato', ensure(report.contract)],
      ['Operador', ensure(report.operator), 'Supervisor 24h', ensure(report.supervisor24h)],
    ],
    theme: 'grid',
    styles: { fontSize: 7 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [245, 245, 245] },
      2: { fontStyle: 'bold', fillColor: [245, 245, 245] },
    },
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Crew Shifts ──────────────────────────────────────────────────────
  if (data.crewShifts && data.crewShifts.length > 0) {
    y = drawSectionTitle(doc, 'CUADRILLA POR TURNO', y, headColor);

    for (const shift of sortByShift(data.crewShifts)) {
      checkPage(25);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(
        `${SHIFT_LABELS[shift.shift] || shift.shift} (${shift.shiftStart || '?'} - ${shift.shiftEnd || '?'})`,
        margin,
        y,
      );
      doc.setFont('helvetica', 'normal');
      y += 3;

      if (shift.members && shift.members.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Posición', 'CI', 'Nombre', 'Horas']],
          body: shift.members.map((m) => [
            ensure(m.position),
            ensure(m.personnelCi || m.ci),
            ensure(m.personnelName || m.name),
            ensure(m.hours),
          ]),
          theme: 'grid',
          styles: tableStyle,
          headStyles: tableHead,
          margin: { left: margin, right: margin },
        });
        y = (doc as any).lastAutoTable.finalY + 6;
      } else {
        y += 4;
      }
    }
    y += 2;
  }

  // ── Time Distribution ────────────────────────────────────────────────
  if (data.timeDistributions && data.timeDistributions.length > 0) {
    y = drawSectionTitle(doc, 'DISTRIBUCIÓN DE TIEMPO', y, headColor);

    autoTable(doc, {
      startY: y,
      head: [['Operación', 'Mañana', 'Tarde', 'Noche', 'Total']],
      body: data.timeDistributions.map((td) => {
        const t = (td.hoursShift1 || 0) + (td.hoursShift2 || 0) + (td.hoursShift3 || 0);
        return [
          td.operationCode?.code || td.operationCodeId || '-',
          String(td.hoursShift1 || 0),
          String(td.hoursShift2 || 0),
          String(td.hoursShift3 || 0),
          `${t}h`,
        ];
      }),
      theme: 'grid',
      styles: { ...tableStyle, halign: 'center' as const },
      headStyles: tableHead,
      columnStyles: { 0: { halign: 'left' as const }, 4: { fontStyle: 'bold' as const } },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── Bit Records ──────────────────────────────────────────────────────
  if (data.bitRecords && data.bitRecords.length > 0) {
    y = drawSectionTitle(doc, 'RECORD DE MECHAS', y, headColor);

    for (const [idx, bit] of data.bitRecords.entries()) {
      checkPage(25);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`Mecha #${idx + 1}`, margin, y);
      doc.setFont('helvetica', 'normal');
      y += 3;

      autoTable(doc, {
        startY: y,
        body: [
          ['Tamaño', ensure(bit.size), 'Marca', ensure(bit.brand)],
          ['Tipo', ensure(bit.bitType), 'Serial', ensure(bit.serialNumber)],
          ['Prof. Entrada', ensure(bit.depthIn), 'Prof. Salida', ensure(bit.depthOut)],
          ['Metraje', ensure(bit.footage), 'Horas Total', ensure(bit.hoursTotal)],
        ],
        theme: 'grid',
        styles: tableStyle,
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [245, 245, 245] },
          2: { fontStyle: 'bold', fillColor: [245, 245, 245] },
        },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }
    y += 2;
  }

  // ── Mud Records ──────────────────────────────────────────────────────
  if (data.mudRecords && data.mudRecords.length > 0) {
    y = drawSectionTitle(doc, 'PROPIEDADES DEL LODO', y, headColor);

    autoTable(doc, {
      startY: y,
      head: [['Turno', 'Hora', 'Peso', 'Visc.', 'PVP', 'Geles', 'Filtrado', 'pH', 'Sólidos']],
      body: sortByShift(data.mudRecords).map((m) => [
        m.shift ? SHIFT_LABELS[m.shift] || m.shift : '-',
        ensure(m.hour), ensure(m.weight), ensure(m.viscosity),
        ensure(m.pvp), ensure(m.gels), ensure(m.filtrate),
        ensure(m.ph), ensure(m.solids),
      ]),
      theme: 'grid',
      styles: tableStyle,
      headStyles: tableHead,
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── Mud Additives ────────────────────────────────────────────────────
  if (data.mudAdditives && data.mudAdditives.length > 0) {
    y = drawSectionTitle(doc, 'ADITIVOS DEL LODO', y, headColor);

    autoTable(doc, {
      startY: y,
      head: [['Turno', 'Tipo', 'Cantidad']],
      body: sortByShift(data.mudAdditives).map((a) => [
        a.shift ? SHIFT_LABELS[a.shift] || a.shift : '-',
        ensure(a.additiveType),
        ensure(a.quantity),
      ]),
      theme: 'grid',
      styles: tableStyle,
      headStyles: tableHead,
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── Drilling Parameters ──────────────────────────────────────────────
  if (data.drillingParams && data.drillingParams.length > 0) {
    y = drawSectionTitle(doc, 'PARÁMETROS DE PERFORACIÓN', y, headColor);

    autoTable(doc, {
      startY: y,
      head: [['Turno', 'Prof. Desde', 'Prof. Hasta', 'RPM', 'Peso', 'Presión', 'GPM', 'SPM', 'Método']],
      body: sortByShift(data.drillingParams).map((p) => [
        p.shift ? SHIFT_LABELS[p.shift] || p.shift : '-',
        ensure(p.depthFrom), ensure(p.depthTo),
        ensure(p.rotaryRpm), ensure(p.bitWeight), ensure(p.pumpPressure),
        ensure(p.totalGpm), ensure(p.pumpSpm), ensure(p.methodUsed),
      ]),
      theme: 'grid',
      styles: tableStyle,
      headStyles: tableHead,
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── Deviation History ────────────────────────────────────────────────
  if (data.deviationHistory && data.deviationHistory.length > 0) {
    y = drawSectionTitle(doc, 'HISTORIAL DE DESVIACIÓN', y, headColor);

    autoTable(doc, {
      startY: y,
      head: [['Profundidad', 'Desviación (°)', 'Dirección', 'TVO', 'Desp. Horizontal']],
      body: data.deviationHistory.map((d) => [
        ensure(d.depth), ensure(d.deviation), ensure(d.direction),
        ensure(d.tvo), ensure(d.horizontalDisplacement),
      ]),
      theme: 'grid',
      styles: tableStyle,
      headStyles: tableHead,
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── Drill String Components ──────────────────────────────────────────
  if (data.drillStringComponents && data.drillStringComponents.length > 0) {
    y = drawSectionTitle(doc, 'SARTA DE PERFORACIÓN', y, headColor);

    const totalLength = data.drillStringComponents.reduce((s, c) => s + (c.length || 0), 0);

    autoTable(doc, {
      startY: y,
      head: [['N°', 'Pieza', 'Longitud (ft)']],
      body: [
        ...data.drillStringComponents.map((c) => [
          String(c.entryNumber),
          ensure(c.pieceName),
          c.length != null ? c.length.toFixed(2) : '-',
        ]),
        [
          { content: 'TOTAL', styles: { fontStyle: 'bold' as const } },
          { content: `${data.drillStringComponents.length} piezas`, styles: { fontStyle: 'bold' as const } },
          { content: `${totalLength.toFixed(2)} ft`, styles: { fontStyle: 'bold' as const } },
        ],
      ],
      theme: 'grid',
      styles: tableStyle,
      headStyles: tableHead,
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── Operations Log ───────────────────────────────────────────────────
  if (data.operationsLog && data.operationsLog.length > 0) {
    y = drawSectionTitle(doc, 'LOG DE OPERACIONES', y, headColor);

    autoTable(doc, {
      startY: y,
      head: [['Turno', 'Desde', 'Hasta', 'Duración', 'Código', 'Detalles']],
      body: sortByShift(data.operationsLog).map((op) => [
        op.shift ? SHIFT_LABELS[op.shift] || op.shift : '-',
        ensure(op.timeFrom), ensure(op.timeTo), ensure(op.duration),
        ensure(op.operationCode), ensure(op.details),
      ]),
      theme: 'grid',
      styles: tableStyle,
      headStyles: tableHead,
      columnStyles: { 5: { cellWidth: 60 } },
      margin: { left: margin, right: margin },
    });
  }

  // ── Footer on all pages ──────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' },
    );
  }

  const filename = buildFilename(report, branding?.rigName);
  return { doc, filename };
}

// ============================================================================
// BUILD EXCEL
// ============================================================================

export function buildDDRReportExcel(opts: DDRExportOptions): { workbook: XLSX.WorkBook; filename: string } {
  const { data, branding } = opts;
  const { report } = data;
  const wb = XLSX.utils.book_new();

  // ── Info sheet ───────────────────────────────────────────────────────
  const info = [
    ['Reporte Diario de Operaciones (DDR)'],
    [],
    ['Reporte #', report.reportNumber],
    ['Fecha', formatDateDMY(report.reportDate)],
    ['Estado', STATUS_LABELS[report.status] || report.status],
    ['Generado', getNowDatetime()],
    [],
    ['INFORMACIÓN GENERAL'],
    ['Pozo', report.wellNumber || '-'],
    ['Número API', report.apiNumber || '-'],
    ['Contrato', report.contract || '-'],
    ['Contratista', report.contractor || '-'],
    ['Operador', report.operator || '-'],
    ['Campo / Distrito', report.fieldDistrict || '-'],
    ['Taladro', report.rigNumber || '-'],
    ['Municipio', report.municipality || '-'],
    ['Supervisor 24h', report.supervisor24h || '-'],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(info);
  wsInfo['!cols'] = [{ wch: 20 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, 'General');

  // ── Crew ─────────────────────────────────────────────────────────────
  if (data.crewShifts && data.crewShifts.length > 0) {
    const rows: any[][] = [['Turno', 'Horario', 'Posición', 'CI', 'Nombre', 'Horas']];
    for (const shift of sortByShift(data.crewShifts)) {
      const label = SHIFT_LABELS[shift.shift] || shift.shift;
      const horario = `${shift.shiftStart || '-'} - ${shift.shiftEnd || '-'}`;
      if (shift.members?.length) {
        for (const m of shift.members) {
          rows.push([label, horario, m.position || '-', m.personnelCi || m.ci || '-', m.personnelName || m.name || '-', m.hours ?? '-']);
        }
      } else {
        rows.push([label, horario, 'Sin miembros', '-', '-', '-']);
      }
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 20 }, { wch: 14 }, { wch: 25 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Cuadrilla');
  }

  // ── Time Distribution ────────────────────────────────────────────────
  if (data.timeDistributions && data.timeDistributions.length > 0) {
    const rows: any[][] = [['Operación', 'Mañana (hrs)', 'Tarde (hrs)', 'Noche (hrs)', 'Total (hrs)']];
    for (const td of data.timeDistributions) {
      const t = (td.hoursShift1 || 0) + (td.hoursShift2 || 0) + (td.hoursShift3 || 0);
      rows.push([td.operationCode?.code || td.operationCodeId || '-', td.hoursShift1 || 0, td.hoursShift2 || 0, td.hoursShift3 || 0, t]);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Dist. Tiempo');
  }

  // ── Bit Records ──────────────────────────────────────────────────────
  if (data.bitRecords && data.bitRecords.length > 0) {
    const rows: any[][] = [['#', 'Tamaño', 'Marca', 'Tipo', 'Serial', 'Jets', 'TFA', 'Prof. Entrada', 'Prof. Salida', 'Metraje', 'Horas']];
    for (const [i, b] of data.bitRecords.entries()) {
      rows.push([i + 1, b.size || '-', b.brand || '-', b.bitType || '-', b.serialNumber || '-', b.jets || '-', b.tfa || '-', b.depthIn || '-', b.depthOut || '-', b.footage || '-', b.hoursTotal ?? '-']);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = rows[0].map(() => ({ wch: 12 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Mechas');
  }

  // ── Mud Records ──────────────────────────────────────────────────────
  if (data.mudRecords && data.mudRecords.length > 0) {
    const rows: any[][] = [['Turno', 'Hora', 'Peso (ppg)', 'Viscosidad', 'PVP', 'Geles', 'Filtrado', 'pH', 'Sólidos']];
    for (const m of sortByShift(data.mudRecords)) {
      rows.push([m.shift ? SHIFT_LABELS[m.shift] || m.shift : '-', m.hour || '-', m.weight || '-', m.viscosity || '-', m.pvp || '-', m.gels || '-', m.filtrate || '-', m.ph || '-', m.solids || '-']);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = rows[0].map(() => ({ wch: 12 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Lodo');
  }

  // ── Mud Additives ────────────────────────────────────────────────────
  if (data.mudAdditives && data.mudAdditives.length > 0) {
    const rows: any[][] = [['Turno', 'Tipo', 'Cantidad']];
    for (const a of sortByShift(data.mudAdditives)) {
      rows.push([a.shift ? SHIFT_LABELS[a.shift] || a.shift : '-', a.additiveType || '-', a.quantity || '-']);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Aditivos');
  }

  // ── Drilling Parameters ──────────────────────────────────────────────
  if (data.drillingParams && data.drillingParams.length > 0) {
    const rows: any[][] = [['Turno', 'Prof. Desde', 'Prof. Hasta', 'RPM', 'Peso Mecha', 'Presión', 'GPM', 'SPM', 'Método', 'Notas Litología']];
    for (const p of sortByShift(data.drillingParams)) {
      rows.push([p.shift ? SHIFT_LABELS[p.shift] || p.shift : '-', p.depthFrom || '-', p.depthTo || '-', p.rotaryRpm || '-', p.bitWeight || '-', p.pumpPressure || '-', p.totalGpm || '-', p.pumpSpm || '-', p.methodUsed || '-', p.lithologyNotes || '-']);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = rows[0].map(() => ({ wch: 14 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Parámetros');
  }

  // ── Deviation History ────────────────────────────────────────────────
  if (data.deviationHistory && data.deviationHistory.length > 0) {
    const rows: any[][] = [['Profundidad', 'Desviación (°)', 'Dirección', 'TVO', 'Desp. Horizontal']];
    for (const d of data.deviationHistory) {
      rows.push([d.depth || '-', d.deviation || '-', d.direction || '-', d.tvo || '-', d.horizontalDisplacement || '-']);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = rows[0].map(() => ({ wch: 16 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Desviación');
  }

  // ── Drill String ─────────────────────────────────────────────────────
  if (data.drillStringComponents && data.drillStringComponents.length > 0) {
    const totalLength = data.drillStringComponents.reduce((s, c) => s + (c.length || 0), 0);
    const rows: any[][] = [['N°', 'Pieza', 'Longitud (ft)']];
    for (const c of data.drillStringComponents) {
      rows.push([c.entryNumber, c.pieceName, c.length ?? '-']);
    }
    rows.push(['TOTAL', `${data.drillStringComponents.length} piezas`, totalLength.toFixed(2)]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 8 }, { wch: 28 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Sarta');
  }

  // ── Operations Log ───────────────────────────────────────────────────
  if (data.operationsLog && data.operationsLog.length > 0) {
    const rows: any[][] = [['Turno', 'Desde', 'Hasta', 'Duración', 'Código', 'Detalles']];
    for (const op of sortByShift(data.operationsLog)) {
      rows.push([op.shift ? SHIFT_LABELS[op.shift] || op.shift : '-', op.timeFrom || '-', op.timeTo || '-', op.duration || '-', op.operationCode || '-', op.details || '-']);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Operaciones');
  }

  const filename = buildFilename(report, branding?.rigName);
  return { workbook: wb, filename };
}

// ============================================================================
// SAVE — PUBLIC API (used by ReportView)
// ============================================================================

export async function saveDDRReport(
  opts: DDRExportOptions,
  format: 'excel' | 'pdf' | 'both',
): Promise<SaveResult> {
  if (format === 'excel') {
    const { workbook, filename } = buildDDRReportExcel(opts);
    const result = await saveExcelDialog(workbook, `${filename}.xlsx`);
    return { saved: !!result.path, paths: result.path ? [result.path] : [] };
  }

  if (format === 'pdf') {
    const { doc, filename } = buildDDRReportPdf(opts);
    const result = await savePdfDialog(doc, `${filename}.pdf`);
    return { saved: !!result.path, paths: result.path ? [result.path] : [] };
  }

  // both
  const { workbook, filename } = buildDDRReportExcel(opts);
  const { doc } = buildDDRReportPdf(opts);
  const result = await saveBothDialog(workbook, doc, filename);
  if (!result.directory) return { saved: false, paths: [] };
  return { saved: true, paths: [result.excelPath!, result.pdfPath!] };
}
