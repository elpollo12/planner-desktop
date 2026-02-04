import * as XLSX from 'xlsx';
import type { Report } from '../types/report';

/**
 * Export reports list to Excel
 */
export function exportReportsToExcel(reports: Report[], filename: string = 'reportes.xlsx'): void {
  // Prepare data
  const data = reports.map(report => ({
    'Número Reporte': report.reportNumber,
    'Fecha': new Date(report.reportDate).toLocaleDateString(),
    'Pozo': report.wellNumber || '-',
    'API': report.apiNumber || '-',
    'Contrato': report.contract || '-',
    'Contratista': report.contractor || '-',
    'Operador': report.operator || '-',
    'Campo/Distrito': report.fieldDistrict || '-',
    'Municipio': report.municipality || '-',
    'Taladro': report.rigNumber || '-',
    'Compañía': report.company || '-',
    'Supervisor': report.supervisor24h || '-',
    'Estado': getStatusLabel(report.status),
    'Creado Por': report.createdBy,
    'Fecha Creación': new Date(report.createdAt).toLocaleString(),
  }));

  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, // Número Reporte
    { wch: 12 }, // Fecha
    { wch: 15 }, // Pozo
    { wch: 15 }, // API
    { wch: 15 }, // Contrato
    { wch: 20 }, // Contratista
    { wch: 20 }, // Operador
    { wch: 20 }, // Campo/Distrito
    { wch: 15 }, // Municipio
    { wch: 12 }, // Taladro
    { wch: 20 }, // Compañía
    { wch: 20 }, // Supervisor
    { wch: 12 }, // Estado
    { wch: 15 }, // Creado Por
    { wch: 18 }, // Fecha Creación
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Reportes');

  // Generate and download
  XLSX.writeFile(wb, filename);
}

/**
 * Export single report with all details to Excel
 */
export function exportSingleReportToExcel(data: any, filename: string): void {
  const { report, crewShifts, bitRecords, timeDistributions, mudRecords } = data;
  
  const wb = XLSX.utils.book_new();

  // Sheet 1: General Info
  const generalData = [
    ['REPORTE DIARIO DE OPERACIONES'],
    [],
    ['Número de Reporte:', report.reportNumber],
    ['Fecha:', new Date(report.reportDate).toLocaleDateString()],
    ['Estado:', getStatusLabel(report.status)],
    [],
    ['INFORMACIÓN GENERAL'],
    ['Número de Pozo:', report.wellNumber || '-'],
    ['Número API:', report.apiNumber || '-'],
    ['Contrato:', report.contract || '-'],
    ['Contratista:', report.contractor || '-'],
    ['Operador:', report.operator || '-'],
    ['Campo/Distrito:', report.fieldDistrict || '-'],
    ['Municipio:', report.municipality || '-'],
    ['Taladro #:', report.rigNumber || '-'],
    ['Compañía:', report.company || '-'],
    ['Supervisor 24h:', report.supervisor24h || '-'],
  ];
  
  const wsGeneral = XLSX.utils.aoa_to_sheet(generalData);
  wsGeneral['!cols'] = [{ wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsGeneral, 'General');

  // Sheet 2: Crew
  if (crewShifts && crewShifts.length > 0) {
    const crewData: any[] = [['Turno', 'Horario', 'Posición', 'CI', 'Nombre', 'Horas']];
    
    crewShifts.forEach((shift: any) => {
      const shiftLabel = getShiftLabel(shift.shift);
      const horario = `${shift.shiftStart} - ${shift.shiftEnd}`;
      
      if (shift.members && shift.members.length > 0) {
        shift.members.forEach((member: any) => {
          crewData.push([
            shiftLabel,
            horario,
            member.position,
            member.ci || '-',
            member.name || '-',
            member.hours || '-'
          ]);
        });
      }
    });

    const wsCrew = XLSX.utils.aoa_to_sheet(crewData);
    wsCrew['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, wsCrew, 'Cuadrilla');
  }

  // Sheet 3: Time Distribution
  if (timeDistributions && timeDistributions.length > 0) {
    const timeData: any[] = [['Código Operación', 'Mañana (hrs)', 'Tarde (hrs)', 'Noche (hrs)', 'Total (hrs)']];
    
    timeDistributions.forEach((td: any) => {
      timeData.push([
        td.operationCode?.name || td.operationCodeId,
        td.hoursShift1,
        td.hoursShift2,
        td.hoursShift3,
        td.hoursShift1 + td.hoursShift2 + td.hoursShift3
      ]);
    });

    const wsTime = XLSX.utils.aoa_to_sheet(timeData);
    wsTime['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsTime, 'Distribución Tiempo');
  }

  // Sheet 4: Bit Records
  if (bitRecords && bitRecords.length > 0) {
    const bitData: any[] = [['Mecha #', 'Tamaño', 'Marca', 'Tipo', 'Serial', 'Prof. Sacada', 'Prof. Metida', 'Perforado', 'Horas']];
    
    bitRecords.forEach((bit: any, idx: number) => {
      bitData.push([
        `#${idx + 1}`,
        bit.size || '-',
        bit.brand || '-',
        bit.bitType || '-',
        bit.serialNumber || '-',
        bit.depthOut || '-',
        bit.depthIn || '-',
        bit.footage || '-',
        bit.hoursTotal || '-'
      ]);
    });

    const wsBits = XLSX.utils.aoa_to_sheet(bitData);
    wsBits['!cols'] = [{ wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsBits, 'Mechas');
  }

  // Sheet 5: Mud Records
  if (mudRecords && mudRecords.length > 0) {
    const mudData: any[] = [['Turno', 'Hora', 'Peso (ppg)', 'Viscosidad', 'PVP', 'Gels', 'Filtrado', 'pH', 'Sólidos']];
    
    mudRecords.forEach((mud: any) => {
      mudData.push([
        mud.shift ? getShiftLabel(mud.shift) : '-',
        mud.hour || '-',
        mud.weight || '-',
        mud.viscosity || '-',
        mud.pvp || '-',
        mud.gels || '-',
        mud.filtrate || '-',
        mud.ph || '-',
        mud.solids || '-'
      ]);
    });

    const wsMud = XLSX.utils.aoa_to_sheet(mudData);
    wsMud['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsMud, 'Lodo');
  }

  // Save file
  XLSX.writeFile(wb, filename);
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Borrador',
    submitted: 'Enviado',
    approved: 'Aprobado',
    rejected: 'Rechazado',
  };
  return labels[status] || status;
}

function getShiftLabel(shift: string): string {
  const labels: Record<string, string> = {
    morning: 'Mañana',
    afternoon: 'Tarde',
    night: 'Noche',
  };
  return labels[shift] || shift;
}
