import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface RigDebugInfo {
  id: string;
  name: string;
  operator: string;
  active: boolean;
  area_id: string | null;
}

interface SyncDebugInfo {
  total_rigs: number;
  active_rigs: number;
  inactive_rigs: number;
  total_reports: number;
  sync_enabled: boolean;
}

interface TursoRigInfo {
  id: string;
  name: string;
  operator: string;
  power: string;
  active: boolean;
}

interface RigWithTimestamp {
  id: string;
  name: string;
  updated_at: string;
}

interface SyncStateDebug {
  last_pull_at: string | null;
  last_push_at: string | null;
  local_rigs_with_timestamps: RigWithTimestamp[];
  turso_rigs_with_timestamps: RigWithTimestamp[];
}

interface SyncPullTestResult {
  query_executed: string;
  rows_returned: number;
  sample_data: string[];
  error: string | null;
}

interface FullSyncSimulationResult {
  step1_query_success: boolean;
  step1_rows_from_turso: number;
  step2_conversion_success: boolean;
  step2_converted_rows: number;
  step3_write_success: boolean;
  step3_rows_written: number;
  errors: string[];
  detailed_log: string[];
}

export default function RigsDiagnostic() {
  const [syncInfo, setSyncInfo] = useState<SyncDebugInfo | null>(null);
  const [allRigs, setAllRigs] = useState<RigDebugInfo[]>([]);
  const [tursoRigs, setTursoRigs] = useState<TursoRigInfo[]>([]);
  const [syncState, setSyncState] = useState<SyncStateDebug | null>(null);
  const [syncPullTest, setSyncPullTest] = useState<SyncPullTestResult | null>(null);
  const [fullSyncSim, setFullSyncSim] = useState<FullSyncSimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTurso, setLoadingTurso] = useState(false);
  const [loadingSyncState, setLoadingSyncState] = useState(false);
  const [loadingSyncPullTest, setLoadingSyncPullTest] = useState(false);
  const [loadingFullSyncSim, setLoadingFullSyncSim] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostic = async () => {
    setLoading(true);
    setError(null);

    try {
      const [info, rigs] = await Promise.all([
        invoke<SyncDebugInfo>('debug_get_sync_info'),
        invoke<RigDebugInfo[]>('debug_list_all_rigs'),
      ]);

      setSyncInfo(info);
      setAllRigs(rigs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error en diagnóstico:', err);
    } finally {
      setLoading(false);
    }
  };

  const queryTursoRigs = async () => {
    setLoadingTurso(true);
    setError(null);

    try {
      const rigs = await invoke<TursoRigInfo[]>('debug_query_turso_rigs');
      setTursoRigs(rigs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error consultando Turso');
      console.error('Error consultando Turso:', err);
    } finally {
      setLoadingTurso(false);
    }
  };

  const analyzeSyncState = async () => {
    setLoadingSyncState(true);
    setError(null);

    try {
      const state = await invoke<SyncStateDebug>('debug_sync_state');
      setSyncState(state);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error analizando estado de sincronización');
      console.error('Error analizando sync state:', err);
    } finally {
      setLoadingSyncState(false);
    }
  };

  const testSyncPull = async () => {
    setLoadingSyncPullTest(true);
    setError(null);

    try {
      const result = await invoke<SyncPullTestResult>('debug_test_sync_pull');
      setSyncPullTest(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error probando sync pull');
      console.error('Error testing sync pull:', err);
    } finally {
      setLoadingSyncPullTest(false);
    }
  };

  const simulateFullSync = async () => {
    setLoadingFullSyncSim(true);
    setError(null);

    try {
      const result = await invoke<FullSyncSimulationResult>('debug_simulate_full_sync');
      setFullSyncSim(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error simulando sync completo');
      console.error('Error simulating full sync:', err);
    } finally {
      setLoadingFullSyncSim(false);
    }
  };

  const inactiveRigs = allRigs.filter(r => !r.active);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Diagnóstico de Taladros
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Verifica el estado de los taladros en la base de datos
          </p>
        </div>
        <Button
          variant="primary"
          onClick={runDiagnostic}
          loading={loading}
        >
          {syncInfo ? 'Actualizar' : 'Ejecutar Diagnóstico'}
        </Button>
      </div>

      {error && (
        <Card className="bg-red-50 border-red-200">
          <div className="p-4">
            <p className="text-red-800 font-semibold">❌ Error</p>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </Card>
      )}

      {syncInfo && (
        <>
          {/* Resumen General */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                📊 Resumen General
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Taladros</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {syncInfo.total_rigs}
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Activos</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {syncInfo.active_rigs}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Inactivos</p>
                  <p className="text-3xl font-bold text-gray-600 dark:text-gray-400">
                    {syncInfo.inactive_rigs}
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Reportes</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {syncInfo.total_reports}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Lista de Taladros */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                📋 Lista Completa de Taladros
              </h3>
              {allRigs.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No hay taladros registrados en la base de datos
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Nombre
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Operador
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Tiene Área
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {allRigs.map((rig) => (
                        <tr key={rig.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {rig.name}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                            {rig.operator}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {rig.active ? (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                ✅ Activo
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                ❌ Inactivo
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                            {rig.area_id ? 'Sí' : 'No'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>

          {/* Análisis y Recomendaciones */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                🔍 Análisis y Recomendaciones
              </h3>

              {syncInfo.total_rigs === 0 && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-2xl">❌</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700 font-semibold">
                        No hay taladros en la base de datos
                      </p>
                      <p className="text-sm text-red-600 mt-1">
                        Acción: Crea taladros manualmente o sincroniza desde Turso Cloud
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {syncInfo.total_rigs === 1 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-2xl">⚠️</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700 font-semibold">
                        Solo hay 1 taladro en la base de datos local
                      </p>
                      <p className="text-sm text-yellow-600 mt-1">
                        Si tienes más taladros en Turso Cloud, ve a Admin → Sincronización → "Sincronización Completa"
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {inactiveRigs.length > 0 && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-2xl">💡</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700 font-semibold">
                        Hay {inactiveRigs.length} taladro(s) inactivo(s)
                      </p>
                      <p className="text-sm text-blue-600 mt-1">
                        Taladros inactivos: {inactiveRigs.map(r => r.name).join(', ')}
                      </p>
                      <p className="text-sm text-blue-600 mt-1">
                        Para verlos en la lista: Admin → Taladros → marca "Incluir taladros inactivos"
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {syncInfo.total_rigs > 1 && inactiveRigs.length === 0 && (
                <div className="bg-green-50 border-l-4 border-green-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-2xl">✅</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-700 font-semibold">
                        Todo está en orden
                      </p>
                      <p className="text-sm text-green-600 mt-1">
                        Tienes {syncInfo.total_rigs} taladros activos correctamente configurados
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Análisis de Estado de Sincronización */}
          <Card>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  🔍 Análisis de Timestamps (Diagnóstico Avanzado)
                </h3>
                <Button
                  variant="primary"
                  onClick={analyzeSyncState}
                  loading={loadingSyncState}
                >
                  Analizar Timestamps
                </Button>
              </div>

              {syncState && (
                <>
                  <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Estado de Sincronización:
                    </h4>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-700 dark:text-gray-300">
                        <strong>Última extracción (pull):</strong>{' '}
                        {syncState.last_pull_at || 'Nunca'}
                      </p>
                      <p className="text-gray-700 dark:text-gray-300">
                        <strong>Último envío (push):</strong>{' '}
                        {syncState.last_push_at || 'Nunca'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Local Database */}
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        💾 Base de Datos Local ({syncState.local_rigs_with_timestamps.length})
                      </h4>
                      <div className="space-y-2">
                        {syncState.local_rigs_with_timestamps.map((rig) => (
                          <div key={rig.id} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                            <p className="font-medium text-gray-900 dark:text-gray-100">{rig.name}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Actualizado: {new Date(rig.updated_at).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Turso Cloud */}
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        ☁️ Turso Cloud ({syncState.turso_rigs_with_timestamps.length})
                      </h4>
                      <div className="space-y-2">
                        {syncState.turso_rigs_with_timestamps.map((rig) => {
                          const existsInLocal = syncState.local_rigs_with_timestamps.some(
                            (localRig) => localRig.id === rig.id
                          );
                          const isOlderThanLastPull =
                            syncState.last_pull_at && rig.updated_at < syncState.last_pull_at;

                          return (
                            <div
                              key={rig.id}
                              className={`p-3 rounded ${
                                !existsInLocal
                                  ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-300'
                                  : 'bg-green-50 dark:bg-green-900/20'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                  {rig.name}
                                </p>
                                {!existsInLocal && (
                                  <span className="text-xs font-semibold text-red-600">
                                    ❌ FALTA
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Actualizado: {new Date(rig.updated_at).toLocaleString()}
                              </p>
                              {!existsInLocal && isOlderThanLastPull && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                  ⚠️ Este taladro se actualizó ANTES del último pull, por eso no se sincroniza
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Diagnosis */}
                  <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 dark:bg-yellow-900/20">
                    <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                      🔍 Diagnóstico:
                    </p>
                    <div className="text-sm text-yellow-700 dark:text-yellow-200 mt-2 space-y-1">
                      {syncState.turso_rigs_with_timestamps.some(
                        (rig) => !syncState.local_rigs_with_timestamps.some((lr) => lr.id === rig.id)
                      ) ? (
                        <>
                          <p>
                            ❌ Hay taladros en Turso Cloud que NO están en tu base de datos local.
                          </p>
                          {syncState.last_pull_at && (
                            <p>
                              🕐 El último pull fue: {new Date(syncState.last_pull_at).toLocaleString()}
                            </p>
                          )}
                          <p className="font-semibold mt-2">
                            💡 Solución: El sync incremental solo trae registros actualizados DESPUÉS del último pull.
                            Si los taladros faltantes fueron creados/actualizados antes del último pull,
                            necesitas hacer una "Sincronización Completa" desde Admin → Sincronización.
                          </p>
                        </>
                      ) : (
                        <p>✅ Todos los taladros de Turso Cloud están sincronizados localmente.</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Test Sync Pull Query */}
          <Card>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  🧪 Prueba de Consulta Sync Pull
                </h3>
                <Button
                  variant="primary"
                  onClick={testSyncPull}
                  loading={loadingSyncPullTest}
                >
                  Probar Consulta
                </Button>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Ejecuta la MISMA consulta que usa el sistema de sincronización para obtener taladros de Turso.
              </p>

              {syncPullTest && (
                <>
                  {syncPullTest.error ? (
                    <div className="p-4 bg-red-50 border-l-4 border-red-400 dark:bg-red-900/20">
                      <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                        ❌ Error en la consulta:
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                        {syncPullTest.error}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                          Resultado de la Consulta:
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p className="text-gray-700 dark:text-gray-300">
                            <strong>Consulta ejecutada:</strong> <code className="text-xs bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">{syncPullTest.query_executed}</code>
                          </p>
                          <p className="text-gray-700 dark:text-gray-300">
                            <strong>Registros devueltos:</strong>{' '}
                            <span className={`font-bold ${syncPullTest.rows_returned > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {syncPullTest.rows_returned}
                            </span>
                          </p>
                        </div>
                      </div>

                      {syncPullTest.sample_data.length > 0 && (
                        <div className="p-4 bg-blue-50 border-l-4 border-blue-400 dark:bg-blue-900/20">
                          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
                            📋 Muestra de Datos (primeros 5):
                          </p>
                          <ul className="text-sm text-blue-700 dark:text-blue-200 space-y-1">
                            {syncPullTest.sample_data.map((item, idx) => (
                              <li key={idx}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 dark:bg-yellow-900/20">
                        <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                          💡 Análisis:
                        </p>
                        <div className="text-sm text-yellow-700 dark:text-yellow-200 mt-2">
                          {syncPullTest.rows_returned === 0 ? (
                            <p>
                              ⚠️ La consulta no devolvió ningún registro. Esto explica por qué el sync no está trayendo datos.
                              Posibles causas: tabla no existe en Turso, tabla vacía, o problema de permisos.
                            </p>
                          ) : syncPullTest.rows_returned < (syncInfo?.total_rigs || 0) ? (
                            <p>
                              ⚠️ La consulta devolvió menos registros de los esperados. Algunos taladros pueden no estar en Turso.
                            </p>
                          ) : (
                            <p>
                              ✅ La consulta funciona correctamente y devuelve {syncPullTest.rows_returned} registros.
                              Si el sync aún no funciona, el problema está en la escritura a la base de datos local.
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </Card>

          {/* Full Sync Simulation */}
          <Card>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  🔬 Simulación Completa de Sincronización
                </h3>
                <Button
                  variant="primary"
                  onClick={simulateFullSync}
                  loading={loadingFullSyncSim}
                >
                  Simular Sync Completo
                </Button>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Ejecuta TODOS los pasos del proceso de sincronización con logging detallado.
                Esto mostrará EXACTAMENTE dónde está fallando el sync.
              </p>

              {fullSyncSim && (
                <>
                  {/* Resumen de Pasos */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Paso 1 */}
                    <div className={`p-4 rounded-lg border-2 ${
                      fullSyncSim.step1_query_success
                        ? 'bg-green-50 border-green-300 dark:bg-green-900/20'
                        : 'bg-red-50 border-red-300 dark:bg-red-900/20'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                          Paso 1: Consulta Turso
                        </h4>
                        <span className="text-2xl">
                          {fullSyncSim.step1_query_success ? '✅' : '❌'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Filas: <strong>{fullSyncSim.step1_rows_from_turso}</strong>
                      </p>
                    </div>

                    {/* Paso 2 */}
                    <div className={`p-4 rounded-lg border-2 ${
                      fullSyncSim.step2_conversion_success
                        ? 'bg-green-50 border-green-300 dark:bg-green-900/20'
                        : 'bg-red-50 border-red-300 dark:bg-red-900/20'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                          Paso 2: Conversión
                        </h4>
                        <span className="text-2xl">
                          {fullSyncSim.step2_conversion_success ? '✅' : '❌'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Convertidas: <strong>{fullSyncSim.step2_converted_rows}</strong>
                      </p>
                    </div>

                    {/* Paso 3 */}
                    <div className={`p-4 rounded-lg border-2 ${
                      fullSyncSim.step3_write_success
                        ? 'bg-green-50 border-green-300 dark:bg-green-900/20'
                        : 'bg-red-50 border-red-300 dark:bg-red-900/20'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                          Paso 3: Escritura
                        </h4>
                        <span className="text-2xl">
                          {fullSyncSim.step3_write_success ? '✅' : '❌'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Escritas: <strong>{fullSyncSim.step3_rows_written}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Errores */}
                  {fullSyncSim.errors.length > 0 && (
                    <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 dark:bg-red-900/20">
                      <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
                        ❌ Errores Encontrados ({fullSyncSim.errors.length}):
                      </p>
                      <ul className="text-sm text-red-700 dark:text-red-200 space-y-1">
                        {fullSyncSim.errors.map((error, idx) => (
                          <li key={idx}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Log Detallado */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      📝 Log Detallado:
                    </h4>
                    <div className="text-sm font-mono text-gray-700 dark:text-gray-300 space-y-1 max-h-96 overflow-y-auto">
                      {fullSyncSim.detailed_log.map((log, idx) => (
                        <div key={idx} className="whitespace-pre-wrap">
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Diagnóstico Final */}
                  <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 dark:bg-blue-900/20">
                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                      🔍 Diagnóstico Final:
                    </p>
                    <div className="text-sm text-blue-700 dark:text-blue-200 mt-2">
                      {fullSyncSim.errors.length === 0 && fullSyncSim.step3_rows_written > 0 ? (
                        <p>
                          ✅ ¡La simulación fue exitosa! Se escribieron {fullSyncSim.step3_rows_written} registros.
                          Si el sync real no funciona, el problema puede estar en la actualización de timestamps
                          o en el commit de la transacción.
                        </p>
                      ) : fullSyncSim.step1_rows_from_turso === 0 ? (
                        <p>
                          ⚠️ Turso no devolvió ningún registro. Verifica que los datos existan en Turso Cloud.
                        </p>
                      ) : fullSyncSim.step3_rows_written === 0 && fullSyncSim.step1_rows_from_turso > 0 ? (
                        <p>
                          ❌ Los datos se consultaron correctamente de Turso ({fullSyncSim.step1_rows_from_turso} filas),
                          pero NO se escribieron a la base de datos local. Este es el problema principal.
                          Revisa los errores arriba para más detalles.
                        </p>
                      ) : (
                        <p>
                          ❌ Hubo un problema durante la sincronización. Revisa los errores y el log detallado.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Consultar Turso Cloud */}
          <Card>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  ☁️ Datos en Turso Cloud
                </h3>
                <Button
                  variant="primary"
                  onClick={queryTursoRigs}
                  loading={loadingTurso}
                >
                  Consultar Turso
                </Button>
              </div>

              {tursoRigs.length > 0 && (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Taladros encontrados en Turso Cloud: <strong>{tursoRigs.length}</strong>
                  </p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Nombre
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Operador
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Potencia
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Estado
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {tursoRigs.map((rig) => (
                          <tr key={rig.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {rig.name}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                              {rig.operator}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                              {rig.power}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {rig.active ? (
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                  ✅ Activo
                                </span>
                              ) : (
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                  ❌ Inactivo
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Comparación */}
                  {syncInfo && (
                    <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 dark:bg-blue-900/20">
                      <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                        📊 Comparación:
                      </p>
                      <ul className="text-sm text-blue-700 dark:text-blue-200 mt-2 space-y-1">
                        <li>• En Turso Cloud: <strong>{tursoRigs.length}</strong> taladros</li>
                        <li>• En Base de Datos Local: <strong>{syncInfo.total_rigs}</strong> taladros</li>
                        {tursoRigs.length !== syncInfo.total_rigs && (
                          <li className="text-red-600 dark:text-red-400 font-semibold">
                            ⚠️ ¡Diferencia detectada! Los datos no están sincronizados.
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
