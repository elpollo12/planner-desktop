import { useState, useEffect } from 'react';
import { Card, Button } from '../ui';
import {
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  Zap,
  BarChart3,
  Info,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUpdatesStore } from '../../store';
import { useUpdateChecker } from '../../hooks/useUpdateChecker';
import { useModal } from '../../store/modalStore';
import { openUpdateModal } from '../modals/UpdateModal';

const INTERVAL_OPTIONS = [
  { value: 1, label: '1 hora' },
  { value: 6, label: '6 horas' },
  { value: 12, label: '12 horas' },
  { value: 24, label: '24 horas' },
  { value: 48, label: '2 días' },
  { value: 168, label: '1 semana' },
];

export default function UpdatesSettings() {
  const { sessionToken, user } = useAuthStore();
  const { openModal } = useModal();
  const { 
    preferences, 
    loadPreferences, 
    savePreferences,
    setApiUrl,
    apiUrl,
  } = useUpdatesStore();
  
  const {
    state,
    currentVersion,
    releaseInfo,
    checkForUpdate,
    downloadAndInstall,
  } = useUpdateChecker();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Local state for form
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [checkInterval, setCheckInterval] = useState(24);
  const [customApiUrl, setCustomApiUrl] = useState('');

  useEffect(() => {
    if (sessionToken) {
      loadData();
    }
  }, [sessionToken]);

  useEffect(() => {
    if (preferences) {
      setAutoUpdate(preferences.autoUpdate);
      setCheckInterval(preferences.checkIntervalHours);
    }
  }, [preferences]);

  useEffect(() => {
    setCustomApiUrl(apiUrl);
  }, [apiUrl]);

  const loadData = async () => {
    setLoading(true);
    try {
      await loadPreferences(sessionToken!);
    } catch (error) {
      console.error('Error loading update preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSavePreferences = async () => {
    if (!sessionToken) return;
    setSaving(true);
    try {
      await savePreferences(sessionToken, {
        autoUpdate,
        channel: 'stable',
        checkIntervalHours: checkInterval,
      });
      showMessage('success', 'Preferencias de actualización guardadas');
    } catch (error) {
      showMessage('error', `Error al guardar: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveApiUrl = () => {
    setApiUrl(customApiUrl);
    showMessage('success', 'URL de API guardada');
  };

  const handleCheckNow = async () => {
    setChecking(true);
    try {
      await checkForUpdate();
      if (state.status === 'available') {
        showMessage('success', `Nueva versión disponible: ${releaseInfo?.version}`);
      } else {
        showMessage('success', 'Ya tienes la última versión');
      }
    } catch (error) {
      showMessage('error', `Error al verificar: ${error}`);
    } finally {
      setChecking(false);
    }
  };

  const handleViewUpdateDetails = () => {
    openUpdateModal(openModal);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="animate-spin text-primary-500" size={24} />
        <span className="ml-2 text-gray-500">Cargando configuración...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Version Banner */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border border-primary-200 dark:border-primary-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-500 rounded-lg">
            <Download className="text-white" size={24} />
          </div>
          <div>
            <p className="font-semibold text-primary-800 dark:text-primary-300">
              Versión Actual: {currentVersion}
            </p>
            <p className="text-sm text-primary-600 dark:text-primary-400">
              Canal: Estable
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {state.status === 'available' && releaseInfo && (
            <Button 
              variant="primary" 
              onClick={handleViewUpdateDetails}
              icon={<Zap size={16} />}
            >
              v{releaseInfo.version} disponible
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={handleCheckNow} 
            loading={checking || state.status === 'checking'}
            icon={<RefreshCw size={16} />}
          >
            Buscar actualizaciones
          </Button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
        }`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* Update Available Alert */}
      {state.status === 'available' && releaseInfo && (
        <Card className="p-6 border-2 border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/10">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary-500 rounded-full">
              <Download className="text-white" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-primary-800 dark:text-primary-300">
                ¡Nueva versión disponible!
              </h3>
              <p className="text-primary-600 dark:text-primary-400 mt-1">
                Versión {releaseInfo.version} está lista para descargar.
              </p>
              {releaseInfo.notes && (
                <p className="text-sm text-primary-500 dark:text-primary-500 mt-2 line-clamp-2">
                  {releaseInfo.notes}
                </p>
              )}
              <div className="flex gap-3 mt-4">
                <Button variant="primary" onClick={downloadAndInstall} icon={<Download size={16} />}>
                  Descargar e instalar
                </Button>
                <Button variant="outline" onClick={handleViewUpdateDetails} icon={<Info size={16} />}>
                  Ver detalles
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Downloading Progress */}
      {state.status === 'downloading' && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <RefreshCw className="animate-spin text-primary-500" size={24} />
            <span className="font-medium text-gray-900 dark:text-gray-100">
              Descargando actualización... {state.progress}%
            </span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-300"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </Card>
      )}

      {/* Auto-Update Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Settings size={20} />
          Configuración de Actualizaciones
        </h3>

        <div className="space-y-6">
          {/* Auto-update toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <Zap className="text-amber-500" size={24} />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  Actualización Automática
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Descargar e instalar actualizaciones automáticamente
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoUpdate}
                onChange={(e) => setAutoUpdate(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {/* Check interval */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Verificar actualizaciones cada
            </label>
            <div className="flex items-center gap-3">
              <Clock className="text-gray-400" size={20} />
              <select
                value={checkInterval}
                onChange={(e) => setCheckInterval(parseInt(e.target.value))}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {INTERVAL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button 
              variant="primary" 
              onClick={handleSavePreferences} 
              loading={saving}
              icon={<CheckCircle size={16} />}
            >
              Guardar preferencias
            </Button>
          </div>
        </div>
      </Card>

      {/* API URL Configuration (Admin only) */}
      {user?.role === 'admin' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Settings size={20} />
            Configuración Avanzada
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                URL del Servidor de Actualizaciones
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customApiUrl}
                  onChange={(e) => setCustomApiUrl(e.target.value)}
                  placeholder="http://localhost:3001"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <Button variant="outline" onClick={handleSaveApiUrl}>
                  Guardar
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                URL del servidor planner-sync para verificar actualizaciones
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Update Status Info */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <BarChart3 size={20} />
          Estado de Actualizaciones
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{currentVersion}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Versión instalada</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {preferences?.lastCheckAt 
                ? new Date(preferences.lastCheckAt).toLocaleDateString() 
                : 'Nunca'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Última verificación</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {preferences?.postponeCount || 0} / 3
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Postergaciones usadas</p>
          </div>
        </div>
      </Card>

      {/* Help Info */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Información
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Las actualizaciones automáticas mantienen tu aplicación al día con las últimas
            mejoras y correcciones de seguridad.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <p className="text-blue-800 dark:text-blue-300">
              <strong>Postergación:</strong> Puedes postergar una actualización hasta 3 veces.
              Después de eso, se te pedirá que actualices para continuar usando la aplicación
              de forma óptima.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
