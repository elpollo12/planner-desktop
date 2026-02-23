import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { savePdfDialog } from './logisticsSaveDialog';
import { INCIDENT_TYPE_LABELS } from '../types/incident';
import type { IncidentType, IncidentWithPersonnel } from '../types/incident';
import { toast } from 'react-toastify';

interface ExportIncidentPdfOptions {
  incident: IncidentWithPersonnel;
  rigName: string;
}

function formatDateTimePdf(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  } catch {
    return isoStr;
  }
}

export async function exportIncidentPdf({ incident, rigName }: ExportIncidentPdfOptions) {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = margin;

    // ── Title ──
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DE INCIDENCIA', pageWidth / 2, y, { align: 'center' });
    y += 10;

    // ── Header info ──
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const typeLabel = INCIDENT_TYPE_LABELS[incident.incidentType as IncidentType] ?? incident.incidentType;
    const dateStr = formatDateTimePdf(incident.createdAt);
    const createdBy = incident.createdByName ?? '—';

    const headerData = [
      ['Taladro', rigName],
      ['Tipo de Incidencia', typeLabel],
      ['Reportado por', createdBy],
      ['Fecha', dateStr],
    ];

    autoTable(doc, {
      startY: y,
      body: headerData,
      theme: 'grid',
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 45 },
        1: { cellWidth: undefined },
      },
      styles: { fontSize: 10, cellPadding: 3 },
      margin: { left: margin, right: margin },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

    // ── Description ──
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Descripción', margin, y);
    y += 5;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(incident.description, pageWidth - margin * 2);
    doc.text(descLines, margin, y);
    y += descLines.length * 4.5 + 8;

    // ── Personnel ──
    if (incident.personnel.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Personal Involucrado', margin, y);
      y += 2;

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
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 2.5 },
        headStyles: { fillColor: [59, 130, 246] },
        columnStyles: { 0: { cellWidth: 10 } },
        margin: { left: margin, right: margin },
      });
    }

    // ── Save ──
    const dateTag = incident.createdAt.split('T')[0] ?? 'sin-fecha';
    const filename = `incidencia_${rigName.replace(/\s+/g, '_')}_${dateTag}.pdf`;

    const result = await savePdfDialog(doc, filename);
    if (result.path) {
      toast.success('PDF exportado exitosamente');
    }
  } catch (error) {
    console.error('Error exporting incident PDF:', error);
    toast.error('Error al exportar PDF');
  }
}
