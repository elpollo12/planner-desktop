import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { Upload, Trash2, RotateCcw } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { backgroundPush } from '@/lib/syncHelper';
import { usePreferencesStore } from '@/store/preferencesStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { generatePalette, isValidHexColor } from '@/lib/colorUtils';
import { DEFAULT_APP_SETTINGS } from '@/types/appSettings';
import { applyThemeToDOM } from '@/hooks/useThemeApplicator';

const PRIMARY_PRESETS = [
  '#1e3a5f', '#1e40af', '#0f766e', '#4338ca', '#9333ea', '#be123c', '#c2410c', '#15803d',
];

const SECONDARY_PRESETS = [
  '#f97316', '#eab308', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b',
];

export default function AppearanceSettings() {
  const { sessionToken } = useAuthStore();
  const { settings, saveSettings, uploadLogo, removeLogo, isLoading } = useAppSettingsStore();
  const { preferences } = usePreferencesStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitializedRef = useRef(false);
  const userHasInteractedRef = useRef(false);

  // Initialize state from settings (if available) or defaults
  const initialPrimary = settings?.primaryColor ?? DEFAULT_APP_SETTINGS.primaryColor;
  const initialSecondary = settings?.secondaryColor ?? DEFAULT_APP_SETTINGS.secondaryColor;

  const [primaryColor, setPrimaryColor] = useState(initialPrimary);
  const [secondaryColor, setSecondaryColor] = useState(initialSecondary);
  const [primaryHex, setPrimaryHex] = useState(initialPrimary);
  const [secondaryHex, setSecondaryHex] = useState(initialSecondary);
  const [saving, setSaving] = useState(false);

  // Sync state when settings load/change (but only if not initialized yet)
  useEffect(() => {
    if (settings && !isInitializedRef.current) {
      setPrimaryColor(settings.primaryColor);
      setSecondaryColor(settings.secondaryColor);
      setPrimaryHex(settings.primaryColor);
      setSecondaryHex(settings.secondaryColor);
      isInitializedRef.current = true;
    }
  }, [settings]);

  // Live preview: ONLY apply theme when user makes changes (not on mount)
  // The global theme is already applied by useThemeApplicator in App.tsx
  useEffect(() => {
    if (userHasInteractedRef.current) {
      const themeMode = preferences?.themeMode ?? 'light';
      applyThemeToDOM({ primaryColor, secondaryColor, themeMode });
    }
  }, [primaryColor, secondaryColor, preferences]);

  const handlePrimaryColorChange = (color: string) => {
    userHasInteractedRef.current = true;
    setPrimaryColor(color);
    setPrimaryHex(color);
  };

  const handleSecondaryColorChange = (color: string) => {
    userHasInteractedRef.current = true;
    setSecondaryColor(color);
    setSecondaryHex(color);
  };

  const handlePrimaryHexInput = (value: string) => {
    setPrimaryHex(value);
    if (isValidHexColor(value)) {
      userHasInteractedRef.current = true;
      setPrimaryColor(value);
    }
  };

  const handleSecondaryHexInput = (value: string) => {
    setSecondaryHex(value);
    if (isValidHexColor(value)) {
      userHasInteractedRef.current = true;
      setSecondaryColor(value);
    }
  };

  const handleSave = async () => {
    if (!sessionToken) return;
    setSaving(true);
    try {
      await saveSettings(sessionToken, {
        primaryColor,
        secondaryColor,
      });
      toast.success('Configuración de la empresa guardada exitosamente');
      backgroundPush(sessionToken);
    } catch {
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionToken) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('El archivo excede el límite de 2MB');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const fileData = Array.from(new Uint8Array(buffer));
      await uploadLogo(sessionToken, fileData, file.name);
      toast.success('Logo subido exitosamente');
      backgroundPush(sessionToken);
    } catch {
      toast.error('Error al subir el logo');
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveLogo = async () => {
    if (!sessionToken) return;
    try {
      await removeLogo(sessionToken);
      toast.success('Logo eliminado');
      backgroundPush(sessionToken);
    } catch {
      toast.error('Error al eliminar el logo');
    }
  };

  const handleResetPrimary = () => {
    userHasInteractedRef.current = true;
    handlePrimaryColorChange(DEFAULT_APP_SETTINGS.primaryColor);
  };
  const handleResetSecondary = () => {
    userHasInteractedRef.current = true;
    handleSecondaryColorChange(DEFAULT_APP_SETTINGS.secondaryColor);
  };

  const primaryPalette = generatePalette(primaryColor);
  const secondaryPalette = generatePalette(secondaryColor);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Apariencia Corporativa</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Define los colores y logo de la empresa. Estos cambios se aplicarán a todos los usuarios.
        </p>
      </div>

      {/* Color Primario */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Color Primario</h3>
        <div className="flex items-center gap-4 mb-4">
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => handlePrimaryColorChange(e.target.value)}
            className="w-12 h-12 rounded-lg cursor-pointer border border-gray-300 dark:border-gray-600"
          />
          <div className="w-36">
            <Input
              value={primaryHex}
              onChange={(e) => handlePrimaryHexInput(e.target.value)}
              placeholder="#1e3a5f"
              className={!isValidHexColor(primaryHex) && primaryHex.length > 0 ? 'error' : ''}
            />
          </div>
          <Button variant="ghost" size="sm" onClick={handleResetPrimary}>
            <RotateCcw size={16} />
            Restablecer
          </Button>
        </div>

        {/* Presets */}
        <div className="flex gap-2 mb-4">
          {PRIMARY_PRESETS.map((color) => (
            <button
              key={color}
              onClick={() => handlePrimaryColorChange(color)}
              className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer ${
                primaryColor === color ? 'border-gray-900 dark:border-gray-100 scale-110' : 'border-gray-300 dark:border-gray-600'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>

        {/* Palette preview */}
        <div className="flex rounded-lg overflow-hidden">
          {Object.entries(primaryPalette).map(([shade, color]) => (
            <div
              key={shade}
              className="flex-1 h-10 relative group"
              style={{ backgroundColor: color }}
              title={`${shade}: ${color}`}
            >
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity mix-blend-difference text-white">
                {shade}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Color Secundario */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Color Secundario</h3>
        <div className="flex items-center gap-4 mb-4">
          <input
            type="color"
            value={secondaryColor}
            onChange={(e) => handleSecondaryColorChange(e.target.value)}
            className="w-12 h-12 rounded-lg cursor-pointer border border-gray-300 dark:border-gray-600"
          />
          <div className="w-36">
            <Input
              value={secondaryHex}
              onChange={(e) => handleSecondaryHexInput(e.target.value)}
              placeholder="#f97316"
              className={!isValidHexColor(secondaryHex) && secondaryHex.length > 0 ? 'error' : ''}
            />
          </div>
          <Button variant="ghost" size="sm" onClick={handleResetSecondary}>
            <RotateCcw size={16} />
            Restablecer
          </Button>
        </div>

        {/* Presets */}
        <div className="flex gap-2 mb-4">
          {SECONDARY_PRESETS.map((color) => (
            <button
              key={color}
              onClick={() => handleSecondaryColorChange(color)}
              className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer ${
                secondaryColor === color ? 'border-gray-900 dark:border-gray-100 scale-110' : 'border-gray-300 dark:border-gray-600'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>

        {/* Palette preview */}
        <div className="flex rounded-lg overflow-hidden">
          {Object.entries(secondaryPalette).map(([shade, color]) => (
            <div
              key={shade}
              className="flex-1 h-10 relative group"
              style={{ backgroundColor: color }}
              title={`${shade}: ${color}`}
            >
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity mix-blend-difference text-white">
                {shade}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Logo */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Logo de la Empresa</h3>
        <div className="flex items-center gap-6">
          {/* Preview */}
          <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-700 overflow-hidden">
            {settings?.logoPath ? (
              <img
                src={settings.logoPath}
                alt="Logo de la empresa"
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-xs text-gray-400 text-center px-2">Sin logo</span>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} />
                Subir Logo
              </Button>
              {settings?.logoPath && (
                <Button variant="danger" size="sm" onClick={handleRemoveLogo}>
                  <Trash2 size={16} />
                  Eliminar
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-500">
              PNG, JPG, SVG o WEBP. Max 2MB. Este logo se mostrará en el sidebar para todos los usuarios.
            </p>
          </div>
        </div>
      </Card>

      {/* Info Box */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Nota:</strong> Los usuarios pueden alternar entre modo claro y oscuro usando el botón en el encabezado. Los colores y el logo que configures aquí se aplicarán en ambos modos.
        </p>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          loading={saving || isLoading}
          disabled={saving || isLoading}
        >
          Guardar Cambios
        </Button>
      </div>
    </div>
  );
}
