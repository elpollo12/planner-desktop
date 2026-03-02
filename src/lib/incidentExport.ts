import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { savePdfDialog } from './logisticsSaveDialog';
// formatDateDMY available if needed
// import { formatDateDMY } from './dateUtils';
import type { ReportBranding } from './logisticsExport';
import type { IncidentWithPersonnel } from '../types/incident';
import { toast } from 'react-toastify';

// ============================================================================
// HELPERS
// ============================================================================

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ];
}

function getNowDatetime(): string {
  const n = new Date();
  const d = String(n.getDate()).padStart(2, '0');
  const m = String(n.getMonth() + 1).padStart(2, '0');
  const h = String(n.getHours()).padStart(2, '0');
  const min = String(n.getMinutes()).padStart(2, '0');
  return `${d}/${m}/${n.getFullYear()} ${h}:${min}`;
}

function formatDateTimePdf(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()} ${hours}:${mins}`;
  } catch {
    return isoStr;
  }
}

function getTodayForFilename(): string {
  const n = new Date();
  const d = String(n.getDate()).padStart(2, '0');
  const m = String(n.getMonth() + 1).padStart(2, '0');
  return `${d}-${m}-${n.getFullYear()}`;
}

// ============================================================================
// BRANDED HEADER (same layout as logisticsExport / reportExport)
// ============================================================================

function drawPdfHeader(
  doc: jsPDF,
  branding: ReportBranding | undefined,
  reportTitle: string,
  dateLabel: string,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Row 1: Logo (left) + date-time (right)
  const datetime = getNowDatetime();

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
    } catch { /* skip if image fails */ }
  }

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const dtWidth = doc.getTextWidth(datetime);
  doc.text(datetime, pageWidth - 14 - dtWidth, y + 2);

  if (branding?.userName) {
    const nameWidth = doc.getTextWidth(branding.userName);
    doc.text(branding.userName, pageWidth - 14 - nameWidth, y + 7);
  }

  y += 18;

  // Row 2: Rig name — Report title (centered)
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  const rigName = branding?.rigName || '';
  const titleLine = rigName ? `${rigName} — ${reportTitle}` : reportTitle;
  doc.text(titleLine, pageWidth / 2, y, { align: 'center' });

  y += 7;

  // Row 3: Date label (centered)
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(dateLabel, pageWidth / 2, y, { align: 'center' });

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
// EXPORT INCIDENT PDF
// ============================================================================

export interface ExportIncidentPdfOptions {
  incident: IncidentWithPersonnel;
  rigName: string;
  typeName: string;
  branding?: ReportBranding;
}

export async function exportIncidentPdf({ incident, rigName, typeName, branding }: ExportIncidentPdfOptions) {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    const headColor: [number, number, number] = branding?.primaryColor
      ? hexToRgb(branding.primaryColor)
      : [30, 58, 95]; // default brand navy

    const dateStr = formatDateTimePdf(incident.createdAt);
    const dateLabel = `Fecha de incidencia: ${dateStr}`;

    let y = drawPdfHeader(doc, branding, 'Reporte de Incidencia', dateLabel);

    // ── Info table ──
    const headerData = [
      ['Taladro', rigName],
      ['Tipo de Incidencia', typeName],
      ['Reportado por', incident.createdByName ?? '—'],
      ['Fecha', dateStr],
    ];

    autoTable(doc, {
      startY: y,
      body: headerData,
      theme: 'grid',
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 45, textColor: [255, 255, 255], fillColor: headColor },
        1: { cellWidth: undefined },
      },
      styles: { fontSize: 10, cellPadding: 3.5 },
      margin: { left: margin, right: margin },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // ── Description (using autoTable for automatic page breaks) ──
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...headColor);
    doc.text('Descripción', margin, y);
    doc.setTextColor(0, 0, 0);
    y += 3;

    autoTable(doc, {
      startY: y,
      body: [[incident.description]],
      theme: 'plain',
      styles: {
        fontSize: 10,
        cellPadding: { top: 4, right: 6, bottom: 4, left: 6 },
        lineColor: [220, 220, 220],
        lineWidth: 0.3,
        textColor: [40, 40, 40],
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { cellWidth: pageWidth - margin * 2 },
      },
      margin: { left: margin, right: margin },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // ── Personnel ──
    if (incident.personnel.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...headColor);
      doc.text(`Personal Involucrado (${incident.personnel.length})`, margin, y);
      doc.setTextColor(0, 0, 0);
      y += 3;

      const personnelRows = incident.personnel.map((p, idx) => [
        String(idx + 1),
        p.name,
        p.position,
        p.ci ?? '—',
      ]);

      autoTable(doc, {
        startY: y,
        head: [['#', 'Nombre', 'Cargo', 'CI']],
        body: personnelRows,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: headColor, textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: { 0: { cellWidth: 10, halign: 'center' } },
        margin: { left: margin, right: margin },
      });
    }

    // ── Save ──
    // dateTag available for future use
    // const dateTag = incident.createdAt.split('T')[0] ?? 'sin-fecha';
    const rig = rigName.replace(/\s+/g, '_');
    const filename = `${rig} - Incidencia - ${getTodayForFilename()}.pdf`;

    const result = await savePdfDialog(doc, filename);
    if (result.path) {
      toast.success('PDF exportado exitosamente');
    }
  } catch (error) {
    console.error('Error exporting incident PDF:', error);
    toast.error('Error al exportar PDF');
  }
}
