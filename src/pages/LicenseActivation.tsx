import { useState } from 'react';
import { useLicenseStore } from '../store/licenseStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { Button, Card } from '../components/ui';
import { KeyRound, CheckCircle, AlertCircle } from 'lucide-react';

export default function LicenseActivation() {
  const [licenseKey, setLicenseKey] = useState('');
  const { activateLicense, isLoading, error, license } = useLicenseStore();
  const { settings } = useAppSettingsStore();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await activateLicense(licenseKey.trim());
    } catch {
      // Error is set in the store
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
                Sistema de Reportes DDR
              </h1>
              <p className="text-gray-600 dark:text-gray-400">Gestión de Taladros Petroleros</p>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <KeyRound size={20} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Se requiere una licencia válida para utilizar el sistema.
          </p>
        </div>

        {license && !license.isValid && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <AlertCircle size={20} className="text-red-600 dark:text-red-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">Licencia expirada</p>
              <p className="text-xs text-red-600 dark:text-red-400">
                Cliente: {license.customer} | Expiró: {license.expiry}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Clave de Licencia
            </label>
            <textarea
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="Pegue aquí su clave de licencia..."
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

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            loading={isLoading}
            disabled={isLoading || !licenseKey.trim()}
            icon={<CheckCircle size={18} />}
          >
            Activar Licencia
          </Button>
        </form>

        <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center mt-6">
          Contacte a su administrador si no posee una clave de licencia.
        </p>
      </Card>
    </div>
  );
}
