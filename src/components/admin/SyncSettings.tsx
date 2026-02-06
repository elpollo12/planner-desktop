import { useState, useEffect } from 'react';
import { Card, Button } from '../ui';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Upload,
  Download,
  CheckCircle,
  XCircle,
  Database,
  Wifi,
  WifiOff,
  Trash2,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { syncApi } from '../../lib/api';
import type { SyncStatus, SyncResult } from '../../types/sync';

const INTERVAL_OPTIONS = [
  { value: 0, label: 'Desactivado' },
  { value: 1, label: '1 minuto' },
  { value: 5, label: '5 minutos' },
  { value: 10, label: '10 minutos' },
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 60, label: '1 hora' },
];

export default function SyncSettings() {
  const { sessionToken } = useAuthStore();
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [tursoUrl, setTursoUrl] = useState('');
  const [authToken, setAuthToken] = useState('');

  useEffect(() => {
    if (sessionToken) {
      loadStatus();
    } else {
      setLoading(false);
    }
  }, [sessionToken]);

  const loadStatus = async () => {
    if (!sessionToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const s = await syncApi.getStatus(sessionToken);
      setStatus(s);
      if (s.tursoUrl) setTursoUrl(s.tursoUrl);
    } catch (error) {
      console.error('Error loading sync status:', error);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleTestConnection = async () => {
    if (!sessionToken || !tursoUrl || !authToken) return;
    setTesting(true);
    try {
      const msg = await syncApi.testConnection(sessionToken, tursoUrl, authToken);
      showMessage('success', msg);
    } catch (error) {
      showMessage('error', `Error de conexión: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!sessionToken || !tursoUrl || !authToken) return;
    try {
      const s = await syncApi.saveConfig(sessionToken, { tursoUrl, authToken });
      setStatus(s);
      showMessage('success', 'Configuración guardada exitosamente');
    } catch (error) {
      showMessage('error', `Error al guardar: ${error}`);
    }
  };

  const handleInitializeRemote = async () => {
    if (!sessionToken) return;
    setInitializing(true);
    try {
      const msg = await syncApi.initializeRemote(sessionToken);
      showMessage('success', msg);
    } catch (error) {
      showMessage('error', `Error al inicializar: ${error}`);
    } finally {
      setInitializing(false);
    }
  };

  const handleFullSync = async () => {
    if (!sessionToken) return;
    setSyncing(true);
    try {
      const result = await syncApi.fullSync(sessionToken);
      setLastResult(result);
      if (result.success) {
        showMessage('success', `Sincronización completa: ${result.recordsPushed} enviados, ${result.recordsPulled} recibidos`);
      } else {
        showMessage('error', `Sincronización con errores: ${result.errors.join(', ')}`);
      }
      await loadStatus();
    } catch (error) {
      showMessage('error', `Error de sincronización: ${error}`);
    } finally {
      setSyncing(false);
    }
  };

  const handlePush = async () => {
    if (!sessionToken) return;
    setSyncing(true);
    try {
      const result = await syncApi.push(sessionToken);
      setLastResult(result);
      if (result.success) {
        showMessage('success', `${result.recordsPushed} registros enviados a la nube`);
      } else {
        showMessage('error', `Push con errores: ${result.errors.join(', ')}`);
      }
      await loadStatus();
    } catch (error) {
      showMessage('error', `Error al enviar: ${error}`);
    } finally {
      setSyncing(false);
    }
  };

  const handlePull = async () => {
    if (!sessionToken) return;
    setSyncing(true);
    try {
      const result = await syncApi.pull(sessionToken);
      setLastResult(result);
      if (result.success) {
        showMessage('success', `${result.recordsPulled} registros recibidos de la nube`);
      } else {
        showMessage('error', `Pull con errores: ${result.errors.join(', ')}`);
      }
      await loadStatus();
    } catch (error) {
      showMessage('error', `Error al recibir: ${error}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleDisable = async () => {
    if (!sessionToken) return;
    if (!confirm('¿Desactivar la sincronización con Turso? Los datos locales no se verán afectados.')) return;
    try {
      await syncApi.disable(sessionToken);
      setStatus(null);
      setTursoUrl('');
      setAuthToken('');
      setLastResult(null);
      showMessage('success', 'Sincronización desactivada');
      await loadStatus();
    } catch (error) {
      showMessage('error', `Error: ${error}`);
    }
  };

  const handleIntervalChange = async (intervalMinutes: number) => {
    if (!sessionToken) return;
    try {
      const s = await syncApi.setInterval(sessionToken, intervalMinutes);
      setStatus(s);
      showMessage('success', intervalMinutes > 0
        ? `Sincronización automática cada ${intervalMinutes} minutos`
        : 'Sincronización automática desactivada'
      );
    } catch (error) {
      showMessage('error', `Error al cambiar intervalo: ${error}`);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Cargando configuración de sincronización...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div
        className={`flex items-center gap-3 p-4 rounded-lg ${
          status?.configured && status?.enabled
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600'
        }`}
      >
        {status?.configured && status?.enabled ? (
          <>
            <Cloud className="text-green-500" size={24} />
            <div>
              <p className="font-medium text-green-800 dark:text-green-300">Sincronización Activa</p>
              <p className="text-sm text-green-600 dark:text-green-400">
                Conectado a: {status.tursoUrl}
              </p>
              {status.lastSyncAt && (
                <p className="text-xs text-green-500 dark:text-green-500 mt-1">
                  Última sincronización: {new Date(status.lastSyncAt).toLocaleString()}
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <CloudOff className="text-gray-400" size={24} />
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-300">Sincronización No Configurada</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configura tus credenciales de Turso para habilitar la sincronización en la nube
              </p>
            </div>
          </>
        )}
      </div>

      {/* Message */}
      {message && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
          }`}
        >
          {message.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* Configuration */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Database size={20} />
          Configuración de Turso
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              URL de la Base de Datos
            </label>
            <input
              type="text"
              value={tursoUrl}
              onChange={(e) => setTursoUrl(e.target.value)}
              placeholder="libsql://tu-base-de-datos-org.turso.io"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Formato: libsql://nombre-org.turso.io
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Token de Autenticación
            </label>
            <input
              type="password"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Genera un token en el dashboard de Turso o con: turso db tokens create tu-db
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              loading={testing}
              disabled={!tursoUrl || !authToken}
              icon={<Wifi size={16} />}
            >
              Probar Conexión
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveConfig}
              disabled={!tursoUrl || !authToken}
              icon={<CheckCircle size={16} />}
            >
              Guardar Configuración
            </Button>
          </div>
        </div>
      </Card>

      {/* Sync Actions (only when configured) */}
      {status?.configured && status?.enabled && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <RefreshCw size={20} />
            Acciones de Sincronización
          </h3>

          <div className="space-y-4">
            {/* Initialize Remote */}
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-300">Inicializar Base Remota</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Crea las tablas en Turso (solo necesario la primera vez)
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleInitializeRemote}
                loading={initializing}
                icon={<Database size={16} />}
              >
                Inicializar
              </Button>
            </div>

            {/* Sync Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={handleFullSync}
                disabled={syncing}
                className="flex flex-col items-center gap-2 p-6 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-400 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={32} className={`text-primary-500 ${syncing ? 'animate-spin' : ''}`} />
                <span className="font-medium text-gray-900 dark:text-gray-100">Sincronización Completa</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Enviar y recibir datos</span>
              </button>

              <button
                onClick={handlePush}
                disabled={syncing}
                className="flex flex-col items-center gap-2 p-6 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-green-400 transition-colors disabled:opacity-50"
              >
                <Upload size={32} className="text-green-500" />
                <span className="font-medium text-gray-900 dark:text-gray-100">Enviar a la Nube</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Push: local → Turso</span>
              </button>

              <button
                onClick={handlePull}
                disabled={syncing}
                className="flex flex-col items-center gap-2 p-6 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-blue-400 transition-colors disabled:opacity-50"
              >
                <Download size={32} className="text-blue-500" />
                <span className="font-medium text-gray-900 dark:text-gray-100">Recibir de la Nube</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Pull: Turso → local</span>
              </button>
            </div>

            {/* Sync Timestamps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <p className="text-gray-500 dark:text-gray-400">Última sincronización</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString() : 'Nunca'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 dark:text-gray-400">Último push</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {status.lastPushAt ? new Date(status.lastPushAt).toLocaleString() : 'Nunca'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 dark:text-gray-400">Último pull</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {status.lastPullAt ? new Date(status.lastPullAt).toLocaleString() : 'Nunca'}
                </p>
              </div>
            </div>

            {/* Auto-sync Interval */}
            <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-3">
                <Clock className="text-purple-500" size={24} />
                <div>
                  <p className="font-medium text-purple-800 dark:text-purple-300">Sincronización Automática</p>
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    Sincroniza automáticamente en segundo plano
                  </p>
                </div>
              </div>
              <select
                value={status.syncIntervalMinutes}
                onChange={(e) => handleIntervalChange(parseInt(e.target.value))}
                className="px-3 py-2 border border-purple-300 dark:border-purple-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {INTERVAL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Last Sync Result */}
      {lastResult && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Último Resultado
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {lastResult.success ? (
                <CheckCircle className="text-green-500" size={20} />
              ) : (
                <XCircle className="text-red-500" size={20} />
              )}
              <span className={`font-medium ${lastResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                {lastResult.success ? 'Sincronización exitosa' : 'Sincronización con errores'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{lastResult.tablesSynced}</p>
                <p className="text-gray-500 dark:text-gray-400">Tablas</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">{lastResult.recordsPushed}</p>
                <p className="text-gray-500 dark:text-gray-400">Enviados</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-600">{lastResult.recordsPulled}</p>
                <p className="text-gray-500 dark:text-gray-400">Recibidos</p>
              </div>
            </div>

            {lastResult.errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">Errores:</p>
                <ul className="text-sm text-red-700 dark:text-red-400 list-disc list-inside">
                  {lastResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Danger Zone */}
      {status?.configured && status?.enabled && (
        <Card className="p-6 border-red-200 dark:border-red-800">
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
            <WifiOff size={20} />
            Zona de Peligro
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Desactivar sincronización y eliminar credenciales guardadas.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Los datos locales no se verán afectados.
              </p>
            </div>
            <Button
              variant="danger"
              onClick={handleDisable}
              icon={<Trash2 size={16} />}
            >
              Desactivar
            </Button>
          </div>
        </Card>
      )}

      {/* Help Info */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          ¿Cómo configurar Turso?
        </h3>
        <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
          <li>Crea una cuenta en <span className="font-mono text-primary-500">turso.tech</span></li>
          <li>Instala el CLI: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">curl -sSfL https://get.tur.so/install.sh | bash</span></li>
          <li>Crea una base de datos: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">turso db create ddr-planner</span></li>
          <li>Obtén la URL: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">turso db show ddr-planner --url</span></li>
          <li>Genera un token: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">turso db tokens create ddr-planner</span></li>
          <li>Pega la URL y el token en los campos de arriba</li>
          <li>Haz clic en "Probar Conexión" para verificar</li>
          <li>Guarda la configuración e inicializa la base remota</li>
          <li>Usa "Sincronización Completa" para sincronizar datos</li>
        </ol>
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>Plan gratuito de Turso:</strong> 9 GB de almacenamiento, 500 bases de datos, ubicaciones ilimitadas.
            Suficiente para miles de reportes DDR.
          </p>
        </div>
      </Card>
    </div>
  );
}
