import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import { useLicenseStore } from '../store/licenseStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { syncEvents } from '../lib/syncEvents';
import { queryClient } from '../lib/queryClient';
import { Button, Card } from '../components/ui';
import { KeyRound, CheckCircle, AlertCircle, Loader2, CloudDownload, ArrowRight, RotateCcw } from 'lucide-react';

type Step = 'form' | 'loading' | 'success' | 'partial' | 'invalid';

interface HandshakeResult {
  success: boolean;
  tablesWritten: number;
  error: string | null;
}

export default function LicenseActivation() {
  const [step, setStep] = useState<Step>('form');
  const [licenseKey, setLicenseKey] = useState('');
  const [activationError, setActivationError] = useState<string | null>(null);
  const [handshakeError, setHandshakeError] = useState<string | null>(null);
  const [tablesWritten, setTablesWritten] = useState(0);

  const { t } = useTranslation();
  const { activateLicense, completeActivation } = useLicenseStore();
  const { settings } = useAppSettingsStore();

  const handleActivate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActivationError(null);
    setHandshakeError(null);
    setStep('loading');

    try {
      await activateLicense(licenseKey.trim());
    } catch (err: any) {
      setActivationError(err?.message ?? String(err));
      setStep('invalid');
      return;
    }

    try {
      const result = await invoke<HandshakeResult>('sync_handshake');
      if (result.success) {
        setTablesWritten(result.tablesWritten);
        syncEvents.emit();
        queryClient.invalidateQueries();
        setStep('success');
      } else {
        setHandshakeError(result.error ?? 'Error desconocido');
        setStep('partial');
      }
    } catch (err: any) {
      setHandshakeError(String(err));
      setStep('partial');
    }
  };

  const handleGoToLogin = () => {
    completeActivation();
  };

  const handleRetry = () => {
    setStep('form');
    setLicenseKey('');
    setActivationError(null);
    setHandshakeError(null);
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <Card className="w-full sm:min-w-[460px] md:min-w-[500px] max-w-lg relative z-10 shadow-2xl">

        <div className="text-center mb-6">
          {settings?.logoPath ? (
            <div className="flex justify-center mb-4">
              <img src={settings.logoPath} alt="Logo" className="h-20 w-auto object-contain" />
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-primary-500 mb-2">{t('license.title')}</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{t('license.subtitle')}</p>
            </>
          )}
        </div>

        {/* Formulario — sin licencia o inválida */}
        {(step === 'form' || step === 'invalid') && (
          <>
            <div className="flex items-center gap-2 mb-5 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <KeyRound size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-300">{t('license.required')}</p>
            </div>

            {step === 'invalid' && activationError && (
              <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <AlertCircle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">Licencia inválida</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{activationError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleActivate} className="space-y-4">
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
                             placeholder-gray-400 dark:placeholder-gray-500 font-mono text-xs resize-none"
                  rows={4}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" variant="primary" size="lg" className="w-full"
                disabled={!licenseKey.trim()} icon={<CheckCircle size={18} />}>
                {t('license.activate')}
              </Button>
            </form>
          </>
        )}

        {/* Cargando */}
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <Loader2 size={36} className="animate-spin text-primary-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Activando licencia y descargando datos...</p>
          </div>
        )}

        {/* Éxito */}
        {step === 'success' && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <CheckCircle size={22} className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                  Licencia activada correctamente
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                  <CloudDownload size={12} />
                  {tablesWritten} registros descargados. El sistema está listo.
                </p>
              </div>
            </div>
            <Button type="button" variant="primary" size="lg" className="w-full"
              onClick={handleGoToLogin} icon={<ArrowRight size={18} />}>
              Ir al inicio de sesión
            </Button>
          </div>
        )}

        {/* Parcial — handshake falló */}
        {step === 'partial' && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <AlertCircle size={22} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                  Licencia válida — sin conexión al servidor
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  {handshakeError ?? t('license.downloadErrorHint')}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  Puedes continuar en modo sin conexión. Un administrador puede vincular el servidor desde el Panel de Administración.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" size="lg" className="flex-1"
                onClick={handleRetry} icon={<RotateCcw size={16} />}>
                Reintentar
              </Button>
              <Button type="button" variant="primary" size="lg" className="flex-1"
                onClick={handleGoToLogin} icon={<ArrowRight size={18} />}>
                {t('license.continueAnyway')}
              </Button>
            </div>
          </div>
        )}

        <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center mt-6">
          {t('license.contactAdmin')}
        </p>
      </Card>
    </div>
  );
}
