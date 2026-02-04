import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout';
import { Button, Card } from '../components/ui';
import { ArrowLeft, Edit, CheckCircle, XCircle, FileDown, FileSpreadsheet } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { 
  reportsApi, 
  crewApi, 
  bitRecordsApi, 
  drillStringApi,
  timeDistributionApi,
  mudApi,
  drillingParamsApi,
  deviationApi,
  operationsLogApi 
} from '../lib/api';
import { exportReportToPDF } from '../lib/pdfExport';
import { exportSingleReportToExcel } from '../lib/excelExport';
import type { 
  Report, 
  CrewShift, 
  BitRecord, 
  DrillString,
  TimeDistribution,
  MudRecord,
  MudAdditive,
  DrillingParameters,
  DeviationHistory,
  OperationsLog 
} from '../types/report';
import { SHIFT_LABELS } from '../types/report';

export default function ReportView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sessionToken, user } = useAuthStore();
  
  const [report, setReport] = useState<Report | null>(null);
  const [crewShifts, setCrewShifts] = useState<CrewShift[]>([]);
  const [bitRecords, setBitRecords] = useState<BitRecord[]>([]);
  const [drillString, setDrillString] = useState<DrillString | null>(null);
  const [timeDistributions, setTimeDistributions] = useState<TimeDistribution[]>([]);
  const [mudRecords, setMudRecords] = useState<MudRecord[]>([]);
  const [mudAdditives, setMudAdditives] = useState<MudAdditive[]>([]);
  const [drillingParams, setDrillingParams] = useState<DrillingParameters[]>([]);
  const [deviationHistory, setDeviationHistory] = useState<DeviationHistory[]>([]);
  const [operationsLog, setOperationsLog] = useState<OperationsLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [id]);

  const loadReport = async () => {
    if (!sessionToken || !id) return;

    setLoading(true);
    try {
      const reportData = await reportsApi.get(sessionToken, id);
      setReport(reportData);

      // Load all related entities in parallel
      const results = await Promise.all([
        crewApi.listShifts(sessionToken, id).catch(() => []),
        bitRecordsApi.list(sessionToken, id).catch(() => []),
        drillStringApi.get(sessionToken, id).catch(() => null),
        timeDistributionApi.list(sessionToken, id).catch(() => []),
        mudApi.listRecords(sessionToken, id).catch(() => []),
        mudApi.listAdditives(sessionToken, id).catch(() => []),
        drillingParamsApi.list(sessionToken, id).catch(() => []),
        deviationApi.list(sessionToken, id).catch(() => []),
        operationsLogApi.list(sessionToken, id).catch(() => []),
      ]);

      setCrewShifts(results[0] as CrewShift[]);
      setBitRecords(results[1] as BitRecord[]);
      setDrillString(results[2] as DrillString | null);
      setTimeDistributions(results[3] as TimeDistribution[]);
      setMudRecords(results[4] as MudRecord[]);
      setMudAdditives(results[5] as MudAdditive[]);
      setDrillingParams(results[6] as DrillingParameters[]);
      setDeviationHistory(results[7] as DeviationHistory[]);
      setOperationsLog(results[8] as OperationsLog[]);
    } catch (error) {
      console.error('Error loading report:', error);
      alert('Error al cargar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!sessionToken || !id) return;

    try {
      await reportsApi.approve(sessionToken, id);
      alert('Reporte aprobado exitosamente');
      loadReport();
    } catch (error) {
      console.error('Error approving report:', error);
      alert('Error al aprobar el reporte');
    }
  };

  const handleReject = async () => {
    if (!sessionToken || !id) return;

    const reason = window.prompt('Motivo del rechazo:');
    if (!reason) return;

    try {
      await reportsApi.reject(sessionToken, id, reason);
      alert('Reporte rechazado');
      loadReport();
    } catch (error) {
      console.error('Error rejecting report:', error);
      alert('Error al rechazar el reporte');
    }
  };

  const canEdit = () => {
    if (!report || !user) return false;
    if (user.role === 'admin') return true;
    if (report.status === 'draft' && report.createdBy === user.id) return true;
    return false;
  };

  const canApprove = () => {
    if (!report || !user) return false;
    if (report.status !== 'submitted') return false;
    return user.role === 'supervisor' || user.role === 'admin';
  };

  const handleExportPDF = async () => {
    if (!report) return;

    try {
      await exportReportToPDF({
        report,
        crewShifts,
        bitRecords,
        timeDistributions,
        mudRecords,
        drillingParams,
        deviationHistory,
        operationsLog,
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error al exportar PDF');
    }
  };

  const handleExportExcel = () => {
    if (!report) return;

    try {
      const filename = `DDR_${report.reportNumber}_${report.reportDate}.xlsx`;
      exportSingleReportToExcel({
        report,
        crewShifts,
        bitRecords,
        timeDistributions,
        mudRecords,
      }, filename);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Error al exportar Excel');
    }
  };

  if (loading) {
    return (
      <MainLayout title="Cargando...">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Cargando reporte...</p>
        </div>
      </MainLayout>
    );
  }

  if (!report) {
    return (
      <MainLayout title="Reporte no encontrado">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-500 mb-4">Reporte no encontrado</p>
            <Button onClick={() => navigate('/reports')}>
              Volver a Reportes
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title={`Reporte DDR #${report.reportNumber}`}
      subtitle={`Fecha: ${new Date(report.reportDate).toLocaleDateString()}`}
      headerActions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/reports')}
            icon={<ArrowLeft size={16} />}
          >
            Volver
          </Button>

          <Button
            variant="outline"
            onClick={handleExportPDF}
            icon={<FileDown size={16} />}
          >
            PDF
          </Button>

          <Button
            variant="outline"
            onClick={handleExportExcel}
            icon={<FileSpreadsheet size={16} />}
          >
            Excel
          </Button>

          {canEdit() && (
            <Button
              variant="primary"
              onClick={() => navigate(`/reports/edit/${id}`)}
              icon={<Edit size={16} />}
            >
              Editar
            </Button>
          )}

          {canApprove() && (
            <>
              <Button
                variant="primary"
                onClick={handleApprove}
                icon={<CheckCircle size={16} />}
                className="bg-green-600 hover:bg-green-700"
              >
                Aprobar
              </Button>
              <Button
                variant="outline"
                onClick={handleReject}
                icon={<XCircle size={16} />}
                className="text-red-600 hover:bg-red-50"
              >
                Rechazar
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Status Badge */}
        <div>
          {report.status === 'draft' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
              Borrador
            </span>
          )}
          {report.status === 'submitted' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
              Enviado
            </span>
          )}
          {report.status === 'approved' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
              Aprobado
            </span>
          )}
          {report.status === 'rejected' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
              Rechazado
            </span>
          )}
        </div>

        {/* Header Information */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos Generales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600">Número de Pozo</p>
                <p className="text-base font-medium text-gray-900">{report.wellNumber || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Número API</p>
                <p className="text-base font-medium text-gray-900">{report.apiNumber || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Contrato</p>
                <p className="text-base font-medium text-gray-900">{report.contract || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Contratista</p>
                <p className="text-base font-medium text-gray-900">{report.contractor || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Operador</p>
                <p className="text-base font-medium text-gray-900">{report.operator || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Campo/Distrito</p>
                <p className="text-base font-medium text-gray-900">{report.fieldDistrict || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Municipio</p>
                <p className="text-base font-medium text-gray-900">{report.municipality || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Taladro #</p>
                <p className="text-base font-medium text-gray-900">{report.rigNumber || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Compañía</p>
                <p className="text-base font-medium text-gray-900">{report.company || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Supervisor 24h</p>
                <p className="text-base font-medium text-gray-900">{report.supervisor24h || '-'}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Crew Shifts */}
        {crewShifts.length > 0 && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cuadrilla por Turno</h3>
              {crewShifts.map((shift, idx) => (
                <div key={idx} className="mb-6 last:mb-0">
                  <h4 className="font-medium text-gray-900 mb-3">
                    {SHIFT_LABELS[shift.shift]} ({shift.shiftStart} - {shift.shiftEnd})
                  </h4>
                  {shift.members && shift.members.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Posición</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">CI</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Horas</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {shift.members.map((member, mIdx) => (
                            <tr key={mIdx}>
                              <td className="px-4 py-2 text-sm text-gray-900">{member.position}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{member.ci}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{member.name}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{member.hours || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No hay miembros registrados</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Time Distribution */}
        {timeDistributions.length > 0 && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución de Tiempo</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Mañana (hrs)</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Tarde (hrs)</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Noche (hrs)</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {timeDistributions.map((td, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {td.operationCode?.name || td.operationCodeId}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-center">{td.hoursShift1}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-center">{td.hoursShift2}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-center">{td.hoursShift3}</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 text-center">
                          {td.hoursShift1 + td.hoursShift2 + td.hoursShift3}h
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}

        {/* Bit Records */}
        {bitRecords.length > 0 && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Records de Mechas</h3>
              <div className="space-y-4">
                {bitRecords.map((bit, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Mecha #{idx + 1}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Tamaño</p>
                        <p className="text-gray-900">{bit.size || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Marca</p>
                        <p className="text-gray-900">{bit.brand || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Tipo</p>
                        <p className="text-gray-900">{bit.bitType || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Serial</p>
                        <p className="text-gray-900">{bit.serialNumber || '-'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Mud Records */}
        {mudRecords.length > 0 && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Propiedades del Lodo</h3>
              <div className="space-y-4">
                {mudRecords.map((mud, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">
                      Medición #{idx + 1} - {mud.shift ? SHIFT_LABELS[mud.shift] : ''} {mud.hour ? `(${mud.hour})` : ''}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {mud.weight && (
                        <div>
                          <p className="text-gray-600">Peso (ppg)</p>
                          <p className="text-gray-900">{mud.weight}</p>
                        </div>
                      )}
                      {mud.viscosity && (
                        <div>
                          <p className="text-gray-600">Viscosidad (seg)</p>
                          <p className="text-gray-900">{mud.viscosity}</p>
                        </div>
                      )}
                      {mud.pvp && (
                        <div>
                          <p className="text-gray-600">PVP (cps)</p>
                          <p className="text-gray-900">{mud.pvp}</p>
                        </div>
                      )}
                      {mud.ph && (
                        <div>
                          <p className="text-gray-600">pH</p>
                          <p className="text-gray-900">{mud.ph}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Mud Additives */}
        {mudAdditives.length > 0 && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Aditivos del Lodo</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Turno</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mudAdditives.map((additive, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {additive.shift ? SHIFT_LABELS[additive.shift] : '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">{additive.additiveType || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{additive.quantity || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}

        {/* Drilling Parameters */}
        {drillingParams.length > 0 && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Parámetros de Perforación</h3>
              <div className="space-y-4">
                {drillingParams.map((param, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">
                      Registro #{idx + 1} - {param.shift ? SHIFT_LABELS[param.shift] : ''} 
                      {param.depthFrom && param.depthTo && ` (${param.depthFrom} - ${param.depthTo} ft)`}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      {param.rotaryRpm && (
                        <div>
                          <p className="text-gray-600">RPM</p>
                          <p className="text-gray-900">{param.rotaryRpm}</p>
                        </div>
                      )}
                      {param.bitWeight && (
                        <div>
                          <p className="text-gray-600">Peso Mecha</p>
                          <p className="text-gray-900">{param.bitWeight}</p>
                        </div>
                      )}
                      {param.pumpPressure && (
                        <div>
                          <p className="text-gray-600">Presión</p>
                          <p className="text-gray-900">{param.pumpPressure}</p>
                        </div>
                      )}
                      {param.totalGpm && (
                        <div>
                          <p className="text-gray-600">GPM</p>
                          <p className="text-gray-900">{param.totalGpm}</p>
                        </div>
                      )}
                    </div>
                    {param.lithologyNotes && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Notas:</p>
                        <p className="text-sm text-gray-900">{param.lithologyNotes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Deviation History */}
        {deviationHistory.length > 0 && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Historial de Desviación</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Profundidad (ft)</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Desviación (°)</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dirección</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">TVO (ft)</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Desp. Horizontal (ft)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {deviationHistory.map((dev, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm text-gray-900">{dev.depth || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{dev.deviation || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{dev.direction || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{dev.tvo || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{dev.horizontalDisplacement || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}

        {/* Operations Log */}
        {operationsLog.length > 0 && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Log de Operaciones</h3>
              <div className="space-y-4">
                {operationsLog.map((op, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {op.operationCode || 'Operación'} #{idx + 1}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {op.shift ? SHIFT_LABELS[op.shift] : ''} 
                          {op.timeFrom && op.timeTo && ` • ${op.timeFrom} - ${op.timeTo}`}
                          {op.duration && ` • Duración: ${op.duration}`}
                        </p>
                      </div>
                    </div>
                    {op.details && (
                      <p className="text-sm text-gray-700 mt-2">{op.details}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Drill String */}
        {drillString && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sarta de Perforación</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {drillString.size && (
                  <div>
                    <p className="text-gray-600">Tamaño</p>
                    <p className="text-gray-900">{drillString.size}</p>
                  </div>
                )}
                {drillString.weight && (
                  <div>
                    <p className="text-gray-600">Peso</p>
                    <p className="text-gray-900">{drillString.weight}</p>
                  </div>
                )}
                {drillString.grade && (
                  <div>
                    <p className="text-gray-600">Grado</p>
                    <p className="text-gray-900">{drillString.grade}</p>
                  </div>
                )}
                {drillString.connectionType && (
                  <div>
                    <p className="text-gray-600">Conexión</p>
                    <p className="text-gray-900">{drillString.connectionType}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
