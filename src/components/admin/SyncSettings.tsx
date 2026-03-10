import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import { syncEvents } from '../../lib/syncEvents';
import type { SyncStatus, SyncResult } from '../../types/sync';

export default function SyncSettings() {
  const { t } = useTranslation();
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

  const INTERVAL_OPTIONS = [
    { value: 0, label: t('admin.sync.disabled') },
    { value: 1, label: t('admin.sync.minute1') },
    { value: 5, label: t('admin.sync.minutes5') },
    { value: 10, label: t('admin.sync.minutes10') },
    { value: 15, label: t('admin.sync.minutes15') },
    { value: 30, label: t('admin.sync.minutes30') },
    { value: 60, label: t('admin.sync.hour1') },
  ];

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
      showMessage('success', t('admin.sync.linked'));
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
      showMessage('success', t('admin.sync.disconnected'));
    } catch (error) {
      showMessage('error', t('admin.sync.disconnectError', { error: String(error) }));
    } finally {
      setDisconnecting(false);
    }
  };

  const handleDisconnect = () => {
    openModal(
      <div className="space-y-2">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {t('admin.sync.disconnectConfirmMsg')}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('admin.sync.disconnectLocalSafe')}
        </p>
      </div>,
      {
        title: t('admin.sync.disconnectConfirmTitle'),
        size: 'sm',
        showConfirmButton: true,
        showCancelButton: true,
        confirmText: t('admin.sync.disconnectBtn'),
        cancelText: t('actions.cancel'),
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
        showMessage('success', t('admin.sync.fullSyncSuccess', { pushed: result.recordsPushed, pulled: result.recordsPulled }));
        setOnline();
        syncEvents.emit();
      } else {
        showMessage('error', t('admin.sync.syncErrors', { errors: result.errors.join(', ') }));
        if (result.errors.length > 0) setError(result.errors[0]);
      }
      const s = await syncApi.getStatus(sessionToken);
      setStatus(s);
    } catch (error) {
      showMessage('error', t('admin.sync.syncError', { error: String(error) }));
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
        result.success ? t('admin.sync.pushSuccess', { count: result.recordsPushed }) : t('admin.sync.pushErrors', { errors: result.errors.join(', ') }));
      if (result.success) setOnline();
      const s = await syncApi.getStatus(sessionToken);
      setStatus(s);
    } catch (error) {
      showMessage('error', t('admin.sync.pushError', { error: String(error) }));
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
        result.success ? t('admin.sync.pullSuccess', { count: result.recordsPulled }) : t('admin.sync.pullErrors', { errors: result.errors.join(', ') }));
      if (result.success) {
        setOnline();
        syncEvents.emit();
      }
      const s = await syncApi.getStatus(sessionToken);
      setStatus(s);
    } catch (error) {
      showMessage('error', t('admin.sync.pullError', { error: String(error) }));
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
        ? t('admin.sync.autoSyncSet', { minutes: intervalMinutes })
        : t('admin.sync.autoSyncDisabled'));
    } catch (error) {
      showMessage('error', t('admin.sync.intervalError', { error: String(error) }));
    }
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  if (loading) {
    return <div className="text-center py-12 text-gray-500">{t('admin.sync.loading')}</div>;
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
            {isConnected ? t('admin.sync.serverLinked') : t('admin.sync.noServerLinked')}
          </p>
          <p className={`text-sm truncate ${isConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {isConnected
              ? (serverUrl || t('admin.sync.syncActive'))
              : t('admin.sync.linkPrompt')
            }
          </p>
          {isConnected && status?.lastSyncAt && (
            <p className="text-xs text-green-500 mt-0.5">
              {t('admin.sync.lastSync', { date: new Date(status.lastSyncAt).toLocaleString() })}
            </p>
          )}
        </div>
        {isConnected && (
          <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2.5 py-1 rounded-full flex-shrink-0">
            <ShieldCheck size={13} />
            {t('admin.sync.active')}
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
            {t('admin.sync.linkServer')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            {t('admin.sync.linkServerDesc')}
          </p>

          <div className="space-y-4">
            {/* URL */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                {t('admin.sync.serverUrl')}
              </label>
              <input
                list="sync-server-options"
                type="url"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://187.77.221.60:3005"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <datalist id="sync-server-options">
                <option value="http://187.77.221.60:3005" />
                <option value="http://localhost:3005" />
                <option value="http://localhost:3001" />
              </datalist>
            </div>

            {/* Credentials */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  {t('admin.sync.username')}
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
                  {t('admin.sync.password')}
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
              {connecting ? t('admin.sync.linking') : t('admin.sync.linkServer')}
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
              {t('admin.sync.syncActions')}
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <button
                onClick={handleFullSync}
                disabled={syncing}
                className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={28} className={`text-primary-500 ${syncing ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('admin.sync.fullSync')}</span>
                <span className="text-xs text-gray-400">{t('admin.sync.fullSyncDesc')}</span>
              </button>
              <button
                onClick={handlePush}
                disabled={syncing}
                className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-green-400 transition-colors disabled:opacity-50"
              >
                <Upload size={28} className="text-green-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('admin.sync.push')}</span>
                <span className="text-xs text-gray-400">{t('admin.sync.pushDesc')}</span>
              </button>
              <button
                onClick={handlePull}
                disabled={syncing}
                className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-blue-400 transition-colors disabled:opacity-50"
              >
                <Download size={28} className="text-blue-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('admin.sync.pull')}</span>
                <span className="text-xs text-gray-400">{t('admin.sync.pullDesc')}</span>
              </button>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-3 gap-3 text-xs text-center border-t border-gray-100 dark:border-gray-700 pt-4">
              {[
                { label: t('admin.sync.lastSyncLabel'), value: status?.lastSyncAt },
                { label: t('admin.sync.lastPush'), value: status?.lastPushAt },
                { label: t('admin.sync.lastPull'), value: status?.lastPullAt },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-gray-400 mb-0.5">{label}</p>
                  <p className="font-medium text-gray-700 dark:text-gray-300">
                    {value ? new Date(value).toLocaleString() : t('admin.sync.never')}
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
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('admin.sync.autoSync')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.sync.autoSyncDesc')}</p>
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
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('admin.sync.lastResult')}</p>
              <div className="flex items-center gap-2 mb-3">
                {lastResult.success
                  ? <CheckCircle className="text-green-500" size={18} />
                  : <XCircle className="text-red-500" size={18} />
                }
                <span className={`text-sm font-medium ${lastResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  {lastResult.success ? t('admin.sync.successful') : t('admin.sync.withErrors')}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{lastResult.tablesSynced}</p>
                  <p className="text-xs text-gray-500">{t('admin.sync.tables')}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                  <p className="text-xl font-bold text-green-600">{lastResult.recordsPushed}</p>
                  <p className="text-xs text-gray-500">{t('admin.sync.sent')}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <p className="text-xl font-bold text-blue-600">{lastResult.recordsPulled}</p>
                  <p className="text-xs text-gray-500">{t('admin.sync.received')}</p>
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
              <p className="text-sm font-medium text-red-700 dark:text-red-400">{t('admin.sync.disconnect')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t('admin.sync.disconnectLocalSafe')}
              </p>
            </div>
            <Button
              variant="danger"
              onClick={handleDisconnect}
              loading={disconnecting}
              icon={<Link2Off size={15} />}
            >
              {t('admin.sync.disconnectBtn')}
            </Button>
          </div>
        </>
      )}

    </div>
  );
}
