import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import { useLicenseStore } from '../store/licenseStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { Button, Card } from '../components/ui';
import { KeyRound, CheckCircle, AlertCircle, Loader2, CloudDownload } from 'lucide-react';

type HandshakeStatus = 'idle' | 'loading' | 'success' | 'error';

interface HandshakeResult {
  success: boolean;
  tablesWritten: number;
  error: string | null;
}

export default function LicenseActivation() {
  const [licenseKey, setLicenseKey] = useState('');
  const [handshakeStatus, setHandshakeStatus] = useState<HandshakeStatus>('idle');
  const [handshakeError, setHandshakeError] = useState<string | null>(null);
  const { t } = useTranslation();
  const { activateLicense, isLoading, error, license } = useLicenseStore();
  const { settings } = useAppSettingsStore();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setHandshakeStatus('idle');
    setHandshakeError(null);

    try {
      // Paso 1: activar licencia (guarda license.json + sync_config.json)
      await activateLicense(licenseKey.trim());

      // Paso 2: handshake best-effort (descarga datos del servidor)
      setHandshakeStatus('loading');
      try {
        const result = await invoke<HandshakeResult>('sync_handshake');
        setHandshakeStatus(result.success ? 'success' : 'error');
        if (!result.success) setHandshakeError(result.error ?? 'Error desconocido');
      } catch (err) {
        setHandshakeStatus('error');
        setHandshakeError(String(err));
      }
    } catch {
      // Error de activación ya está en el store
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative px-4"
      style={{
        backgroundImage: 'url(/login.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      <Card className="sm:min-w-1/2 md:min-w-[480px] max-w-lg relative z-10 shadow-2xl">
        <div className="text-center mb-6">
          {settings?.logoPath ? (
            <div className="flex justify-center mb-4">
              <img
                src={settings.logoPath}
                alt="Logo de la empresa"
                className="h-20 w-auto object-contain"
              />
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-primary-500 mb-2">
                {t('license.title')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">{t('license.subtitle')}</p>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <KeyRound size={20} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {t('license.required')}
          </p>
        </div>

        {license && !license.isValid && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <AlertCircle size={20} className="text-red-600 dark:text-red-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">{t('license.expired')}</p>
              <p className="text-xs text-red-600 dark:text-red-400">
                {t('license.customer')}: {license.customer} | {t('license.expiredAt')}: {license.expiry}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('license.keyLabel')}
            </label>
            <textarea
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder={t('license.keyPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-primary-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500
                         font-mono text-xs resize-none"
              rows={4}
              required
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
              <AlertCircle size={16} className="shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {handshakeStatus === 'loading' && (
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-4 py-3 rounded-lg">
              <Loader2 size={16} className="shrink-0 animate-spin" />
              <p className="text-sm">{t('license.downloading')}</p>
            </div>
          )}

          {handshakeStatus === 'success' && (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg">
              <CloudDownload size={16} className="shrink-0" />
              <p className="text-sm">{t('license.downloadSuccess')}</p>
            </div>
          )}

          {handshakeStatus === 'error' && (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 px-4 py-3 rounded-lg">
              <AlertCircle size={16} className="shrink-0" />
              <div>
                <p className="text-sm font-medium">{t('license.downloadErrorTitle')}</p>
                <p className="text-xs mt-0.5 opacity-80">
                  {handshakeError ?? t('license.downloadErrorHint')}
                </p>
              </div>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            loading={isLoading || handshakeStatus === 'loading'}
            disabled={isLoading || handshakeStatus === 'loading' || !licenseKey.trim()}
            icon={<CheckCircle size={18} />}
          >
            {t('license.activate')}
          </Button>
        </form>

        <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center mt-6">
          {t('license.contactAdmin')}
        </p>
      </Card>
    </div>
  );
}
