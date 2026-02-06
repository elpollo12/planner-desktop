import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { Sun, Moon, Upload, Trash2, RotateCcw } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { generatePalette, isValidHexColor } from '@/lib/colorUtils';
import { DEFAULT_PREFERENCES } from '@/types/preferences';
import type { ThemeMode } from '@/types/preferences';
import { applyThemeToDOM } from '@/hooks/useThemeApplicator';

const PRIMARY_PRESETS = [
  '#1e3a5f', '#1e40af', '#0f766e', '#4338ca', '#9333ea', '#be123c', '#c2410c', '#15803d',
];

const SECONDARY_PRESETS = [
  '#f97316', '#eab308', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b',
];

export default function AppearanceSettings() {
  const { sessionToken } = useAuthStore();
  const { preferences, logoDataUrl, savePreferences, uploadLogo, removeLogo, isLoading } = usePreferencesStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitializedRef = useRef(false);
  const userHasInteractedRef = useRef(false);

  // Initialize state from preferences (if available) or defaults
  const initialPrimary = preferences?.primaryColor ?? DEFAULT_PREFERENCES.primaryColor;
  const initialSecondary = preferences?.secondaryColor ?? DEFAULT_PREFERENCES.secondaryColor;
  const initialTheme = preferences?.themeMode ?? DEFAULT_PREFERENCES.themeMode;

  const [primaryColor, setPrimaryColor] = useState(initialPrimary);
  const [secondaryColor, setSecondaryColor] = useState(initialSecondary);
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialTheme);
  const [primaryHex, setPrimaryHex] = useState(initialPrimary);
  const [secondaryHex, setSecondaryHex] = useState(initialSecondary);
  const [saving, setSaving] = useState(false);

  // Sync state when preferences load/change (but only if not initialized yet)
  useEffect(() => {
    if (preferences && !isInitializedRef.current) {
      setPrimaryColor(preferences.primaryColor);
      setSecondaryColor(preferences.secondaryColor);
      setThemeMode(preferences.themeMode);
      setPrimaryHex(preferences.primaryColor);
      setSecondaryHex(preferences.secondaryColor);
      isInitializedRef.current = true;
    }
  }, [preferences]);

  // Live preview: ONLY apply theme when user makes changes (not on mount)
  // The global theme is already applied by useThemeApplicator in App.tsx
  useEffect(() => {
    if (userHasInteractedRef.current) {
      applyThemeToDOM({ primaryColor, secondaryColor, themeMode });
    }
  }, [primaryColor, secondaryColor, themeMode]);

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
      await savePreferences(sessionToken, {
        primaryColor,
        secondaryColor,
        themeMode,
      });
      toast.success('Apariencia guardada exitosamente');
    } catch {
      toast.error('Error al guardar la apariencia');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionToken) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('El archivo excede el limite de 2MB');
      return;
    }

    try {
      await uploadLogo(sessionToken, file);
      toast.success('Logo subido exitosamente');
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
    } catch {
      toast.error('Error al eliminar el logo');
    }
  };

  const handleResetPrimary = () => {
    userHasInteractedRef.current = true;
    handlePrimaryColorChange(DEFAULT_PREFERENCES.primaryColor);
  };
  const handleResetSecondary = () => {
    userHasInteractedRef.current = true;
    handleSecondaryColorChange(DEFAULT_PREFERENCES.secondaryColor);
  };

  const primaryPalette = generatePalette(primaryColor);
  const secondaryPalette = generatePalette(secondaryColor);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Apariencia</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Personaliza los colores, logo y modo de tema de la aplicación
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Logo</h3>
        <div className="flex items-center gap-6">
          {/* Preview */}
          <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-700 overflow-hidden">
            {logoDataUrl ? (
              <img
                src={logoDataUrl}
                alt="Logo"
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
              {preferences?.logoPath && (
                <Button variant="danger" size="sm" onClick={handleRemoveLogo}>
                  <Trash2 size={16} />
                  Eliminar
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-500">
              PNG, JPG, SVG o WEBP. Max 2MB.
            </p>
          </div>
        </div>
      </Card>

      {/* Theme Mode */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Modo de Tema</h3>
        <div className="flex gap-3">
          <button
            onClick={() => {
              userHasInteractedRef.current = true;
              setThemeMode('light');
            }}
            className={`flex items-center gap-2 px-5 py-3 rounded-lg border-2 transition-all cursor-pointer ${
              themeMode === 'light'
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
          >
            <Sun size={20} />
            <span className="font-medium">Claro</span>
          </button>
          <button
            onClick={() => {
              userHasInteractedRef.current = true;
              setThemeMode('dark');
            }}
            className={`flex items-center gap-2 px-5 py-3 rounded-lg border-2 transition-all cursor-pointer ${
              themeMode === 'dark'
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
          >
            <Moon size={20} />
            <span className="font-medium">Oscuro</span>
          </button>
        </div>
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
