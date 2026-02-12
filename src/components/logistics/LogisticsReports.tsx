import { useState } from 'react';
import { Button, Card } from '../ui';
import { FileText, Sheet, Search } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { logisticsReportsApi } from '../../lib/api';
import { toast } from 'react-toastify';
import type { LogisticsReport } from '../../types/logistics';

export function LogisticsReports() {
  const { sessionToken, user } = useAuthStore();
  const canGenerate = user?.role === 'supervisor' || user?.role === 'admin';

  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [periodStart, setPeriodStart] = useState(thirtyDaysAgo);
  const [periodEnd, setPeriodEnd] = useState(today);
  const [report, setReport] = useState<LogisticsReport | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!sessionToken || !canGenerate) return;
    setLoading(true);
    try {
      const data = await logisticsReportsApi.getReport(sessionToken, periodStart, periodEnd);
      setReport(data);
    } catch (error: any) { toast.error(error?.toString() || 'Error al generar reporte'); }
    finally { setLoading(false); }
  };

  if (!canGenerate) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <p>Solo supervisores y administradores pueden generar reportes</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Reportes de Logística</h2>
        <div className="flex gap-2">
          <Button variant="outline" className="hover:bg-red-500 hover:border-red-400!" size="sm" icon={<FileText size={18} />} iconPosition="right">Pdf</Button>
          <Button variant="outline" className="hover:bg-green-600 hover:border-green-600!" size="sm" icon={<Sheet size={18} />} iconPosition="right">Excel</Button>
        </div>
      </div>

      <Card className='flex justify-between items-center-safe'>
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Desde</label>
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hasta</label>
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
          </div>
        </div>
        <div>
          <Button
            variant="primary"
            size="md" icon={<Search size={16} />}
            onClick={handleGenerate} disabled={loading}
            className=''
          >
            {loading ? 'Generando...' : 'Generar Reporte'}
          </Button>
        </div>
      </Card>

      {report && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">Botellones de Agua</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Entradas:</span><span className="font-medium text-green-600">{report.waterBottlesSummary.totalEntries}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Salidas:</span><span className="font-medium text-red-600">{report.waterBottlesSummary.totalExits}</span></div>
              <div className="flex justify-between border-t pt-2"><span className="text-gray-700 dark:text-gray-300 font-medium">Neto:</span><span className="font-bold">{report.waterBottlesSummary.net}</span></div>
            </div>
          </Card>

          <Card>
            <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">Combustible</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Entradas:</span><span className="font-medium text-green-600">{report.fuelSummary.totalEntries.toFixed(2)} L</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Salidas:</span><span className="font-medium text-red-600">{report.fuelSummary.totalExits.toFixed(2)} L</span></div>
              <div className="flex justify-between border-t pt-2"><span className="text-gray-700 dark:text-gray-300 font-medium">Neto:</span><span className="font-bold">{report.fuelSummary.net.toFixed(2)} L</span></div>
            </div>
          </Card>

          <Card>
            <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">Vacuum / Cisterna</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Total acciones:</span><span className="font-bold">{report.vacuumSummary.totalActions}</span></div>
            </div>
          </Card>

          <Card>
            <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">Solicitudes</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Total:</span><span className="font-medium">{report.requestsSummary.total}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Solicitadas:</span><span className="font-medium text-blue-600">{report.requestsSummary.requested}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">En espera:</span><span className="font-medium text-yellow-600">{report.requestsSummary.pending}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Aprobadas:</span><span className="font-medium text-green-600">{report.requestsSummary.approved}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Rechazadas:</span><span className="font-medium text-red-600">{report.requestsSummary.rejected}</span></div>
            </div>
          </Card>

          {report.materialsSummary.length > 0 && (
            <Card className="md:col-span-2">
              <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">Materiales</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unidad</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Entradas</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Salidas</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Neto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {report.materialsSummary.map((ms) => (
                      <tr key={ms.materialId}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{ms.materialName}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{ms.unit}</td>
                        <td className="px-4 py-2 text-sm text-right text-green-600">{ms.totalEntries}</td>
                        <td className="px-4 py-2 text-sm text-right text-red-600">{ms.totalExits}</td>
                        <td className="px-4 py-2 text-sm text-right font-bold">{ms.net}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
