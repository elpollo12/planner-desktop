import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { 
  Report, 
  CrewShift, 
  BitRecord, 
  TimeDistribution, 
  MudRecord, 
  DrillingParameters,
  DeviationHistory,
  OperationsLog 
} from '../types/report';

interface ReportData {
  report: Report;
  crewShifts?: CrewShift[];
  bitRecords?: BitRecord[];
  timeDistributions?: TimeDistribution[];
  mudRecords?: MudRecord[];
  drillingParams?: DrillingParameters[];
  deviationHistory?: DeviationHistory[];
  operationsLog?: OperationsLog[];
}

const SHIFT_LABELS: Record<string, string> = {
  morning: 'Mañana',
  afternoon: 'Tarde',
  night: 'Noche',
};

/**
 * Exporta un reporte completo a PDF
 * Compatible con jsPDF v2.x
 */
export async function exportReportToPDF(data: ReportData): Promise<void> {
  try {
    const { report } = data;
    
    // Validación básica
    if (!report) {
      throw new Error('No se proporcionó información del reporte');
    }

    const doc = new jsPDF();
    
    // Helper para obtener el último Y de autoTable de forma segura
    const getLastAutoTableY = (): number => {
      return doc.lastAutoTable?.finalY ?? 20;
    };
    
    let yPos = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    // Helper to check if we need a new page
    const checkPageBreak = (requiredSpace: number) => {
      if (yPos + requiredSpace > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
        return true;
      }
      return false;
    };

    // ========== HEADER ==========
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DIARIO DE OPERACIONES (DDR)', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Reporte #${report.reportNumber || 'N/A'} | ${new Date(report.reportDate).toLocaleDateString()}`, 
      pageWidth / 2, 
      25, 
      { align: 'center' }
    );
    
    yPos = 45;
    doc.setTextColor(0, 0, 0);

    // ========== GENERAL INFORMATION ==========
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(30, 58, 95);
    doc.setTextColor(255, 255, 255);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
    doc.text('INFORMACIÓN GENERAL', margin + 5, yPos + 6);
    
    yPos += 12;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const info = [
      ['Número de Pozo:', report.wellNumber || '-', 'Número API:', report.apiNumber || '-'],
      ['Contrato:', report.contract || '-', 'Contratista:', report.contractor || '-'],
      ['Operador:', report.operator || '-', 'Campo/Distrito:', report.fieldDistrict || '-'],
      ['Municipio:', report.municipality || '-', 'Taladro #:', report.rigNumber || '-'],
      ['Compañía:', report.company || '-', 'Supervisor 24h:', report.supervisor24h || '-'],
    ];

    info.forEach(row => {
      checkPageBreak(8);
      doc.setFont('helvetica', 'bold');
      doc.text(row[0], margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(row[1], margin + 45, yPos);
      
      doc.setFont('helvetica', 'bold');
      doc.text(row[2], pageWidth / 2 + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(row[3], pageWidth / 2 + 50, yPos);
      
      yPos += 7;
    });

    yPos += 5;

    // ========== CREW SHIFTS ==========
    if (data.crewShifts && data.crewShifts.length > 0) {
      checkPageBreak(40);
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(30, 58, 95);
      doc.setTextColor(255, 255, 255);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
      doc.text('CUADRILLA POR TURNO', margin + 5, yPos + 6);
      yPos += 12;
      doc.setTextColor(0, 0, 0);

      data.crewShifts.forEach(shift => {
        checkPageBreak(30);
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(
          `${SHIFT_LABELS[shift.shift] || shift.shift} (${shift.shiftStart || 'N/A'} - ${shift.shiftEnd || 'N/A'})`, 
          margin, 
          yPos
        );
        yPos += 7;

        if (shift.members && shift.members.length > 0) {
          const crewData = shift.members.map(m => [
            m.position || '-',
            m.ci || '-',
            m.name || '-',
            m.hours?.toString() || '-'
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [['Posición', 'CI', 'Nombre', 'Horas']],
            body: crewData,
            theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
            styles: { fontSize: 9 },
            margin: { left: margin, right: margin },
          });

          yPos = getLastAutoTableY() + 10;
        } else {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'italic');
          doc.text('Sin miembros registrados', margin + 5, yPos);
          yPos += 10;
        }
      });
    }

    // ========== TIME DISTRIBUTION ==========
    if (data.timeDistributions && data.timeDistributions.length > 0) {
      checkPageBreak(40);
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(30, 58, 95);
      doc.setTextColor(255, 255, 255);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
      doc.text('DISTRIBUCIÓN DE TIEMPO', margin + 5, yPos + 6);
      yPos += 12;
      doc.setTextColor(0, 0, 0);

      const timeData = data.timeDistributions.map(td => {
        const s1 = td.hoursShift1 || 0;
        const s2 = td.hoursShift2 || 0;
        const s3 = td.hoursShift3 || 0;
        return [
          td.operationCode?.name || td.operationCodeId || '-',
          s1.toString(),
          s2.toString(),
          s3.toString(),
          (s1 + s2 + s3).toString() + 'h'
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [['Operación', 'Mañana', 'Tarde', 'Noche', 'Total']],
        body: timeData,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 9, halign: 'center' },
        columnStyles: {
          0: { halign: 'left' },
          4: { fontStyle: 'bold' }
        },
        margin: { left: margin, right: margin },
      });

      yPos = getLastAutoTableY() + 10;
    }

    // ========== BIT RECORDS ==========
    if (data.bitRecords && data.bitRecords.length > 0) {
      checkPageBreak(40);
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(30, 58, 95);
      doc.setTextColor(255, 255, 255);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
      doc.text('RECORD DE MECHAS', margin + 5, yPos + 6);
      yPos += 12;
      doc.setTextColor(0, 0, 0);

      data.bitRecords.forEach((bit, idx) => {
        checkPageBreak(35);
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Mecha #${idx + 1}`, margin, yPos);
        yPos += 7;

        const bitData = [
          ['Tamaño', bit.size || '-', 'Marca', bit.brand || '-'],
          ['Tipo', bit.bitType || '-', 'Serial', bit.serialNumber || '-'],
          ['Prof. Sacada', bit.depthOut || '-', 'Prof. Metida', bit.depthIn || '-'],
          ['Perforado', bit.footage || '-', 'Horas', bit.hoursTotal?.toString() || '-'],
        ];

        autoTable(doc, {
          startY: yPos,
          body: bitData,
          theme: 'grid',
          styles: { fontSize: 9 },
          columnStyles: {
            0: { fontStyle: 'bold', fillColor: [250, 250, 250] },
            2: { fontStyle: 'bold', fillColor: [250, 250, 250] }
          },
          margin: { left: margin, right: margin },
        });

        yPos = getLastAutoTableY() + 10;
      });
    }

    // ========== MUD RECORDS ==========
    if (data.mudRecords && data.mudRecords.length > 0) {
      checkPageBreak(40);
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(30, 58, 95);
      doc.setTextColor(255, 255, 255);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
      doc.text('PROPIEDADES DEL LODO', margin + 5, yPos + 6);
      yPos += 12;
      doc.setTextColor(0, 0, 0);

      const mudData = data.mudRecords.map(mud => [
        mud.shift ? (SHIFT_LABELS[mud.shift] || mud.shift) : '-',
        mud.hour || '-',
        mud.weight || '-',
        mud.viscosity || '-',
        mud.pvp || '-',
        mud.ph || '-'
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Turno', 'Hora', 'Peso', 'Visc', 'PVP', 'pH']],
        body: mudData,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 9 },
        margin: { left: margin, right: margin },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // ========== FOOTER ON ALL PAGES ==========
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Página ${i} de ${pageCount} | Generado: ${new Date().toLocaleString()}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // ========== SAVE PDF ==========
    const filename = `DDR_${report.reportNumber || 'reporte'}_${report.reportDate}.pdf`;
    doc.save(filename);
    
  } catch (error) {
    console.error('❌ Error al generar PDF:', error);
    throw new Error(`Error al generar PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}
