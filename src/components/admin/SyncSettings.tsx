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
  Clock,
  AlertTriangle,
  LogIn,
  Link2,
  Link2Off,
  Server,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useConnectionStore } from '../../store/connectionStore';
import { useModal } from '../../store/modalStore';
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
  const { setOnline, setOffline, setSyncing: setSyncingConnection, setError, setSyncEnabled } = useConnectionStore();
  const { openModal, closeModal } = useModal();

  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Connection form state
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    if (sessionToken) {
      loadInitialData();
    } else {
      setLoading(false);
    }
  }, [sessionToken]);

  const loadInitialData = async () => {
    if (!sessionToken) return;
    setLoading(true);
    try {
      const [s, url] = await Promise.all([
        syncApi.getStatus(sessionToken),
        syncApi.getServerUrl(sessionToken),
      ]);
      setStatus(s);
      setServerUrl(url || '');
    } catch (error) {
      console.error('Error loading sync data:', error);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 6000);
  };

  // ── CONNECT ──────────────────────────────────────────────────────────────
  const handleConnect = async () => {
    if (!sessionToken || !serverUrl || !username || !password) return;
    setConnecting(true);
    try {
      const s = await syncApi.connect(sessionToken, serverUrl, username, password);
      setStatus(s);
      setSyncEnabled(true, true);
      setOnline();
      setUsername('');
      setPassword('');
      showMessage('success', `Servidor vinculado correctamente`);
    } catch (error) {
      showMessage('error', String(error));
    } finally {
      setConnecting(false);
    }
  };

  // ── DISCONNECT ────────────────────────────────────────────────────────────
  const doDisconnect = async () => {
    if (!sessionToken) return;
    closeModal();
    setDisconnecting(true);
    try {
      await syncApi.disable(sessionToken);
      const s = await syncApi.getStatus(sessionToken);
      setStatus(s);
      setLastResult(null);
      setSyncEnabled(true, false);
      setOffline();
      showMessage('success', 'Servidor desvinculado');
    } catch (error) {
      showMessage('error', `Error: ${error}`);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleDisconnect = () => {
    openModal(
      <div className="space-y-2">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Se eliminará la conexión con el servidor de sincronización y se
          desactivará la sincronización automática.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Los datos locales no se verán afectados.
        </p>
      </div>,
      {
        title: '¿Desvincular servidor?',
        size: 'sm',
        showConfirmButton: true,
        showCancelButton: true,
        confirmText: 'Desvincular',
        cancelText: 'Cancelar',
        onConfirm: doDisconnect,
      }
    );
  };

  // ── SYNC ACTIONS ──────────────────────────────────────────────────────────
  const handleFullSync = async () => {
    if (!sessionToken) return;
    setSyncing(true);
    setSyncingConnection();
    try {
      const result = await syncApi.fullSync(sessionToken);
      setLastResult(result);
      if (result.success) {
        showMessage('success', `Sync completo — ${result.recordsPushed} enviados, ${result.recordsPulled} recibidos`);
        setOnline();
      } else {
        showMessage('error', `Sync con errores: ${result.errors.join(', ')}`);
        if (result.errors.length > 0) setError(result.errors[0]);
      }
      const s = await syncApi.getStatus(sessionToken);
      setStatus(s);
    } catch (error) {
      showMessage('error', `Error de sincronización: ${error}`);
      setOffline(String(error));
    } finally {
      setSyncing(false);
    }
  };

  const handlePush = async () => {
    if (!sessionToken) return;
    setSyncing(true);
    setSyncingConnection();
    try {
      const result = await syncApi.push(sessionToken);
      setLastResult(result);
      showMessage(result.success ? 'success' : 'error',
        result.success ? `${result.recordsPushed} registros enviados` : `Push con errores: ${result.errors.join(', ')}`);
      if (result.success) setOnline();
      const s = await syncApi.getStatus(sessionToken);
      setStatus(s);
    } catch (error) {
      showMessage('error', `Error al enviar: ${error}`);
      setOffline(String(error));
    } finally {
      setSyncing(false);
    }
  };

  const handlePull = async () => {
    if (!sessionToken) return;
    setSyncing(true);
    setSyncingConnection();
    try {
      const result = await syncApi.pull(sessionToken);
      setLastResult(result);
      showMessage(result.success ? 'success' : 'error',
        result.success ? `${result.recordsPulled} registros recibidos` : `Pull con errores: ${result.errors.join(', ')}`);
      if (result.success) setOnline();
      const s = await syncApi.getStatus(sessionToken);
      setStatus(s);
    } catch (error) {
      showMessage('error', `Error al recibir: ${error}`);
      setOffline(String(error));
    } finally {
      setSyncing(false);
    }
  };

  const handleIntervalChange = async (intervalMinutes: number) => {
    if (!sessionToken) return;
    try {
      const s = await syncApi.setInterval(sessionToken, intervalMinutes);
      setStatus(s);
      showMessage('success', intervalMinutes > 0
        ? `Auto-sync cada ${intervalMinutes} minutos`
        : 'Auto-sync desactivado');
    } catch (error) {
      showMessage('error', `Error al cambiar intervalo: ${error}`);
    }
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  if (loading) {
    return <div className="text-center py-12 text-gray-500">Cargando configuración de sincronización...</div>;
  }

  const isConnected = status?.configured && status?.enabled;
  const canConnect = serverUrl.trim() && username.trim() && password.trim();

  return (
    <div className="space-y-6">

      {/* ── STATUS BANNER ── */}
      <div className={`flex items-center gap-4 p-4 rounded-xl border ${
        isConnected
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
      }`}>
        {isConnected
          ? <Cloud className="text-green-500 flex-shrink-0" size={28} />
          : <CloudOff className="text-gray-400 flex-shrink-0" size={28} />
        }
        <div className="flex-1 min-w-0">
          <p className={`font-semibold ${isConnected ? 'text-green-800 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'}`}>
            {isConnected ? 'Servidor vinculado' : 'Sin servidor vinculado'}
          </p>
          <p className={`text-sm truncate ${isConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {isConnected
              ? (serverUrl || 'Sincronización activa')
              : 'Vincula un servidor para comenzar a sincronizar datos'
            }
          </p>
          {isConnected && status?.lastSyncAt && (
            <p className="text-xs text-green-500 mt-0.5">
              Última sync: {new Date(status.lastSyncAt).toLocaleString()}
            </p>
          )}
        </div>
        {isConnected && (
          <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2.5 py-1 rounded-full flex-shrink-0">
            <ShieldCheck size={13} />
            Activo
          </div>
        )}
      </div>

      {/* ── INLINE MESSAGE ── */}
      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
          message.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
        }`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STATE A — NOT CONNECTED: Connection form
      ══════════════════════════════════════════════════════════════════════ */}
      {!isConnected && (
        <Card className="p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
            <Server size={18} />
            Vincular servidor
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Ingresa la URL del servidor planner-sync y las credenciales de acceso.
            Si el servidor principal no responde, la app intentará con{' '}
            <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">localhost:3001</code> automáticamente.
          </p>

          <div className="space-y-4">
            {/* URL */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                URL del servidor
              </label>
              <input
                type="url"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://187.77.221.60:3005"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Credentials */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Usuario
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="off"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && canConnect && handleConnect()}
                    placeholder="••••••"
                    autoComplete="new-password"
                    className="w-full px-3 py-2 pr-9 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleConnect}
              loading={connecting}
              disabled={!canConnect}
              icon={<Link2 size={16} />}
              className="w-full justify-center"
            >
              {connecting ? 'Vinculando...' : 'Vincular servidor'}
            </Button>
          </div>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STATE B — CONNECTED: Operational panel
      ══════════════════════════════════════════════════════════════════════ */}
      {isConnected && (
        <>
          {/* Sync action cards */}
          <Card className="p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <RefreshCw size={18} />
              Acciones de sincronización
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <button
                onClick={handleFullSync}
                disabled={syncing}
                className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={28} className={`text-primary-500 ${syncing ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Completa</span>
                <span className="text-xs text-gray-400">Enviar y recibir todo</span>
              </button>
              <button
                onClick={handlePush}
                disabled={syncing}
                className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-green-400 transition-colors disabled:opacity-50"
              >
                <Upload size={28} className="text-green-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Enviar</span>
                <span className="text-xs text-gray-400">Local → servidor</span>
              </button>
              <button
                onClick={handlePull}
                disabled={syncing}
                className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-blue-400 transition-colors disabled:opacity-50"
              >
                <Download size={28} className="text-blue-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Recibir</span>
                <span className="text-xs text-gray-400">Servidor → local</span>
              </button>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-3 gap-3 text-xs text-center border-t border-gray-100 dark:border-gray-700 pt-4">
              {[
                { label: 'Última sync', value: status?.lastSyncAt },
                { label: 'Último push', value: status?.lastPushAt },
                { label: 'Último pull', value: status?.lastPullAt },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-gray-400 mb-0.5">{label}</p>
                  <p className="font-medium text-gray-700 dark:text-gray-300">
                    {value ? new Date(value).toLocaleString() : 'Nunca'}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Auto-sync interval */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="text-purple-500" size={20} />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Sincronización automática</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Se ejecuta en segundo plano</p>
                </div>
              </div>
              <select
                value={status?.syncIntervalMinutes ?? 5}
                onChange={(e) => handleIntervalChange(parseInt(e.target.value))}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {INTERVAL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </Card>

          {/* Last result */}
          {lastResult && (
            <Card className="p-5">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Último resultado</p>
              <div className="flex items-center gap-2 mb-3">
                {lastResult.success
                  ? <CheckCircle className="text-green-500" size={18} />
                  : <XCircle className="text-red-500" size={18} />
                }
                <span className={`text-sm font-medium ${lastResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  {lastResult.success ? 'Exitosa' : 'Con errores'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{lastResult.tablesSynced}</p>
                  <p className="text-xs text-gray-500">Tablas</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                  <p className="text-xl font-bold text-green-600">{lastResult.recordsPushed}</p>
                  <p className="text-xs text-gray-500">Enviados</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <p className="text-xl font-bold text-blue-600">{lastResult.recordsPulled}</p>
                  <p className="text-xs text-gray-500">Recibidos</p>
                </div>
              </div>
              {lastResult.errors.length > 0 && (
                <div className="mt-3 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  <ul className="text-xs text-red-700 dark:text-red-400 list-disc list-inside space-y-0.5">
                    {lastResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
            </Card>
          )}

          {/* Disconnect */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10">
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Desvincular servidor</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Los datos locales no se verán afectados.
              </p>
            </div>
            <Button
              variant="danger"
              onClick={handleDisconnect}
              loading={disconnecting}
              icon={<Link2Off size={15} />}
            >
              Desvincular
            </Button>
          </div>
        </>
      )}

    </div>
  );
}
